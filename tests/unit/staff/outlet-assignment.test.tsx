import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { StaffDetailsPage } from '@/pages/staff/staff-details-page';
import { mockApi, ok, outlet, pageBody, renderRoutes, signInAs } from '../../helpers/outlets';
import { STAFF_ID, outletOptions, outlets, staffBody, staffDetail } from '../../helpers/staff';
import { staffKeys } from '@/features/staff/hooks/staff-query-keys';

const routes = [{ path: '/staff/:staffId', Component: StaffDetailsPage }];

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  signInAs('HQ_ADMIN');
});

async function openAssignments(): Promise<HTMLElement> {
  await userEvent.click(await screen.findByRole('button', { name: 'Manage outlets' }));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByRole('checkbox', { name: /AAA-01/ });
  return dialog;
}

describe('Outlet assignments', () => {
  it('keeps existing inactive assignments, blocks new inactive ones, and submits the full set', async () => {
    const requests = mockApi((config) => {
      if (config.url === '/outlets') return outletOptions(config);
      if (config.method === 'put') {
        const ids = (JSON.parse(config.data as string) as { outletIds: string[] }).outletIds;
        return ok(
          config,
          staffBody(
            staffDetail({ outlets: Object.values(outlets).filter((o) => ids.includes(o.id)) }),
          ),
        );
      }
      return ok(config, staffBody(staffDetail()));
    });
    renderRoutes(routes, `/staff/${STAFF_ID}`);
    const dialog = await openAssignments();

    expect(within(dialog).getByRole('checkbox', { name: /BBB-01/ })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: /BBB-01/ })).toBeEnabled();
    expect(within(dialog).getByRole('checkbox', { name: /DDD-01/ })).toBeDisabled();

    await userEvent.click(within(dialog).getByRole('checkbox', { name: /CCC-01/ }));
    await userEvent.type(within(dialog).getByRole('searchbox', { name: /search outlets/i }), 'zzz');
    expect(await within(dialog).findByText('No outlets match your search.')).toBeInTheDocument();
    expect(within(dialog).getByText('3 selected')).toBeInTheDocument();
    expect(within(dialog).getByText('1 to add, 0 to remove.')).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Save assignments' }));
    expect(await screen.findByText(/Outlet assignments saved/)).toBeInTheDocument();
    expect(requests.find((r) => r.method === 'PUT')?.data).toEqual({
      outletIds: [outlets.assignedActive.id, outlets.assignedInactive.id, outlets.freeActive.id],
    });
    expect(await screen.findByRole('link', { name: 'Charlie' })).toBeInTheDocument();
  });

  it('keeps the in-progress selection when the staff record refetches in the background', async () => {
    mockApi((config) =>
      config.url === '/outlets' ? outletOptions(config) : ok(config, staffBody(staffDetail())),
    );
    const { queryClient } = renderRoutes(routes, `/staff/${STAFF_ID}`);
    const dialog = await openAssignments();

    await userEvent.click(within(dialog).getByRole('checkbox', { name: /CCC-01/ }));
    await queryClient.refetchQueries({ queryKey: staffKeys.detail(STAFF_ID) });

    expect(within(dialog).getByRole('checkbox', { name: /CCC-01/ })).toBeChecked();
    expect(within(dialog).getByText('1 to add, 0 to remove.')).toBeInTheDocument();
  });

  it('removes all assignments with an empty set', async () => {
    const requests = mockApi((config) => {
      if (config.url === '/outlets') return outletOptions(config);
      if (config.method === 'put') return ok(config, staffBody(staffDetail({ outlets: [] })));
      return ok(config, staffBody(staffDetail()));
    });
    renderRoutes(routes, `/staff/${STAFF_ID}`);
    const dialog = await openAssignments();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove all' }));
    expect(within(dialog).getByText('0 to add, 2 to remove.')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save assignments' }));

    await waitFor(() =>
      expect(requests.find((r) => r.method === 'PUT')?.data).toEqual({ outletIds: [] }),
    );
    expect(await screen.findByText('No outlets assigned.')).toBeInTheDocument();
  });

  it('loads more outlets instead of relying on the first page', async () => {
    const many = Array.from({ length: 60 }, (_, index) =>
      outlet({
        id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        code: `OUT-${String(index).padStart(2, '0')}`,
        name: `Outlet ${index}`,
      }),
    );
    const requests = mockApi((config) => {
      if (config.url === '/outlets') {
        const { page, limit } = config.params as { page: number; limit: number };
        return ok(
          config,
          pageBody(many.slice((page - 1) * limit, page * limit), many.length, page),
        );
      }
      return ok(config, staffBody(staffDetail({ outlets: [] })));
    });
    renderRoutes(routes, `/staff/${STAFF_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Manage outlets' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('checkbox', { name: /OUT-00/ });
    expect(within(dialog).queryByRole('checkbox', { name: /OUT-55/ })).not.toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Load more outlets' }));
    expect(await within(dialog).findByRole('checkbox', { name: /OUT-55/ })).toBeInTheDocument();
    expect(
      requests.filter((r) => r.url === '/outlets').map((r) => (r.params as { page: number }).page),
    ).toEqual([1, 2]);
  });
});
