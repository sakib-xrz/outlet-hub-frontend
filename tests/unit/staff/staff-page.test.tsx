import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { StaffDetailsPage } from '@/pages/staff/staff-details-page';
import { StaffPage } from '@/pages/staff/staff-page';
import { errorBody, respond } from '../../helpers/http';
import { mockApi, ok, pageBody, renderRoutes, signInAs } from '../../helpers/outlets';
import { outletOptions, staffPageBody, staffSummary } from '../../helpers/staff';

const routes = [
  { path: '/staff', Component: StaffPage },
  { path: '/staff/:staffId', Component: StaffDetailsPage },
];

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  signInAs('HQ_ADMIN');
});

describe('Staff page', () => {
  it('lists staff with outlet counts and paginates on the server', async () => {
    const requests = mockApi((config) =>
      config.url === '/outlets'
        ? outletOptions(config)
        : ok(config, staffPageBody([staffSummary()], 45, (config.params as { page: number }).page)),
    );
    renderRoutes(routes, '/staff');

    const row = (await screen.findByText('staff@example.com')).closest('tr') as HTMLElement;
    expect(within(row).getByText('2')).toBeInTheDocument();
    expect(within(row).getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText(/password/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() =>
      expect(requests.filter((r) => r.url === '/staff').at(-1)?.params).toMatchObject({ page: 2 }),
    );
  });

  it('shows empty and error states', async () => {
    mockApi((config) =>
      config.url === '/outlets' ? ok(config, pageBody([])) : ok(config, staffPageBody([])),
    );
    const empty = renderRoutes(routes, '/staff');
    expect(await screen.findByText('No staff accounts yet')).toBeInTheDocument();
    empty.unmount();

    let fail = true;
    mockApi((config) =>
      config.url === '/outlets'
        ? ok(config, pageBody([]))
        : fail
          ? respond(config, 500, errorBody('INTERNAL_ERROR'))
          : ok(config, staffPageBody([staffSummary()])),
    );
    renderRoutes(routes, '/staff');
    expect(await screen.findByText('Staff could not be loaded')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('staff@example.com')).toBeInTheDocument();
  });

  it('debounces email search, filters by outlet, and keeps state in the URL', async () => {
    const requests = mockApi((config) =>
      config.url === '/outlets'
        ? outletOptions(config)
        : ok(config, staffPageBody([staffSummary()])),
    );
    const { router } = renderRoutes(routes, '/staff?page=2');
    await screen.findByText('staff@example.com');

    await userEvent.type(screen.getByRole('searchbox', { name: /search staff/i }), 'sta');
    await waitFor(() =>
      expect(requests.filter((r) => r.url === '/staff').at(-1)?.params).toMatchObject({
        search: 'sta',
        page: 1,
      }),
    );

    await userEvent.click(screen.getByRole('combobox', { name: 'Filter by outlet' }));
    await userEvent.click(await screen.findByRole('option', { name: /CCC-01/ }));
    await waitFor(() =>
      expect(requests.filter((r) => r.url === '/staff').at(-1)?.params).toMatchObject({
        outletId: '33333333-3333-4333-8333-333333333333',
      }),
    );
    expect(router.state.location.search).toBe(
      '?search=sta&outletId=33333333-3333-4333-8333-333333333333',
    );
  });
});
