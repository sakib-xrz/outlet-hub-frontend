import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/router';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { MenuItemDetailsPage } from '@/pages/menu-items/menu-item-details-page';
import { MenuItemsPage } from '@/pages/menu-items/menu-items-page';
import { deferred, errorBody, respond } from '../../helpers/http';
import { ITEM_ID, menuItem, menuItemBody, menuPageBody } from '../../helpers/menu-items';
import { mockApi, ok, renderRoutes, signInAs } from '../../helpers/outlets';

const pageRoutes = [
  { path: '/menu-items', Component: MenuItemsPage },
  { path: '/menu-items/:menuItemId', Component: MenuItemDetailsPage },
];

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  signInAs('HQ_ADMIN');
});

describe('Master menu list', () => {
  it('shows items with exact formatted prices and paginates on the server', async () => {
    const requests = mockApi((config) =>
      ok(config, menuPageBody([menuItem()], 45, (config.params as { page: number }).page)),
    );
    renderRoutes(pageRoutes, '/menu-items');

    const row = (await screen.findByText('Cappuccino')).closest('tr') as HTMLElement;
    expect(within(row).getByText('COFFEE-001')).toBeInTheDocument();
    expect(within(row).getByText('৳1,250.50')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(requests.at(-1)?.params).toMatchObject({ page: 2 }));
  });

  it('shows the loading skeleton, then the empty state', async () => {
    const response = deferred<undefined>();
    mockApi(async (config) => {
      await response.promise;
      return ok(config, menuPageBody([]));
    });
    renderRoutes(pageRoutes, '/menu-items');
    expect(screen.getByRole('status', { name: 'Loading menu items' })).toBeInTheDocument();
    response.resolve(undefined);
    expect(await screen.findByText('No menu items yet')).toBeInTheDocument();
  });

  it('recovers from errors with retry', async () => {
    let fail = true;
    mockApi((config) =>
      fail
        ? respond(config, 500, errorBody('INTERNAL_ERROR'))
        : ok(config, menuPageBody([menuItem()])),
    );
    renderRoutes(pageRoutes, '/menu-items');
    expect(await screen.findByText('Menu items could not be loaded')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Cappuccino')).toBeInTheDocument();
  });

  it('debounces search, sorts by price, and resets to page 1', async () => {
    const requests = mockApi((config) => ok(config, menuPageBody([menuItem()])));
    const { router } = renderRoutes(pageRoutes, '/menu-items?page=3');
    await screen.findByText('Cappuccino');

    await userEvent.type(screen.getByRole('searchbox', { name: /search menu items/i }), 'cof');
    await waitFor(() => expect(requests.at(-1)?.params).toMatchObject({ search: 'cof', page: 1 }));

    await userEvent.click(screen.getByRole('combobox', { name: 'Sort menu items' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Price: high to low' }));
    await waitFor(() =>
      expect(requests.at(-1)?.params).toMatchObject({
        sortBy: 'basePrice',
        sortOrder: 'desc',
        page: 1,
      }),
    );
    expect(router.state.location.search).toBe('?search=cof&sort=price-desc');
  });
});

describe('Menu item forms', () => {
  async function openCreate(): Promise<HTMLElement> {
    await screen.findByText('Cappuccino');
    await userEvent.click(screen.getByRole('button', { name: 'Create menu item' }));
    return screen.findByRole('dialog');
  }

  it('validates SKU, name and decimal price without calling the API', async () => {
    const requests = mockApi((config) => ok(config, menuPageBody([menuItem()])));
    renderRoutes(pageRoutes, '/menu-items');
    const dialog = await openCreate();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Create menu item' }));
    expect(await within(dialog).findByText('Enter a SKU.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter the item name.')).toBeInTheDocument();
    expect(within(dialog).getByText('Enter a price.')).toBeInTheDocument();

    const price = within(dialog).getByLabelText('Base price');
    expect(price).toHaveAttribute('inputmode', 'decimal');
    for (const bad of ['12.345', '-5', '1e3']) {
      await userEvent.clear(price);
      await userEvent.type(price, bad);
      await userEvent.click(within(dialog).getByRole('button', { name: 'Create menu item' }));
      expect(await within(dialog).findByText(/with at most 2 decimals/)).toBeInTheDocument();
    }
    expect(requests.some((request) => request.method === 'POST')).toBe(false);
  });

  it('creates an item with a normalized decimal string and refreshes the list', async () => {
    let created = false;
    const requests = mockApi((config) => {
      if (config.method === 'post') {
        created = true;
        return respond(
          config,
          201,
          menuItemBody(
            menuItem({
              id: '0b7e3c1a-2d4f-4a6b-8c9d-1e2f3a4b5c6d',
              sku: 'TEA-01',
              name: 'Masala Tea',
              basePrice: '0.10',
            }),
          ),
        );
      }
      return ok(
        config,
        menuPageBody(
          created
            ? [
                menuItem(),
                menuItem({
                  id: '0b7e3c1a-2d4f-4a6b-8c9d-1e2f3a4b5c6d',
                  sku: 'TEA-01',
                  name: 'Masala Tea',
                  basePrice: '0.10',
                }),
              ]
            : [menuItem()],
        ),
      );
    });
    renderRoutes(pageRoutes, '/menu-items');
    const dialog = await openCreate();

    await userEvent.type(within(dialog).getByLabelText('SKU'), 'tea-01');
    expect(within(dialog).getByLabelText('SKU')).toHaveValue('TEA-01');
    await userEvent.type(within(dialog).getByLabelText('Item name'), 'Masala Tea');
    await userEvent.type(within(dialog).getByLabelText('Base price'), '0.1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create menu item' }));

    expect(await screen.findByText('Menu item TEA-01 created.')).toBeInTheDocument();
    expect(requests.find((request) => request.method === 'POST')?.data).toEqual({
      sku: 'TEA-01',
      name: 'Masala Tea',
      description: null,
      basePrice: '0.10',
    });
    expect(await screen.findByText('৳0.10')).toBeInTheDocument();
  });

  it('shows duplicate SKUs on the SKU field and keeps the values', async () => {
    mockApi((config) =>
      config.method === 'post'
        ? respond(
            config,
            409,
            errorBody('CONFLICT', [{ field: 'body.sku', message: 'This SKU is already in use' }]),
          )
        : ok(config, menuPageBody([menuItem()])),
    );
    renderRoutes(pageRoutes, '/menu-items');
    const dialog = await openCreate();

    await userEvent.type(within(dialog).getByLabelText('SKU'), 'COFFEE-001');
    await userEvent.type(within(dialog).getByLabelText('Item name'), 'Copy');
    await userEvent.type(within(dialog).getByLabelText('Base price'), '99.99');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create menu item' }));

    expect(await within(dialog).findByText('This SKU is already in use')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('SKU')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByLabelText('Base price')).toHaveValue('99.99');
  });

  it('edits without sending the read-only SKU and keeps the price as a string', async () => {
    const requests = mockApi((config) =>
      config.method === 'patch'
        ? ok(
            config,
            menuItemBody(
              menuItem({ name: 'Premium Cappuccino', basePrice: '200.00', description: null }),
            ),
          )
        : ok(config, menuItemBody(menuItem())),
    );
    renderRoutes(pageRoutes, `/menu-items/${ITEM_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByLabelText('SKU')).toHaveAttribute('readonly');
    expect(within(dialog).getByLabelText('Base price')).toHaveValue('1250.50');
    await userEvent.clear(within(dialog).getByLabelText('Item name'));
    await userEvent.type(within(dialog).getByLabelText('Item name'), 'Premium Cappuccino');
    await userEvent.clear(within(dialog).getByLabelText('Base price'));
    await userEvent.type(within(dialog).getByLabelText('Base price'), '200');
    await userEvent.clear(within(dialog).getByLabelText(/description/i));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Menu item saved.')).toBeInTheDocument();
    expect(requests.find((request) => request.method === 'PATCH')?.data).toEqual({
      name: 'Premium Cappuccino',
      description: null,
      basePrice: '200.00',
    });
    expect(await screen.findByText('৳200.00')).toBeInTheDocument();
  });
});

describe('Menu item details and status', () => {
  it('shows details and a not-found state', async () => {
    mockApi((config) => ok(config, menuItemBody(menuItem())));
    const view = renderRoutes(pageRoutes, `/menu-items/${ITEM_ID}`);
    expect(await screen.findByRole('heading', { name: 'Cappuccino' })).toBeInTheDocument();
    expect(screen.getByText('৳1,250.50')).toBeInTheDocument();
    expect(screen.getByText('Espresso with steamed milk')).toBeInTheDocument();
    view.unmount();

    mockApi((config) => respond(config, 404, errorBody('NOT_FOUND')));
    renderRoutes(pageRoutes, `/menu-items/${ITEM_ID}`);
    expect(await screen.findByText('Menu item not found')).toBeInTheDocument();
  });

  it('confirms deactivation once and explains what is preserved', async () => {
    const response = deferred<undefined>();
    const requests = mockApi(async (config) => {
      if (config.method === 'patch') {
        await response.promise;
        return ok(config, menuItemBody(menuItem({ isActive: false })));
      }
      return ok(config, menuItemBody(menuItem()));
    });
    renderRoutes(pageRoutes, `/menu-items/${ITEM_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/cannot be sold anywhere/)).toBeInTheDocument();
    expect(
      within(dialog).getByText(/stock quantities and outlet price overrides are kept/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Past sales and receipts are not changed/)).toBeInTheDocument();

    const confirm = within(dialog).getByRole('button', { name: 'Deactivate item' });
    await userEvent.click(confirm);
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    response.resolve(undefined);

    expect(await screen.findByText('COFFEE-001 is now inactive.')).toBeInTheDocument();
    expect(requests.filter((request) => request.method === 'PATCH')).toEqual([
      expect.objectContaining({ url: `/menu-items/${ITEM_ID}/status`, data: { isActive: false } }),
    ]);
    expect(await screen.findByRole('button', { name: 'Activate' })).toBeInTheDocument();
  });
});

describe('Master menu access', () => {
  const me = (role: string) => ({
    success: true,
    message: 'ok',
    data: { user: { id: '1d6eaebf-c25a-4018-ac74-16d4df395294', email: 'user@example.com', role } },
  });

  it('hides navigation from outlet staff and blocks direct URLs', async () => {
    useAuthStore.setState(useAuthStore.getInitialState(), true);
    signInAs('OUTLET_STAFF');
    const requests = mockApi((config) => ok(config, me('OUTLET_STAFF')));
    const view = renderRoutes(routes, '/dashboard');
    await screen.findByRole('link', { name: 'Outlets' });
    expect(screen.queryByRole('link', { name: 'Master Menu' })).not.toBeInTheDocument();
    view.unmount();

    renderRoutes(routes, `/menu-items/${ITEM_ID}`);
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
    expect(requests.some((request) => request.url.startsWith('/menu-items'))).toBe(false);
  });

  it('shows navigation to HQ administrators', async () => {
    mockApi((config) => ok(config, me('HQ_ADMIN')));
    renderRoutes(routes, '/dashboard');
    expect(await screen.findByRole('link', { name: 'Master Menu' })).toHaveAttribute(
      'href',
      '/menu-items',
    );
  });
});
