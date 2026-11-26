import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '@/app/router';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { inventoryKeys } from '@/features/inventory/hooks/inventory-query-keys';
import { useCartStore } from '@/features/sales/stores/cart.store';
import { OutletDetailsPage } from '@/pages/outlets/outlet-details-page';
import { OutletPosPage } from '@/pages/outlets/outlet-pos-page';
import { SaleDetailsPage } from '@/pages/outlets/sale-details-page';
import { deferred, errorBody, failNetwork, respond } from '../../helpers/http';
import { mockApi, ok, renderRoutes, signInAs } from '../../helpers/outlets';
import { menuBody } from '../../helpers/outlet-menu';
import {
  BURGER,
  MENU_PATH,
  OUTLET,
  SALES_PATH,
  STAFF_ID,
  TEA,
  products,
  routeSales,
  sale,
  saleResult,
} from '../../helpers/sales';

const pageRoutes = [
  { path: '/outlets/:outletId', Component: OutletDetailsPage },
  { path: '/outlets/:outletId/pos', Component: OutletPosPage },
  { path: '/outlets/:outletId/sales/:saleId', Component: SaleDetailsPage },
];
const POS_URL = `/outlets/${OUTLET.id}/pos`;
const PENDING_KEY = `outlethub:pending-sale:${STAFF_ID}:${OUTLET.id}`;

type SalePayload = {
  requestId: string;
  items: { menuItemId: string; quantity: number; expectedUnitPrice: string }[];
};
const posts = (requests: { method: string; url: string; data: unknown }[]): SalePayload[] =>
  requests
    .filter((r) => r.method === 'POST' && r.url === SALES_PATH)
    .map((r) => r.data as SalePayload);

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  useCartStore.setState({ carts: {} });
  sessionStorage.clear();
  signInAs('OUTLET_STAFF');
});

async function addToCart(name: string, times = 1): Promise<void> {
  const button = await screen.findByRole('button', { name: new RegExp(`Add ${name},`) });
  for (let index = 0; index < times; index += 1) await userEvent.click(button);
}

async function checkout(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Checkout' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Confirm sale' }));
}

describe('POS catalog and cart', () => {
  it("loads only this outlet's active menu, all pages, and disables out-of-stock products", async () => {
    const requests = mockApi(routeSales());
    renderRoutes(pageRoutes, POS_URL);

    expect(await screen.findByText('Classic Burger')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Apple Pie,/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(requests.find((r) => r.url === MENU_PATH)?.params).toMatchObject({ status: 'active' });
    expect(requests.some((r) => r.url === '/menu-items')).toBe(false);
  });

  it('filters the catalog client-side by name and SKU without a new request', async () => {
    const requests = mockApi(routeSales());
    renderRoutes(pageRoutes, POS_URL);

    await screen.findByText('Classic Burger');
    const countBefore = requests.filter((r) => r.url === MENU_PATH).length;

    await userEvent.type(screen.getByRole('searchbox', { name: /search products/i }), 'tea');
    expect(await screen.findByText('Masala Tea')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Classic Burger')).not.toBeInTheDocument());

    expect(requests.filter((r) => r.url === MENU_PATH).length).toBe(countBefore);
  });

  it('clears search with the X button and focuses the input', async () => {
    mockApi(routeSales());
    renderRoutes(pageRoutes, POS_URL);
    await screen.findByText('Classic Burger');

    const input = screen.getByRole('searchbox', { name: /search products/i });
    await userEvent.type(input, 'tea');
    await waitFor(() => expect(screen.queryByText('Classic Burger')).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(await screen.findByText('Classic Burger')).toBeInTheDocument();
    expect(document.activeElement).toBe(input);
  });

  it('focuses search with the / shortcut and clears with Esc', async () => {
    mockApi(routeSales());
    renderRoutes(pageRoutes, POS_URL);
    await screen.findByText('Classic Burger');

    const input = screen.getByRole('searchbox', { name: /search products/i });

    await userEvent.keyboard('/');
    expect(document.activeElement).toBe(input);

    await userEvent.type(input, 'tea');
    await waitFor(() => expect(screen.queryByText('Classic Burger')).not.toBeInTheDocument());

    await userEvent.keyboard('{Escape}');
    expect(await screen.findByText('Classic Burger')).toBeInTheDocument();
    expect(document.activeElement).toBe(input);
  });

  it('focuses search with Ctrl+K', async () => {
    mockApi(routeSales());
    renderRoutes(pageRoutes, POS_URL);
    await screen.findByText('Classic Burger');

    const input = screen.getByRole('searchbox', { name: /search products/i });
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(document.activeElement).toBe(input);
  });

  it('stops auto-loading on page fetch failure, shows a retry button, and retries exactly once on click', async () => {
    // First MENU_PATH request returns page 1 (with totalPages = 2). All subsequent requests fail.
    let firstMenuRequest = true;
    const requests = mockApi(
      routeSales({
        other: (config) => {
          if (config.url !== MENU_PATH) return undefined;
          if (firstMenuRequest) {
            firstMenuRequest = false;
            return ok(config, menuBody(products.slice(0, 1), /* total */ 101, /* page */ 1));
          }
          return failNetwork(config);
        },
      }),
    );
    renderRoutes(pageRoutes, POS_URL);

    // Page-1 products visible
    expect(await screen.findByText('Classic Burger')).toBeInTheDocument();

    // Page-2 failure → retry button appears (and products from page 1 stay visible)
    const retryBtn = await screen.findByRole('button', { name: 'Retry loading products' });
    expect(retryBtn).toBeInTheDocument();
    expect(screen.getByText('Classic Burger')).toBeInTheDocument();

    // Exactly one page-2 request was made — no loop
    const menuCount = () => requests.filter((r) => r.url === MENU_PATH).length;
    expect(menuCount()).toBe(2); // 1 for page 1 + 1 for failed page 2

    // Clicking retry fires exactly one more request
    await userEvent.click(retryBtn);
    await waitFor(() => expect(menuCount()).toBe(3));
    expect(screen.getByRole('button', { name: 'Retry loading products' })).toBeInTheDocument();
  });

  it('adds, edits and removes lines with exact totals and stock limits', async () => {
    mockApi(routeSales());
    renderRoutes(pageRoutes, POS_URL);
    await addToCart('Masala Tea', 3);
    expect(screen.getByLabelText('Cart total')).toHaveTextContent('৳0.30');

    await addToCart('Classic Burger', 5);
    expect(screen.getByRole('button', { name: /Add Classic Burger,/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByLabelText('Cart total')).toHaveTextContent('৳1,250.30');

    await userEvent.click(screen.getByRole('button', { name: 'Decrease Classic Burger' }));
    const quantity = screen.getByRole('textbox', { name: 'Quantity of Masala Tea' });
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '10');
    expect(screen.getByLabelText('Line total for Masala Tea')).toHaveTextContent('৳1.00');
    expect(screen.getByLabelText('Cart total')).toHaveTextContent('৳1,001.00');

    await userEvent.click(screen.getByRole('button', { name: 'Remove Classic Burger' }));
    expect(screen.getByLabelText('Cart total')).toHaveTextContent('৳1.00');
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Clear cart' }));
    expect(screen.getByText(/The cart is empty/)).toBeInTheDocument();
  });
});

describe('checkout', () => {
  it('submits a multi-item sale once, shows the receipt and refreshes caches', async () => {
    const response = deferred<undefined>();
    const requests = mockApi(
      routeSales({
        create: async (config) => {
          await response.promise;
          return respond(config, 201, saleResult(sale()));
        },
      }),
    );
    const { queryClient } = renderRoutes(pageRoutes, POS_URL);
    const inventoryFilters = {
      page: 1,
      search: '',
      status: 'all',
      stockStatus: 'all',
      sort: 'name-asc',
    } as const;
    queryClient.setQueryData(inventoryKeys.list(OUTLET.id, inventoryFilters), {
      items: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    await addToCart('Classic Burger', 2);
    await addToCart('Masala Tea', 3);
    await checkout();
    expect(screen.getByRole('button', { name: 'Retry same sale' })).toBeDisabled();
    response.resolve(undefined);

    const receipt = await screen.findByRole('article');
    expect(within(receipt).getByText(`${OUTLET.code}-000101`)).toBeInTheDocument();
    expect(within(receipt).getByLabelText('Receipt total')).toHaveTextContent('৳500.30');
    expect(within(receipt).getByText('user@example.com')).toBeInTheDocument();

    const [payload] = posts(requests);
    expect(posts(requests)).toHaveLength(1);
    expect(payload?.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload?.items).toEqual([
      { menuItemId: BURGER, quantity: 2, expectedUnitPrice: '250.00' },
      { menuItemId: TEA, quantity: 3, expectedUnitPrice: '0.10' },
    ]);
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
    expect(
      queryClient.getQueryState(inventoryKeys.list(OUTLET.id, inventoryFilters))?.isInvalidated,
    ).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Start new sale' }));
    expect(screen.getByText(/The cart is empty/)).toBeInTheDocument();
  });

  it('keeps the same request id and payload across an uncertain failure and a manual retry', async () => {
    let attempt = 0;
    const requests = mockApi(
      routeSales({
        create: (config) => {
          attempt += 1;
          return attempt === 1
            ? failNetwork(config)
            : respond(config, 200, saleResult(sale(), true));
        },
      }),
    );
    renderRoutes(pageRoutes, POS_URL);
    await addToCart('Classic Burger', 2);
    await checkout();

    expect(
      await screen.findByText(/could not confirm whether this sale was completed/),
    ).toBeInTheDocument();
    expect(screen.getByText(/never recorded twice/)).toBeInTheDocument();
    expect(screen.queryByText(/charge/i)).not.toBeInTheDocument();
    expect(posts(requests)).toHaveLength(1);
    const stored = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? '{}') as { requestId: string };
    expect(stored.requestId).toBe(posts(requests)[0]?.requestId);
    expect(screen.queryByRole('button', { name: 'Checkout' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Masala Tea,/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Retry same sale' }));
    expect(
      await screen.findByText(/already recorded. No stock was deducted twice/),
    ).toBeInTheDocument();
    const [first, second] = posts(requests);
    expect(second).toEqual(first);
  });

  it('restores an unresolved checkout after reload without resubmitting it', async () => {
    const pending = {
      requestId: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: '2026-11-26T10:00:00.000Z',
      lines: [
        {
          menuItemId: BURGER,
          sku: 'BURGER-001',
          name: 'Classic Burger',
          quantity: 2,
          unitPrice: '250.00',
        },
      ],
    };
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    let found = false;
    const requests = mockApi(
      routeSales({
        byRequest: (config) =>
          found
            ? ok(config, saleResult(sale(), true))
            : respond(config, 404, errorBody('NOT_FOUND')),
      }),
    );
    renderRoutes(pageRoutes, POS_URL);

    expect(await screen.findByText(/An unfinished checkout was found/)).toBeInTheDocument();
    expect(screen.getByText('2 × Classic Burger')).toBeInTheDocument();
    expect(posts(requests)).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Check sale status' }));
    expect(
      await screen.findByText(/No completed sale was found for this checkout yet/),
    ).toBeInTheDocument();

    found = true;
    await userEvent.click(screen.getByRole('button', { name: 'Check sale status' }));
    expect(await screen.findByRole('article')).toBeInTheDocument();
    expect(requests.find((r) => r.url.includes('/by-request/'))?.url).toBe(
      `${SALES_PATH}/by-request/${pending.requestId}`,
    );
    expect(posts(requests)).toHaveLength(0);
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('requires review and a new request id after a price change', async () => {
    let attempt = 0;
    const requests = mockApi(
      routeSales({
        create: (config) => {
          attempt += 1;
          return attempt === 1
            ? respond(config, 409, {
                success: false,
                message: 'Some prices changed',
                code: 'PRICE_CHANGED',
                requestId: 'r',
                errors: [
                  {
                    field: `items.${BURGER}`,
                    message: 'changed',
                    meta: {
                      menuItemId: BURGER,
                      expectedUnitPrice: '250.00',
                      currentUnitPrice: '260.00',
                    },
                  },
                ],
              })
            : respond(config, 201, saleResult(sale({ totalAmount: '260.00' })));
        },
      }),
    );
    renderRoutes(pageRoutes, POS_URL);
    await addToCart('Classic Burger');
    await checkout();

    expect(await screen.findByText(/Some prices changed/)).toBeInTheDocument();
    expect(screen.getByText('Price changed: ৳250.00 → ৳260.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review highlighted items' })).toBeDisabled();
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Accept new price' }));
    expect(screen.getByLabelText('Cart total')).toHaveTextContent('৳260.00');
    await checkout();
    await screen.findByRole('article');

    const [first, second] = posts(requests);
    expect(second?.items).toEqual([
      { menuItemId: BURGER, quantity: 1, expectedUnitPrice: '260.00' },
    ]);
    expect(second?.requestId).not.toBe(first?.requestId);
  });

  it('shows insufficient stock per item and lets the cashier correct it', async () => {
    let attempt = 0;
    mockApi(
      routeSales({
        create: (config) => {
          attempt += 1;
          return attempt === 1
            ? respond(config, 409, {
                success: false,
                message: 'Not enough stock',
                code: 'INSUFFICIENT_STOCK',
                requestId: 'r',
                errors: [
                  {
                    field: `items.${BURGER}`,
                    message: 'Only 1 available',
                    meta: { menuItemId: BURGER, requestedQuantity: 3, availableQuantity: 1 },
                  },
                ],
              })
            : respond(config, 201, saleResult(sale()));
        },
      }),
    );
    renderRoutes(pageRoutes, POS_URL);
    await addToCart('Classic Burger', 3);
    await checkout();

    expect(await screen.findByText(/Only 1 available/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review highlighted items' })).toBeDisabled();
    const quantity = screen.getByRole('textbox', { name: 'Quantity of Classic Burger' });
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '1');
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeEnabled();
  });

  it('treats a request-id conflict as definitive and clears the pending checkout', async () => {
    mockApi(
      routeSales({
        create: (config) => respond(config, 409, errorBody('IDEMPOTENCY_CONFLICT')),
      }),
    );
    renderRoutes(pageRoutes, POS_URL);
    await addToCart('Masala Tea');
    await checkout();
    expect(
      await screen.findByText(/could not be matched to the original sale/),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeEnabled();
  });
});

describe('POS access and receipts', () => {
  const me = (role: string) => ({
    success: true,
    message: 'ok',
    data: { user: { id: STAFF_ID, email: 'user@example.com', role } },
  });

  it('blocks HQ administrators from the POS route', async () => {
    signInAs('HQ_ADMIN');
    mockApi((config) =>
      config.url === '/auth/me' ? ok(config, me('HQ_ADMIN')) : routeSales()(config),
    );
    renderRoutes(routes, POS_URL);
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
  });

  it('offers Open POS to staff of an active outlet and Sales history to both roles', async () => {
    mockApi(routeSales());
    const view = renderRoutes(pageRoutes, `/outlets/${OUTLET.id}`);
    expect(await screen.findByRole('link', { name: 'Open POS' })).toHaveAttribute('href', POS_URL);
    expect(screen.getByRole('link', { name: 'Sales history' })).toBeInTheDocument();
    view.unmount();

    signInAs('HQ_ADMIN');
    renderRoutes(pageRoutes, `/outlets/${OUTLET.id}`);
    expect(await screen.findByRole('link', { name: 'Sales history' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open POS' })).not.toBeInTheDocument();
  });

  it('renders historical snapshots on the receipt page and prints', async () => {
    const print = vi.fn();
    Object.defineProperty(window, 'print', { value: print, configurable: true });
    mockApi(routeSales());
    renderRoutes(pageRoutes, `/outlets/${OUTLET.id}/sales/${sale().id}`);

    const receipt = await screen.findByRole('article');
    expect(within(receipt).getByText('Classic Burger')).toBeInTheDocument();
    expect(within(receipt).getByText('৳500.00')).toBeInTheDocument();
    expect(within(receipt).getByLabelText('Receipt total')).toHaveTextContent('৳500.30');
    await userEvent.click(screen.getByRole('button', { name: 'Print receipt' }));
    expect(print).toHaveBeenCalledOnce();
  });

  it('receipt has 80mm width class and data-print-receipt attribute', async () => {
    mockApi(routeSales());
    renderRoutes(pageRoutes, `/outlets/${OUTLET.id}/sales/${sale().id}`);

    const receipt = await screen.findByRole('article');
    expect(receipt).toHaveAttribute('data-print-receipt');
    expect(receipt.className).toMatch(/w-\[80mm\]/);
  });
});
