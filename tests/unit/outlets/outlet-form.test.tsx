import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { errorBody, respond } from '../../helpers/http';
import {
  mockApi,
  ok,
  outlet,
  outletBody,
  pageBody,
  renderOutlets,
  signInAs,
} from '../../helpers/outlets';

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  signInAs('HQ_ADMIN');
});

async function openCreateDialog(): Promise<HTMLElement> {
  await screen.findByText('Mirpur Outlet');
  await userEvent.click(screen.getByRole('button', { name: 'Create outlet' }));
  return screen.findByRole('dialog');
}

describe('Outlet form', () => {
  it('validates fields before calling the API', async () => {
    const requests = mockApi((config) => ok(config, pageBody([outlet()])));
    renderOutlets('/outlets');
    const dialog = await openCreateDialog();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Create outlet' }));
    expect(
      await within(dialog).findByText('Code must be at least 2 characters.'),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Enter the outlet name.')).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText('Outlet code'), 'bad code');
    expect(within(dialog).getByLabelText('Outlet code')).toHaveValue('BAD CODE');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create outlet' }));
    expect(
      await within(dialog).findByText('Use letters, numbers and single hyphens only.'),
    ).toBeInTheDocument();
    expect(requests.some((request) => request.method === 'POST')).toBe(false);
  });

  it('shows duplicate codes on the code field and keeps the entered values', async () => {
    mockApi((config) =>
      config.method === 'post'
        ? respond(
            config,
            409,
            errorBody('CONFLICT', [
              { field: 'body.code', message: 'This outlet code is already in use' },
            ]),
          )
        : ok(config, pageBody([outlet()])),
    );
    renderOutlets('/outlets');
    const dialog = await openCreateDialog();

    await userEvent.type(within(dialog).getByLabelText('Outlet code'), 'MIRPUR-01');
    await userEvent.type(within(dialog).getByLabelText('Outlet name'), 'Another');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create outlet' }));

    expect(
      await within(dialog).findByText('This outlet code is already in use'),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Outlet code')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByLabelText('Outlet name')).toHaveValue('Another');
    expect(within(dialog).getByRole('button', { name: 'Create outlet' })).toBeEnabled();
  });

  it('edits only name and address with a read-only code', async () => {
    const current = outlet();
    const requests = mockApi((config) =>
      config.method === 'patch'
        ? ok(config, outletBody({ ...current, name: 'Mirpur Flagship', address: null }))
        : ok(config, outletBody(current)),
    );
    renderOutlets(`/outlets/${current.id}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByLabelText('Outlet code')).toHaveAttribute('readonly');
    const name = within(dialog).getByLabelText('Outlet name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Mirpur Flagship');
    await userEvent.clear(within(dialog).getByLabelText(/address/i));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Outlet details saved.')).toBeInTheDocument();
    expect(requests.find((request) => request.method === 'PATCH')?.data).toEqual({
      name: 'Mirpur Flagship',
      address: null,
    });
    expect(await screen.findByRole('heading', { name: 'Mirpur Flagship' })).toBeInTheDocument();
  });
});
