import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { cartKey, useCartStore } from '@/features/sales/stores/cart.store';
import { OutletPosPage } from '@/pages/outlets/outlet-pos-page';
import { errorBody, respond } from '../../helpers/http';
import { mockApi, renderRoutes, signInAs } from '../../helpers/outlets';
import {
  BURGER,
  OUTLET,
  SALES_PATH,
  STAFF_ID,
  routeSales,
  sale,
  saleResult,
} from '../../helpers/sales';

const POS_URL = `/outlets/${OUTLET.id}/pos`;
const PENDING_KEY = `outlethub:pending-sale:${STAFF_ID}:${OUTLET.id}`;
const pageRoutes = [{ path: '/outlets/:outletId/pos', Component: OutletPosPage }];
const LINE = {
  menuItemId: BURGER,
  sku: 'BURGER-001',
  name: 'Classic Burger',
  quantity: 3,
  unitPrice: '250.00',
};
const PENDING = {
  requestId: '550e8400-e29b-41d4-a716-446655440000',
  createdAt: '2026-11-26T10:00:00.000Z',
  lines: [LINE],
};

type Recorded = { method: string; url: string; data: unknown };
const posts = (requests: Recorded[]): { requestId: string }[] =>
  requests
    .filter((r) => r.method === 'POST' && r.url === SALES_PATH)
    .map((r) => r.data as { requestId: string });

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  useCartStore.setState({ carts: {} });
  sessionStorage.clear();
  signInAs('OUTLET_STAFF');
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function checkout(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Checkout' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Confirm sale' }));
}

function storePending(): void {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(PENDING));
}

describe('pending checkout storage failure', () => {
  it('does not send the sale, keeps the cart and allows a retry', async () => {
    const requests = mockApi(routeSales());
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    renderRoutes(pageRoutes, POS_URL);
    await userEvent.click(await screen.findByRole('button', { name: /Add Classic Burger,/ }));
    await checkout();

    expect(await screen.findByText(/could not save the checkout safely/)).toBeInTheDocument();
    expect(posts(requests)).toHaveLength(0);
    expect(screen.queryByText('Unconfirmed sale')).not.toBeInTheDocument();
    expect(useCartStore.getState().carts[cartKey(STAFF_ID, OUTLET.id)]).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeEnabled();

    setItem.mockRestore();
    await checkout();
    await screen.findByRole('article');
    expect(posts(requests)).toHaveLength(1);
  });
});

describe('unresolved checkout retries', () => {
  it.each([
    [403, 'FORBIDDEN', /Access to this outlet was refused/],
    [429, 'RATE_LIMITED', /Too many requests right now/],
    [409, 'OUTLET_INACTIVE', /This outlet is inactive, so the sale was not completed/],
    [409, 'CONCURRENT_UPDATE', /could not confirm whether this sale was completed/],
    [500, 'INTERNAL_ERROR', /could not confirm whether this sale was completed/],
  ])('keeps the pending checkout after a %i %s', async (status, code, message) => {
    storePending();
    const requests = mockApi(
      routeSales({ create: (config) => respond(config, status, errorBody(code)) }),
    );
    renderRoutes(pageRoutes, POS_URL);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry same sale' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(posts(requests)[0]?.requestId).toBe(PENDING.requestId);
    expect(sessionStorage.getItem(PENDING_KEY)).toContain(PENDING.requestId);
    expect(screen.getByRole('button', { name: 'Retry same sale' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Checkout' })).not.toBeInTheDocument();
  });

  it('restores the submitted cart after reload when the retry is definitively rejected', async () => {
    storePending();
    let attempt = 0;
    const requests = mockApi(
      routeSales({
        create: (config) => {
          attempt += 1;
          return attempt === 1
            ? respond(config, 409, {
                ...errorBody('INSUFFICIENT_STOCK'),
                errors: [
                  {
                    field: `items.${BURGER}`,
                    message: 'Only 2 available',
                    meta: { menuItemId: BURGER, requestedQuantity: 3, availableQuantity: 2 },
                  },
                ],
              })
            : respond(config, 201, saleResult(sale()));
        },
      }),
    );
    renderRoutes(pageRoutes, POS_URL);
    await userEvent.click(await screen.findByRole('button', { name: 'Retry same sale' }));

    expect(await screen.findByText(/Only 2 available/)).toBeInTheDocument();
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
    const quantity = screen.getByRole('textbox', { name: 'Quantity of Classic Burger' });
    expect(quantity).toHaveValue('3');
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '2');
    await checkout();
    await screen.findByRole('article');

    const [first, second] = posts(requests);
    expect(first?.requestId).toBe(PENDING.requestId);
    expect(second?.requestId).not.toBe(PENDING.requestId);
  });
});

describe('discarding an unresolved checkout', () => {
  it('warns, clears the pending request and the cart, and sends nothing', async () => {
    storePending();
    useCartStore.setState({
      carts: {
        [cartKey(STAFF_ID, OUTLET.id)]: [{ ...LINE, availableStock: 5 }],
      },
    });
    const requests = mockApi(routeSales());
    renderRoutes(pageRoutes, POS_URL);
    await userEvent.click(await screen.findByRole('button', { name: 'Discard and start over' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/cart will be emptied/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Discard' }));

    expect(await screen.findByText(/unconfirmed sale was discarded/)).toBeInTheDocument();
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
    expect(useCartStore.getState().carts[cartKey(STAFF_ID, OUTLET.id)]).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeDisabled();
    expect(posts(requests)).toHaveLength(0);
  });
});
