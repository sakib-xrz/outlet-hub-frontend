import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { StaffDetailsPage } from '@/pages/staff/staff-details-page';
import { StaffPage } from '@/pages/staff/staff-page';
import { deferred, errorBody, respond } from '../../helpers/http';
import { mockApi, ok, renderRoutes, signInAs } from '../../helpers/outlets';
import {
  STAFF_ID,
  outletOptions,
  outlets,
  staffBody,
  staffDetail,
  staffPageBody,
  staffSummary,
} from '../../helpers/staff';

const routes = [
  { path: '/staff', Component: StaffPage },
  { path: '/staff/:staffId', Component: StaffDetailsPage },
];
const PASSWORD = 'correct horse battery staple';

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  signInAs('HQ_ADMIN');
});

async function openCreate(): Promise<HTMLElement> {
  await screen.findByText('staff@example.com');
  await userEvent.click(screen.getByRole('button', { name: 'Create staff' }));
  return screen.findByRole('dialog');
}

describe('Create staff', () => {
  it('validates email, password policy and confirmation without calling the API', async () => {
    const requests = mockApi((config) =>
      config.url === '/outlets'
        ? outletOptions(config)
        : ok(config, staffPageBody([staffSummary()])),
    );
    renderRoutes(routes, '/staff');
    const dialog = await openCreate();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Create staff' }));
    expect(await within(dialog).findByText('Enter an email address.')).toBeInTheDocument();
    expect(within(dialog).getByText('Use at least 12 characters.')).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('Email'), 'new@example.com');
    await userEvent.type(within(dialog).getByLabelText('Password'), PASSWORD);
    await userEvent.type(within(dialog).getByLabelText('Confirm password'), `${PASSWORD}!`);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create staff' }));
    expect(await within(dialog).findByText('Passwords do not match.')).toBeInTheDocument();
    expect(requests.some((request) => request.method === 'POST')).toBe(false);
  });

  it('creates staff with selected active outlets and never sends the confirmation', async () => {
    let created = false;
    const requests = mockApi((config) => {
      if (config.url === '/outlets') return outletOptions(config);
      if (config.method === 'post') {
        created = true;
        return respond(config, 201, staffBody(staffDetail({ email: 'new@example.com' })));
      }
      return ok(
        config,
        staffPageBody(
          created
            ? [
                staffSummary(),
                staffSummary({
                  id: '5f5f5f5f-5f5f-4f5f-8f5f-5f5f5f5f5f5f',
                  email: 'new@example.com',
                }),
              ]
            : [staffSummary()],
        ),
      );
    });
    const { queryClient } = renderRoutes(routes, '/staff');
    const dialog = await openCreate();

    await userEvent.type(within(dialog).getByLabelText('Email'), ' New@Example.com');
    await userEvent.type(within(dialog).getByLabelText('Password'), PASSWORD);
    await userEvent.type(within(dialog).getByLabelText('Confirm password'), PASSWORD);
    await userEvent.click(await within(dialog).findByRole('checkbox', { name: /CCC-01/ }));
    expect(within(dialog).getByRole('checkbox', { name: /DDD-01/ })).toBeDisabled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create staff' }));

    expect(await screen.findByText('Staff account new@example.com created.')).toBeInTheDocument();
    expect(requests.find((request) => request.method === 'POST')?.data).toEqual({
      email: 'new@example.com',
      password: PASSWORD,
      outletIds: [outlets.freeActive.id],
    });
    expect(await screen.findByText('new@example.com')).toBeInTheDocument();
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  });

  it('shows duplicate emails on the email field and keeps the entered values', async () => {
    mockApi((config) => {
      if (config.url === '/outlets') return outletOptions(config);
      if (config.method === 'post') {
        return respond(
          config,
          409,
          errorBody('CONFLICT', [
            { field: 'body.email', message: 'This email address is already in use' },
          ]),
        );
      }
      return ok(config, staffPageBody([staffSummary()]));
    });
    renderRoutes(routes, '/staff');
    const dialog = await openCreate();

    await userEvent.type(within(dialog).getByLabelText('Email'), 'staff@example.com');
    await userEvent.type(within(dialog).getByLabelText('Password'), PASSWORD);
    await userEvent.type(within(dialog).getByLabelText('Confirm password'), PASSWORD);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create staff' }));

    expect(
      await within(dialog).findByText('This email address is already in use'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Email')).toHaveValue('staff@example.com');
    expect(within(dialog).getByLabelText('Password')).toHaveValue(PASSWORD);
  });
});

describe('Staff details actions', () => {
  it('shows account details with linked assignments, and a not-found state', async () => {
    mockApi((config) => ok(config, staffBody(staffDetail())));
    const view = renderRoutes(routes, `/staff/${STAFF_ID}`);
    expect(await screen.findByRole('heading', { name: 'staff@example.com' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bravo' })).toHaveAttribute(
      'href',
      `/outlets/${outlets.assignedInactive.id}`,
    );
    expect(screen.getByText('Outlet Staff')).toBeInTheDocument();
    view.unmount();

    mockApi((config) => respond(config, 404, errorBody('NOT_FOUND')));
    renderRoutes(routes, `/staff/${STAFF_ID}`);
    expect(await screen.findByText('Staff member not found')).toBeInTheDocument();
  });

  it('edits the email and maps conflicts', async () => {
    let conflict = true;
    const requests = mockApi((config) => {
      if (config.method === 'patch') {
        if (conflict) {
          conflict = false;
          return respond(
            config,
            409,
            errorBody('CONFLICT', [
              { field: 'body.email', message: 'This email address is already in use' },
            ]),
          );
        }
        return ok(config, staffBody(staffDetail({ email: 'renamed@example.com' })));
      }
      return ok(config, staffBody(staffDetail()));
    });
    renderRoutes(routes, `/staff/${STAFF_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit email' }));
    const dialog = await screen.findByRole('dialog');
    const email = within(dialog).getByLabelText('Email');
    await userEvent.clear(email);
    await userEvent.type(email, 'Renamed@Example.com');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save email' }));
    expect(
      await within(dialog).findByText('This email address is already in use'),
    ).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Save email' }));
    expect(await screen.findByRole('heading', { name: 'renamed@example.com' })).toBeInTheDocument();
    expect(requests.filter((r) => r.method === 'PATCH').at(-1)?.data).toEqual({
      email: 'renamed@example.com',
    });
  });

  it('confirms deactivation once and explains session revocation', async () => {
    const response = deferred<undefined>();
    const requests = mockApi(async (config) => {
      if (config.method === 'patch') {
        await response.promise;
        return ok(config, staffBody(staffDetail({ isActive: false })));
      }
      return ok(config, staffBody(staffDetail()));
    });
    renderRoutes(routes, `/staff/${STAFF_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/sessions are revoked/)).toBeInTheDocument();
    expect(within(dialog).getByText(/historical sales records are preserved/)).toBeInTheDocument();

    const confirm = within(dialog).getByRole('button', { name: 'Deactivate account' });
    await userEvent.click(confirm);
    expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    response.resolve(undefined);

    expect(await screen.findByText('staff@example.com is now inactive.')).toBeInTheDocument();
    expect(requests.filter((r) => r.method === 'PATCH')).toEqual([
      expect.objectContaining({ url: `/staff/${STAFF_ID}/status`, data: { isActive: false } }),
    ]);
  });

  it('resets passwords with confirmation and leaves no password in the mutation cache', async () => {
    const requests = mockApi((config) =>
      config.method === 'patch'
        ? ok(config, { success: true, message: 'Password reset successfully', data: {} })
        : ok(config, staffBody(staffDetail())),
    );
    const { queryClient } = renderRoutes(routes, `/staff/${STAFF_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Reset password' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/up to 15 minutes/)).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('New password'), PASSWORD);
    await userEvent.type(within(dialog).getByLabelText('Confirm new password'), 'something else');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reset password' }));
    expect(await within(dialog).findByText('Passwords do not match.')).toBeInTheDocument();

    const confirm = within(dialog).getByLabelText('Confirm new password');
    await userEvent.clear(confirm);
    await userEvent.type(confirm, PASSWORD);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText(/Password reset\./)).toBeInTheDocument();
    expect(requests.filter((r) => r.method === 'PATCH')).toEqual([
      expect.objectContaining({
        url: `/staff/${STAFF_ID}/password`,
        data: { newPassword: PASSWORD },
      }),
    ]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(
      JSON.stringify(
        queryClient
          .getMutationCache()
          .getAll()
          .map((m) => m.state),
      ),
    ).not.toContain(PASSWORD);
  });
});
