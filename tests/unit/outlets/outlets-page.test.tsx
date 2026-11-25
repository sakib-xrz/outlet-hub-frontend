import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { deferred, errorBody, respond } from '../../helpers/http';
import {
  mockApi,
  ok,
  outlet,
  outletBody,
  pageBody,
  renderOutlets,
  signInAs,
} from '../../helpers/outlets';

beforeEach(() => useAuthStore.setState(useAuthStore.getInitialState(), true));

describe('Outlets page', () => {
  it('lists outlets with pagination details', async () => {
    signInAs('HQ_ADMIN');
    mockApi((config) => ok(config, pageBody([outlet()], 41)));
    renderOutlets('/outlets');

    const row = (await screen.findByText('Mirpur Outlet')).closest('tr');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText('MIRPUR-01')).toBeInTheDocument();
    expect(within(row as HTMLElement).getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–1 of 41')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('shows a loading skeleton, then the empty state', async () => {
    signInAs('HQ_ADMIN');
    const response = deferred<undefined>();
    mockApi(async (config) => {
      await response.promise;
      return ok(config, pageBody([]));
    });
    renderOutlets('/outlets');

    expect(screen.getByRole('status', { name: 'Loading outlets' })).toBeInTheDocument();
    response.resolve(undefined);
    expect(await screen.findByText('No outlets yet')).toBeInTheDocument();
    expect(screen.getByText('Create the first outlet to get started.')).toBeInTheDocument();
  });

  it('shows an error state and recovers on retry', async () => {
    signInAs('HQ_ADMIN');
    let fail = true;
    mockApi((config) =>
      fail ? respond(config, 500, errorBody('INTERNAL_ERROR')) : ok(config, pageBody([outlet()])),
    );
    renderOutlets('/outlets');

    expect(await screen.findByText('Outlets could not be loaded')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Mirpur Outlet')).toBeInTheDocument();
  });

  it('debounces search, resets to the first page, and stores it in the URL', async () => {
    signInAs('HQ_ADMIN');
    const requests = mockApi((config) => ok(config, pageBody([outlet()], 60, 1)));
    const { router } = renderOutlets('/outlets?page=3');
    await screen.findByText('Mirpur Outlet');
    expect(requests.at(-1)?.params).toMatchObject({ page: 3 });

    await userEvent.type(screen.getByRole('searchbox', { name: /search outlets/i }), 'mir');
    await waitFor(() => expect(requests.at(-1)?.params).toMatchObject({ search: 'mir', page: 1 }));
    expect(
      requests.filter((request) => (request.params as { search?: string }).search),
    ).toHaveLength(1);
    expect(router.state.location.search).toBe('?search=mir');
  });

  it('filters by status through the API', async () => {
    signInAs('HQ_ADMIN');
    const requests = mockApi((config) => ok(config, pageBody([outlet({ isActive: false })])));
    renderOutlets('/outlets');
    await screen.findByText('Mirpur Outlet');

    await userEvent.click(screen.getByRole('combobox', { name: 'Filter by status' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Inactive' }));

    await waitFor(() =>
      expect(requests.at(-1)?.params).toMatchObject({ status: 'inactive', page: 1 }),
    );
  });

  it('shows management actions to HQ admins only', async () => {
    mockApi((config) => ok(config, pageBody([outlet()])));

    signInAs('OUTLET_STAFF');
    const staffView = renderOutlets('/outlets');
    await screen.findByText('Mirpur Outlet');
    expect(screen.queryByRole('button', { name: 'Create outlet' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /actions for/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Mirpur Outlet' })).toBeInTheDocument();
    staffView.unmount();

    signInAs('HQ_ADMIN');
    renderOutlets('/outlets');
    await screen.findByText('Mirpur Outlet');
    expect(screen.getByRole('button', { name: 'Create outlet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actions for Mirpur Outlet' })).toBeInTheDocument();
  });

  it('creates an outlet and refreshes the list', async () => {
    signInAs('HQ_ADMIN');
    let items = [outlet()];
    const requests = mockApi((config) => {
      if (config.method === 'post') {
        const created = outlet({
          id: '0b7e3c1a-2d4f-4a6b-8c9d-1e2f3a4b5c6d',
          code: 'GULSHAN-02',
          name: 'Gulshan',
        });
        items = [created, ...items];
        return respond(config, 201, outletBody(created));
      }
      return ok(config, pageBody(items));
    });
    renderOutlets('/outlets');
    await screen.findByText('Mirpur Outlet');

    await userEvent.click(screen.getByRole('button', { name: 'Create outlet' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Outlet code'), ' gulshan-02');
    await userEvent.type(within(dialog).getByLabelText('Outlet name'), 'Gulshan');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create outlet' }));

    expect(await screen.findByText('Outlet GULSHAN-02 created.')).toBeInTheDocument();
    expect(requests.find((request) => request.method === 'POST')?.data).toEqual({
      code: 'GULSHAN-02',
      name: 'Gulshan',
      address: null,
    });
    expect(await screen.findByText('Gulshan')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
