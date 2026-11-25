import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { syncCompletedSale } from '@/features/sales/hooks/use-sales';
import { DashboardPage } from '@/pages/dashboard/dashboard-page';
import { errorBody, respond } from '../../helpers/http';
import { mockApi, ok, outlet, pageBody, renderRoutes, signInAs } from '../../helpers/outlets';
import { sale } from '../../helpers/sales';

const A = '6f0c2b1e-9a43-4c2f-8f7e-0b8f1d2a3c4d';
const B = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const C = '8b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e';
const ITEM = '11111111-1111-4111-8111-111111111111';
const routes = [{ path: '/dashboard', Component: DashboardPage }];

const summary = {
  totalRevenue: '12345678901234567.50',
  totalSales: '9007199254740993',
  totalUnitsSold: '1248',
  totalOutlets: 5,
  activeOutlets: 4,
};
const revenueRows = [
  {
    outletId: A,
    outletCode: 'MIRPUR-01',
    outletName: 'Mirpur',
    isActive: true,
    totalRevenue: '800.00',
    totalSales: '3',
  },
  {
    outletId: B,
    outletCode: 'BANANI-01',
    outletName: 'Banani',
    isActive: false,
    totalRevenue: '200.00',
    totalSales: '1',
  },
  {
    outletId: C,
    outletCode: 'UTTARA-01',
    outletName: 'Uttara',
    isActive: true,
    totalRevenue: '0.00',
    totalSales: '0',
  },
];
const envelope = (data: unknown) => ({ success: true, message: 'ok', data });

function topFor(id: string) {
  const row = revenueRows.find((item) => item.outletId === id) ?? revenueRows[0];
  return envelope({
    outlet: { id, code: row?.outletCode, name: row?.outletName, isActive: row?.isActive },
    items:
      id === C
        ? []
        : [
            {
              rank: 1,
              menuItemId: ITEM,
              sku: 'BURGER-001',
              name: 'Classic Burger',
              quantitySold: '7',
              totalRevenue: '1750.00',
            },
          ],
  });
}

function reportsApi(
  overrides: { summary?: (config: InternalAxiosRequestConfig) => Promise<unknown> } = {},
) {
  return mockApi((config) => {
    const url = config.url ?? '';
    if (url === '/reports/summary')
      return overrides.summary?.(config) ?? ok(config, envelope(summary));
    if (url === '/reports/revenue-by-outlet') {
      return ok(
        config,
        envelope({
          items: revenueRows,
          pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
        }),
      );
    }
    const top = /^\/reports\/outlets\/([^/]+)\/top-selling-items$/.exec(url);
    if (top?.[1]) return ok(config, topFor(top[1]));
    if (url === '/outlets') {
      return ok(
        config,
        pageBody([
          outlet({ id: A }),
          outlet({ id: B, code: 'BANANI-01', name: 'Banani', isActive: false }),
        ]),
      );
    }
    return respond(config, 404, errorBody('NOT_FOUND'));
  });
}

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
});

describe('HQ dashboard', () => {
  beforeEach(() => signInAs('HQ_ADMIN'));

  it('shows exact KPI strings and defaults to the last 30 local days', async () => {
    const requests = reportsApi();
    renderRoutes(routes, '/dashboard');

    expect(
      await screen.findByLabelText('Total revenue: ৳12,345,678,901,234,567.50'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Sales: 9,007,199,254,740,993')).toBeInTheDocument();
    expect(screen.getByLabelText('Units sold: 1,248')).toBeInTheDocument();
    expect(screen.getByLabelText('Active outlets: 4 of 5')).toBeInTheDocument();
    expect(screen.getByText('Current status, not for the period')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const params = requests.find((r) => r.url === '/reports/summary')?.params as {
      from: string;
      to: string;
    };
    const from = new Date(params.from);
    const to = new Date(params.to);
    expect([from.getHours(), from.getMinutes(), to.getHours(), to.getMinutes()]).toEqual([
      0, 0, 0, 0,
    ]);
    expect(Math.round((to.getTime() - from.getTime()) / 86_400_000)).toBe(30);
  });

  it('lists every outlet with status, a page-subset chart and top items for the leader', async () => {
    reportsApi();
    renderRoutes(routes, '/dashboard');

    const table = await screen.findByRole('table', { name: '' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/Mirpur.*Active.*3.*৳800\.00/),
      expect.stringMatching(/Banani.*Inactive.*1.*৳200\.00/),
      expect.stringMatching(/Uttara.*Active.*0.*৳0\.00/),
    ]);
    expect(screen.getByText('Revenue for the 3 outlets on this page')).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Top items for Mirpur' })).toHaveTextContent(
      /Classic Burger.*BURGER-001.*7.*৳1,750\.00/,
    );
  });

  it('switches the top-items outlet, including inactive outlets, and keeps it in the URL', async () => {
    reportsApi();
    const { router } = renderRoutes(routes, '/dashboard');
    await userEvent.click(await screen.findByRole('button', { name: 'Show top items for Banani' }));
    expect(await screen.findByRole('table', { name: 'Top items for Banani' })).toBeInTheDocument();
    expect(router.state.location.search).toContain(`outlet=${B}`);

    await userEvent.click(screen.getByRole('button', { name: 'Show top items for Uttara' }));
    expect(
      await screen.findByText('No items were sold at this outlet in the selected period.'),
    ).toBeInTheDocument();
  });

  it('applies presets and custom ranges through the URL', async () => {
    const requests = reportsApi();
    const { router } = renderRoutes(routes, '/dashboard');
    await screen.findByLabelText(/Total revenue:/);

    await userEvent.click(screen.getByRole('button', { name: 'All time' }));
    await waitFor(() => expect(router.state.location.search).toBe('?period=all'));
    await waitFor(() =>
      expect(requests.filter((r) => r.url === '/reports/summary').at(-1)?.params).toEqual({}),
    );
    expect(screen.getByText('All recorded sales')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Custom range' }));
    const from = screen.getByLabelText('From');
    const to = screen.getByLabelText('To (inclusive)');
    await userEvent.clear(from);
    await userEvent.type(from, '2026-03-10');
    await userEvent.clear(to);
    await userEvent.type(to, '2026-03-01');
    await userEvent.click(screen.getByRole('button', { name: 'Apply range' }));
    expect(screen.getByRole('alert')).toHaveTextContent('on or after the start date');

    await userEvent.clear(to);
    await userEvent.type(to, '2026-03-31');
    await userEvent.click(screen.getByRole('button', { name: 'Apply range' }));
    await waitFor(() =>
      expect(router.state.location.search).toBe('?period=custom&from=2026-03-10&to=2026-03-31'),
    );
    await waitFor(() =>
      expect(requests.filter((r) => r.url === '/reports/summary').at(-1)?.params).toEqual({
        from: new Date(2026, 2, 10).toISOString(),
        to: new Date(2026, 3, 1).toISOString(),
      }),
    );
  });

  it('refreshes every report on demand without polling', async () => {
    const requests = reportsApi();
    renderRoutes(routes, '/dashboard');
    await screen.findByLabelText(/Total revenue:/);
    const before = requests.filter((r) => r.url === '/reports/summary').length;
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() =>
      expect(requests.filter((r) => r.url === '/reports/summary').length).toBe(before + 1),
    );
  });

  it('shows a retryable error when the summary fails', async () => {
    let fail = true;
    reportsApi({
      summary: (config) =>
        fail ? respond(config, 500, errorBody('INTERNAL_ERROR')) : ok(config, envelope(summary)),
    });
    renderRoutes(routes, '/dashboard');
    expect(await screen.findByText('Summary unavailable')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByLabelText(/Total revenue:/)).toBeInTheDocument();
  });

  it('invalidates report caches when a sale completes', async () => {
    const requests = reportsApi();
    const { queryClient } = renderRoutes(routes, '/dashboard');
    await screen.findByLabelText(/Total revenue:/);
    const count = (): number => requests.filter((r) => r.url.startsWith('/reports')).length;
    await waitFor(() => expect(count()).toBe(3));
    await syncCompletedSale(queryClient, sale());
    expect(count()).toBe(6);
  });
});

describe('staff dashboard', () => {
  beforeEach(() => signInAs('OUTLET_STAFF'));

  it('shows only operational links for accessible outlets and never loads company reports', async () => {
    const requests = reportsApi();
    renderRoutes(routes, '/dashboard');
    const card = (await screen.findByText('Mirpur Outlet')).closest('[data-slot="card"]');
    expect(card).not.toBeNull();
    const links = within(card as HTMLElement).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      `/outlets/${A}/pos`,
      `/outlets/${A}/sales`,
      `/outlets/${A}/menu`,
      `/outlets/${A}/inventory`,
    ]);
    expect(screen.queryByText(/Total revenue/)).not.toBeInTheDocument();
    expect(requests.some((r) => r.url.startsWith('/reports'))).toBe(false);
  });
});
