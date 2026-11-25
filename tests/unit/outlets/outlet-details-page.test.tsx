import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { deferred, errorBody, respond } from '../../helpers/http';
import { mockApi, ok, outlet, outletBody, renderOutlets, signInAs } from '../../helpers/outlets';

const current = outlet();

beforeEach(() => useAuthStore.setState(useAuthStore.getInitialState(), true));

describe('Outlet details page', () => {
  it('shows outlet details without management actions for staff', async () => {
    signInAs('OUTLET_STAFF');
    mockApi((config) => ok(config, outletBody(current)));
    renderOutlets(`/outlets/${current.id}`);

    expect(await screen.findByRole('heading', { name: 'Mirpur Outlet' })).toBeInTheDocument();
    expect(screen.getByText('Mirpur, Dhaka')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
  });

  it('explains forbidden and missing outlets', async () => {
    signInAs('OUTLET_STAFF');
    mockApi((config) => respond(config, 403, errorBody('AUTHORIZATION_ERROR')));
    const forbidden = renderOutlets(`/outlets/${current.id}`);
    expect(await screen.findByText('No access to this outlet')).toBeInTheDocument();
    forbidden.unmount();

    mockApi((config) => respond(config, 404, errorBody('NOT_FOUND')));
    renderOutlets(`/outlets/${current.id}`);
    expect(await screen.findByText('Outlet not found')).toBeInTheDocument();
  });

  it('confirms deactivation, prevents double submission, and updates the page', async () => {
    signInAs('HQ_ADMIN');
    const statusResponse = deferred<undefined>();
    const requests = mockApi(async (config) => {
      if (config.method === 'patch') {
        await statusResponse.promise;
        return ok(config, outletBody({ ...current, isActive: false }));
      }
      return ok(config, outletBody(current));
    });
    renderOutlets(`/outlets/${current.id}`);

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText('Assigned staff lose access to this outlet.'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/sales history and receipt numbering are preserved/),
    ).toBeInTheDocument();

    const confirm = within(dialog).getByRole('button', { name: 'Deactivate outlet' });
    await userEvent.click(confirm);
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    statusResponse.resolve(undefined);

    expect(await screen.findByText('MIRPUR-01 is now inactive.')).toBeInTheDocument();
    expect(requests.filter((request) => request.method === 'PATCH')).toEqual([
      expect.objectContaining({ url: `/outlets/${current.id}/status`, data: { isActive: false } }),
    ]);
    expect(await screen.findByRole('button', { name: 'Activate' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
