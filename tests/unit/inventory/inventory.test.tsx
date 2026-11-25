import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { inventoryKeys } from '@/features/inventory/hooks/inventory-query-keys';
import { outletMenuKeys } from '@/features/outlet-menu-items/hooks/outlet-menu-query-keys';
import { OutletDetailsPage } from '@/pages/outlets/outlet-details-page';
import { OutletInventoryPage } from '@/pages/outlets/outlet-inventory-page';
import { deferred, errorBody, failNetwork, respond } from '../../helpers/http';
import {
  INVENTORY_PATH,
  ITEM_ID,
  OUTLET,
  adjustBody,
  inventoryBody,
  inventoryItem,
  itemBody,
  routeInventory,
} from '../../helpers/inventory';
import { mockApi, ok, renderRoutes, signInAs } from '../../helpers/outlets';

const pageRoutes = [
  { path: '/outlets/:outletId', Component: OutletDetailsPage },
  { path: '/outlets/:outletId/inventory', Component: OutletInventoryPage },
];
const PAGE_URL = `/outlets/${OUTLET.id}/inventory`;

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  signInAs('HQ_ADMIN');
});

async function openAdjust(): Promise<HTMLElement> {
  await userEvent.click(
    await screen.findByRole('button', { name: 'Adjust stock for Classic Burger' }),
  );
  return screen.findByRole('dialog');
}

describe('Inventory list', () => {
  it('separates stock level from sales availability', async () => {
    mockApi(
      routeInventory({
        list: (config) =>
          ok(
            config,
            inventoryBody([
              inventoryItem({ name: 'Classic Burger' }),
              inventoryItem({
                menuItemId: '22222222-2222-4222-8222-222222222222',
                name: 'Low item',
                stockQuantity: 10,
                stockStatus: 'LOW',
              }),
              inventoryItem({
                menuItemId: '33333333-3333-4333-8333-333333333333',
                name: 'Empty item',
                stockQuantity: 0,
                stockStatus: 'OUT_OF_STOCK',
                isSellable: false,
              }),
              inventoryItem({
                menuItemId: '44444444-4444-4444-8444-444444444444',
                name: 'Retired item',
                stockQuantity: 100,
                menuItemIsActive: false,
                isEnabled: false,
                isSellable: false,
              }),
            ]),
          ),
      }),
    );
    renderRoutes(pageRoutes, PAGE_URL);

    const row = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;
    await screen.findByText('Classic Burger');
    expect(within(row('Classic Burger')).getByText('In stock')).toBeInTheDocument();
    expect(within(row('Classic Burger')).getByText('Enabled')).toBeInTheDocument();
    expect(within(row('Low item')).getByText('Low stock')).toBeInTheDocument();
    expect(within(row('Empty item')).getByText('Out of stock')).toBeInTheDocument();
    expect(within(row('Retired item')).getByText('In stock')).toBeInTheDocument();
    expect(within(row('Retired item')).getByText('Master item inactive')).toBeInTheDocument();
    expect(within(row('Retired item')).getByRole('button', { name: /Adjust stock/ })).toBeEnabled();
  });

  it('disables adjustments for inactive outlets', async () => {
    mockApi(routeInventory({ outletActive: false }));
    renderRoutes(pageRoutes, PAGE_URL);
    expect(
      await screen.findByText('Stock cannot be adjusted while the outlet is inactive.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Adjust stock for Classic Burger' })).toBeDisabled();
  });

  it('gives staff a read-only view', async () => {
    signInAs('OUTLET_STAFF');
    mockApi(routeInventory());
    renderRoutes(pageRoutes, PAGE_URL);
    expect(await screen.findByText('Classic Burger')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Adjust stock/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /assignment status/i })).not.toBeInTheDocument();
  });

  it('shows loading, empty and error states with retry', async () => {
    const response = deferred<undefined>();
    mockApi(
      routeInventory({
        list: async (config) => {
          await response.promise;
          return ok(config, inventoryBody([]));
        },
      }),
    );
    const view = renderRoutes(pageRoutes, PAGE_URL);
    expect(screen.getByRole('status', { name: 'Loading inventory' })).toBeInTheDocument();
    response.resolve(undefined);
    expect(await screen.findByText('No inventory yet')).toBeInTheDocument();
    view.unmount();

    let fail = true;
    mockApi(
      routeInventory({
        list: (config) =>
          fail
            ? respond(config, 500, errorBody('INTERNAL_ERROR'))
            : ok(config, inventoryBody([inventoryItem()])),
      }),
    );
    renderRoutes(pageRoutes, PAGE_URL);
    expect(await screen.findByText('Inventory could not be loaded')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Classic Burger')).toBeInTheDocument();
  });

  it('filters by stock level and search, resetting to page 1, and paginates', async () => {
    const requests = mockApi(
      routeInventory({
        list: (config) =>
          ok(
            config,
            inventoryBody([inventoryItem()], 45, (config.params as { page: number }).page),
          ),
      }),
    );
    const { router } = renderRoutes(pageRoutes, `${PAGE_URL}?page=2`);
    await screen.findByText('Classic Burger');
    const listRequests = () => requests.filter((request) => request.url === INVENTORY_PATH);

    await userEvent.click(screen.getByRole('combobox', { name: 'Filter by stock level' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Low stock (1–10)' }));
    await waitFor(() =>
      expect(listRequests().at(-1)?.params).toMatchObject({ stockStatus: 'low', page: 1 }),
    );

    await userEvent.type(screen.getByRole('searchbox', { name: /search inventory/i }), 'burg');
    await waitFor(() =>
      expect(listRequests().at(-1)?.params).toMatchObject({ search: 'burg', page: 1 }),
    );
    expect(router.state.location.search).toBe('?search=burg&stockStatus=low');

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(listRequests().at(-1)?.params).toMatchObject({ page: 2 }));
  });

  it('links from outlet details with role-appropriate wording', async () => {
    signInAs('OUTLET_STAFF');
    mockApi(routeInventory());
    const view = renderRoutes(pageRoutes, `/outlets/${OUTLET.id}`);
    expect(await screen.findByRole('link', { name: 'View inventory' })).toHaveAttribute(
      'href',
      PAGE_URL,
    );
    view.unmount();
    signInAs('HQ_ADMIN');
    renderRoutes(pageRoutes, `/outlets/${OUTLET.id}`);
    expect(await screen.findByRole('link', { name: 'Manage inventory' })).toBeInTheDocument();
  });
});

describe('Adjusting stock', () => {
  it('adds stock with a preview and refreshes inventory and outlet-menu caches', async () => {
    const requests = mockApi(
      routeInventory({ adjust: (config) => ok(config, adjustBody(50, 70)) }),
    );
    const { queryClient } = renderRoutes(pageRoutes, PAGE_URL);
    const menuFilters = { page: 1, search: '', status: 'all', sort: 'name-asc' } as const;
    queryClient.setQueryData(outletMenuKeys.list(OUTLET.id, menuFilters), {
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const dialog = await openAdjust();
    expect(within(dialog).getByTestId('baseline-stock')).toHaveTextContent('50');
    await userEvent.type(within(dialog).getByLabelText('Quantity'), '20');
    expect(within(dialog).getByText(/Resulting stock/)).toHaveTextContent('70');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm adjustment' }));

    expect(await screen.findByText('BURGER-001: stock 50 → 70.')).toBeInTheDocument();
    expect(requests.find((request) => request.method === 'PATCH')).toMatchObject({
      url: `${INVENTORY_PATH}/${ITEM_ID}/adjust`,
      data: { operation: 'INCREASE', quantity: 20 },
    });
    expect(
      queryClient.getQueryState(outletMenuKeys.list(OUTLET.id, menuFilters))?.isInvalidated,
    ).toBe(true);
    expect(queryClient.getQueryData(inventoryKeys.detail(OUTLET.id, ITEM_ID))).toMatchObject({
      stockQuantity: 70,
    });
  });

  it('validates whole numbers, insufficient stock and integer overflow before sending', async () => {
    const requests = mockApi(
      routeInventory({
        list: (config) => ok(config, inventoryBody([inventoryItem({ stockQuantity: 2147483640 })])),
      }),
    );
    renderRoutes(pageRoutes, PAGE_URL);
    const dialog = await openAdjust();
    const quantity = within(dialog).getByLabelText('Quantity');
    const confirm = within(dialog).getByRole('button', { name: 'Confirm adjustment' });

    for (const bad of ['-1', '1.5', 'abc']) {
      await userEvent.clear(quantity);
      await userEvent.type(quantity, bad);
      await userEvent.click(confirm);
      expect(
        await within(dialog).findByText('Enter a whole number with no sign or decimals.'),
      ).toBeInTheDocument();
    }
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '10');
    await userEvent.click(confirm);
    expect(
      await within(dialog).findByText('The resulting stock would exceed the maximum.'),
    ).toBeInTheDocument();
    expect(requests.some((request) => request.method === 'PATCH')).toBe(false);
  });

  it('prevents known insufficient reductions and shows the resulting balance', async () => {
    const requests = mockApi(
      routeInventory({
        list: (config) =>
          ok(config, inventoryBody([inventoryItem({ stockQuantity: 5, stockStatus: 'LOW' })])),
        adjust: (config) => ok(config, adjustBody(5, 0, 'DECREASE')),
      }),
    );
    renderRoutes(pageRoutes, PAGE_URL);
    const dialog = await openAdjust();
    await userEvent.click(within(dialog).getByRole('radio', { name: /Reduce stock/ }));
    await userEvent.type(within(dialog).getByLabelText('Quantity'), '7');
    expect(
      await within(dialog).findByText('Only 5 in stock; you cannot remove 7.'),
    ).toBeInTheDocument();

    await userEvent.clear(within(dialog).getByLabelText('Quantity'));
    await userEvent.type(within(dialog).getByLabelText('Quantity'), '5');
    expect(within(dialog).getByText(/Resulting stock/)).toHaveTextContent('0');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm adjustment' }));
    await screen.findByText('BURGER-001: stock 5 → 0.');
    expect(requests.find((r) => r.method === 'PATCH')?.data).toEqual({
      operation: 'DECREASE',
      quantity: 5,
    });
  });

  it('keeps the SET baseline through refetches, then handles a stale-stock conflict', async () => {
    let listStock = 50;
    let adjustCalls = 0;
    const requests = mockApi(
      routeInventory({
        list: (config) => ok(config, inventoryBody([inventoryItem({ stockQuantity: listStock })])),
        item: (config) => ok(config, itemBody(inventoryItem({ stockQuantity: 48 }))),
        adjust: (config) => {
          adjustCalls += 1;
          return adjustCalls === 1
            ? respond(config, 409, {
                success: false,
                message: 'Stock changed since the correction was started; it is now 48',
                code: 'STOCK_CHANGED',
                requestId: 'r',
              })
            : ok(config, adjustBody(48, 40, 'SET'));
        },
      }),
    );
    const { queryClient } = renderRoutes(pageRoutes, PAGE_URL);
    const dialog = await openAdjust();

    listStock = 48;
    await queryClient.refetchQueries({ queryKey: inventoryKeys.lists(OUTLET.id) });
    expect(within(dialog).getByTestId('baseline-stock')).toHaveTextContent('50');

    await userEvent.click(within(dialog).getByRole('radio', { name: /Set stock quantity/ }));
    await userEvent.type(within(dialog).getByLabelText('New stock quantity'), '40');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm adjustment' }));

    expect(await within(dialog).findByText(/current stock is now 48/)).toBeInTheDocument();
    expect(within(dialog).getByTestId('baseline-stock')).toHaveTextContent('48');
    expect(within(dialog).getByLabelText('New stock quantity')).toHaveValue('40');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm adjustment' }));
    await screen.findByText('BURGER-001: stock 48 → 40.');
    expect(requests.filter((r) => r.method === 'PATCH').map((r) => r.data)).toEqual([
      { operation: 'SET', quantity: 40, expectedStockQuantity: 50 },
      { operation: 'SET', quantity: 40, expectedStockQuantity: 48 },
    ]);
  });

  it('never resubmits after an ambiguous network failure and asks for verification', async () => {
    const requests = mockApi(
      routeInventory({
        item: (config) => ok(config, itemBody(inventoryItem({ stockQuantity: 70 }))),
        adjust: failNetwork,
      }),
    );
    renderRoutes(pageRoutes, PAGE_URL);
    const dialog = await openAdjust();
    await userEvent.type(within(dialog).getByLabelText('Quantity'), '20');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm adjustment' }));

    expect(
      await within(dialog).findByText(/could not confirm whether the adjustment was saved/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/latest balance is 70/)).toBeInTheDocument();
    expect(requests.filter((r) => r.method === 'PATCH')).toHaveLength(1);
  });

  it('prevents duplicate submissions', async () => {
    const response = deferred<undefined>();
    const requests = mockApi(
      routeInventory({
        adjust: async (config) => {
          await response.promise;
          return ok(config, adjustBody(50, 51));
        },
      }),
    );
    renderRoutes(pageRoutes, PAGE_URL);
    const dialog = await openAdjust();
    await userEvent.type(within(dialog).getByLabelText('Quantity'), '1');
    const confirm = within(dialog).getByRole('button', { name: 'Confirm adjustment' });
    await userEvent.click(confirm);
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    response.resolve(undefined);
    await screen.findByText('BURGER-001: stock 50 → 51.');
    expect(requests.filter((r) => r.method === 'PATCH')).toHaveLength(1);
  });

  it('shows server conflicts such as an inactive outlet', async () => {
    mockApi(
      routeInventory({
        adjust: (config) =>
          respond(config, 409, {
            success: false,
            message: 'Stock cannot be adjusted while the outlet is inactive',
            code: 'OUTLET_INACTIVE',
            requestId: 'r',
          }),
      }),
    );
    renderRoutes(pageRoutes, PAGE_URL);
    const dialog = await openAdjust();
    await userEvent.type(within(dialog).getByLabelText('Quantity'), '1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm adjustment' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Stock cannot be adjusted while the outlet is inactive.',
    );
  });
});
