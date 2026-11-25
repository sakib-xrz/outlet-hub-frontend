import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { OutletSalesPage } from '@/pages/outlets/outlet-sales-page';
import { errorBody, respond } from '../../helpers/http';
import { mockApi, ok, outletBody, renderRoutes, signInAs } from '../../helpers/outlets';
import { OUTLET, SALES_PATH } from '../../helpers/sales';

const pageRoutes = [{ path: '/outlets/:outletId/sales', Component: OutletSalesPage }];
const URL = `/outlets/${OUTLET.id}/sales`;

const summary = {
  id: '99999999-9999-4999-8999-999999999999',
  receiptNumber: 101,
  receiptCode: `${OUTLET.code}-000101`,
  totalAmount: '500.30',
  lineCount: 2,
  unitCount: 5,
  createdById: '1d6eaebf-c25a-4018-ac74-16d4df395294',
  createdAt: '2026-11-26T10:00:00.000Z',
};
const pageBody = (items: unknown[], total = items.length, page = 1) => ({
  success: true,
  message: 'ok',
  data: { items, pagination: { page, limit: 20, total, totalPages: Math.ceil(total / 20) } },
});

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  signInAs('HQ_ADMIN');
});

describe('Sales history', () => {
  it('lists receipts with item and unit counts and paginates on the server', async () => {
    const requests = mockApi((config) =>
      config.url === `/outlets/${OUTLET.id}`
        ? ok(config, outletBody(OUTLET))
        : ok(config, pageBody([summary], 45, (config.params as { page: number }).page)),
    );
    renderRoutes(pageRoutes, URL);
    expect(await screen.findByText(`${OUTLET.code}-000101`)).toBeInTheDocument();
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
    expect(screen.getByText('৳500.30')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: `View receipt ${OUTLET.code}-000101` }),
    ).toHaveAttribute('href', `${URL}/${summary.id}`);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() =>
      expect(requests.filter((r) => r.url === SALES_PATH).at(-1)?.params).toMatchObject({
        page: 2,
      }),
    );
  });

  it('searches by receipt number and shows empty and error states', async () => {
    const requests = mockApi((config) =>
      config.url === `/outlets/${OUTLET.id}`
        ? ok(config, outletBody(OUTLET))
        : ok(config, pageBody([])),
    );
    const view = renderRoutes(pageRoutes, URL);
    expect(await screen.findByText('No sales yet')).toBeInTheDocument();
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search by receipt number' }),
      '101',
    );
    await waitFor(() =>
      expect(requests.filter((r) => r.url === SALES_PATH).at(-1)?.params).toMatchObject({
        search: '101',
        page: 1,
      }),
    );
    expect(await screen.findByText('No matching receipt')).toBeInTheDocument();
    view.unmount();

    mockApi((config) =>
      config.url === `/outlets/${OUTLET.id}`
        ? ok(config, outletBody(OUTLET))
        : respond(config, 500, errorBody('INTERNAL_ERROR')),
    );
    renderRoutes(pageRoutes, URL);
    expect(await screen.findByText('Sales could not be loaded')).toBeInTheDocument();
  });

  it('shows no POS shortcut to HQ but offers it to staff', async () => {
    mockApi((config) =>
      config.url === `/outlets/${OUTLET.id}`
        ? ok(config, outletBody(OUTLET))
        : ok(config, pageBody([summary])),
    );
    const view = renderRoutes(pageRoutes, URL);
    await screen.findByText(`${OUTLET.code}-000101`);
    expect(screen.queryByRole('link', { name: 'Open POS' })).not.toBeInTheDocument();
    view.unmount();
    signInAs('OUTLET_STAFF');
    renderRoutes(pageRoutes, URL);
    expect(await screen.findByRole('link', { name: 'Open POS' })).toBeInTheDocument();
  });
});
