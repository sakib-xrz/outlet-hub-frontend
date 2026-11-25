import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/router';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useUpdateMenuItem } from '@/features/menu-items/hooks/use-menu-item-mutations';
import { menuItemKeys } from '@/features/menu-items/hooks/menu-item-query-keys';
import { outletMenuKeys } from '@/features/outlet-menu-items/hooks/outlet-menu-query-keys';
import { OutletDetailsPage } from '@/pages/outlets/outlet-details-page';
import { OutletMenuPage } from '@/pages/outlets/outlet-menu-page';
import { deferred, errorBody, respond } from '../../helpers/http';
import { menuItem, menuItemBody } from '../../helpers/menu-items';
import {
  MENU_PATH,
  OUTLET,
  assignment,
  assignmentBody,
  masterItems,
  menuBody,
  routeOutletMenu,
} from '../../helpers/outlet-menu';
import { mockApi, ok, outletBody, renderRoutes, signInAs } from '../../helpers/outlets';

const pageRoutes = [
  { path: '/outlets/:outletId', Component: OutletDetailsPage },
  { path: '/outlets/:outletId/menu', Component: OutletMenuPage },
];
const MENU_URL = `/outlets/${OUTLET.id}/menu`;

beforeEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  signInAs('HQ_ADMIN');
});

const states = [
  assignment({
    menuItemId: '11111111-1111-4111-8111-111111111111',
    sku: 'A-1',
    name: 'Available item',
  }),
  assignment({
    menuItemId: '22222222-2222-4222-8222-222222222222',
    sku: 'B-1',
    name: 'Zero stock',
    stockQuantity: 0,
    isSellable: false,
    overridePrice: '0.00',
    effectivePrice: '0.00',
    priceSource: 'OVERRIDE',
  }),
  assignment({
    menuItemId: '33333333-3333-4333-8333-333333333333',
    sku: 'C-1',
    name: 'Unassigned',
    isActive: false,
    isEnabled: false,
    isSellable: false,
  }),
  assignment({
    menuItemId: '44444444-4444-4444-8444-444444444444',
    sku: 'D-1',
    name: 'Master off',
    menuItemIsActive: false,
    isEnabled: false,
    isSellable: false,
  }),
];

describe('Outlet menu (HQ)', () => {
  it('distinguishes inherited and overridden prices and every unavailability reason', async () => {
    mockApi(routeOutletMenu({ menu: (config) => ok(config, menuBody(states)) }));
    renderRoutes(pageRoutes, MENU_URL);

    const row = (name: string) => screen.getByText(name).closest('tr') as HTMLElement;
    await screen.findByText('Available item');
    expect(within(row('Available item')).getByText('Master price')).toBeInTheDocument();
    expect(within(row('Available item')).getByText('Available')).toBeInTheDocument();
    expect(within(row('Zero stock')).getByText('Outlet price')).toBeInTheDocument();
    expect(within(row('Zero stock')).getAllByText('৳0.00')).not.toHaveLength(0);
    expect(within(row('Zero stock')).getByText('Out of stock')).toBeInTheDocument();
    expect(within(row('Unassigned')).getByText('Assignment inactive')).toBeInTheDocument();
    expect(within(row('Master off')).getByText('Master item inactive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assign menu item' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Actions for Available item' })).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('shows loading, empty and error states with retry', async () => {
    const response = deferred<undefined>();
    mockApi(
      routeOutletMenu({
        menu: async (config) => {
          await response.promise;
          return ok(config, menuBody([]));
        },
      }),
    );
    const view = renderRoutes(pageRoutes, MENU_URL);
    expect(screen.getByRole('status', { name: 'Loading outlet menu' })).toBeInTheDocument();
    response.resolve(undefined);
    expect(await screen.findByText('No menu items assigned yet')).toBeInTheDocument();
    view.unmount();

    let fail = true;
    mockApi(
      routeOutletMenu({
        menu: (config) =>
          fail
            ? respond(config, 500, errorBody('INTERNAL_ERROR'))
            : ok(config, menuBody([assignment()])),
      }),
    );
    renderRoutes(pageRoutes, MENU_URL);
    expect(await screen.findByText('The outlet menu could not be loaded')).toBeInTheDocument();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Classic Burger')).toBeInTheDocument();
  });

  it('debounces search, resets to page 1, and paginates on the server', async () => {
    const requests = mockApi(
      routeOutletMenu({
        menu: (config) =>
          ok(config, menuBody([assignment()], 45, (config.params as { page: number }).page)),
      }),
    );
    renderRoutes(pageRoutes, `${MENU_URL}?page=2`);
    await screen.findByText('Classic Burger');
    const menuRequests = () => requests.filter((request) => request.url === MENU_PATH);

    await userEvent.type(screen.getByRole('searchbox', { name: /search outlet menu/i }), 'burg');
    await waitFor(() =>
      expect(menuRequests().at(-1)?.params).toMatchObject({ search: 'burg', page: 1 }),
    );
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(menuRequests().at(-1)?.params).toMatchObject({ page: 2 }));
  });
});

describe('Assigning menu items', () => {
  async function openAssign(): Promise<HTMLElement> {
    await screen.findByText('Classic Burger');
    await userEvent.click(screen.getByRole('button', { name: 'Assign menu item' }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('radio', { name: /TEA-01/ });
    return dialog;
  }

  it('assigns with inherited pricing by default and refreshes the menu', async () => {
    let assigned = false;
    const created = assignment({
      menuItemId: masterItems[0]?.id ?? '',
      sku: 'TEA-01',
      name: 'Masala Tea',
      basePrice: '40.00',
      effectivePrice: '40.00',
      stockQuantity: 0,
      isSellable: false,
    });
    const requests = mockApi(
      routeOutletMenu({
        menu: (config) => {
          if (config.method === 'post') {
            assigned = true;
            return respond(config, 201, assignmentBody(created));
          }
          return ok(config, menuBody(assigned ? [assignment(), created] : [assignment()]));
        },
      }),
    );
    renderRoutes(pageRoutes, MENU_URL);
    const dialog = await openAssign();

    await userEvent.click(within(dialog).getByRole('radio', { name: /TEA-01/ }));
    expect(within(dialog).getByText(/Effective price/)).toHaveTextContent('৳40.00');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Assign item' }));

    expect(await screen.findByText('TEA-01 assigned to this outlet.')).toBeInTheDocument();
    expect(requests.find((request) => request.method === 'POST')?.data).toEqual({
      menuItemId: masterItems[0]?.id,
      overridePrice: null,
    });
    expect(await screen.findByText('Masala Tea')).toBeInTheDocument();
  });

  it('sends an explicit zero override as "0.00" and blocks double submission', async () => {
    const response = deferred<undefined>();
    const requests = mockApi(
      routeOutletMenu({
        menu: async (config) => {
          if (config.method === 'post') {
            await response.promise;
            return respond(
              config,
              201,
              assignmentBody(
                assignment({
                  sku: 'TEA-01',
                  overridePrice: '0.00',
                  effectivePrice: '0.00',
                  priceSource: 'OVERRIDE',
                }),
              ),
            );
          }
          return ok(config, menuBody([assignment()]));
        },
      }),
    );
    renderRoutes(pageRoutes, MENU_URL);
    const dialog = await openAssign();

    await userEvent.click(within(dialog).getByRole('radio', { name: /TEA-01/ }));
    await userEvent.click(within(dialog).getByRole('radio', { name: /Set custom outlet price/ }));
    await userEvent.type(within(dialog).getByLabelText('Custom price'), '0');
    expect(within(dialog).getByText(/Effective price/)).toHaveTextContent('৳0.00');

    const submit = within(dialog).getByRole('button', { name: 'Assign item' });
    await userEvent.click(submit);
    expect(submit).toBeDisabled();
    await userEvent.click(submit);
    response.resolve(undefined);

    await screen.findByText('TEA-01 assigned to this outlet.');
    expect(requests.filter((request) => request.method === 'POST')).toEqual([
      expect.objectContaining({ data: { menuItemId: masterItems[0]?.id, overridePrice: '0.00' } }),
    ]);
  });

  it('shows already-assigned conflicts and keeps the selection across a background refetch', async () => {
    mockApi(
      routeOutletMenu({
        menu: (config) =>
          config.method === 'post'
            ? respond(
                config,
                409,
                errorBody('CONFLICT', [
                  {
                    field: 'body.menuItemId',
                    message:
                      'Previously assigned and currently inactive. Reactivate the existing assignment.',
                  },
                ]),
              )
            : ok(config, menuBody([assignment()])),
      }),
    );
    const { queryClient } = renderRoutes(pageRoutes, MENU_URL);
    const dialog = await openAssign();

    await userEvent.click(within(dialog).getByRole('radio', { name: /COFFEE-001/ }));
    await queryClient.refetchQueries({ queryKey: menuItemKeys.lists() });
    expect(within(dialog).getByRole('radio', { name: /COFFEE-001/ })).toBeChecked();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Assign item' }));
    expect(
      await within(dialog).findByText(/Reactivate the existing assignment/),
    ).toBeInTheDocument();
  });

  it('requires a selection and disables assignment for inactive outlets', async () => {
    mockApi(routeOutletMenu());
    const view = renderRoutes(pageRoutes, MENU_URL);
    const dialog = await openAssign();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Assign item' }));
    expect(await within(dialog).findByText('Choose a menu item to assign.')).toBeInTheDocument();
    view.unmount();

    mockApi((config) =>
      config.url === `/outlets/${OUTLET.id}`
        ? ok(config, outletBody({ ...OUTLET, isActive: false }))
        : routeOutletMenu()(config),
    );
    renderRoutes(pageRoutes, MENU_URL);
    expect(
      await screen.findByText('Inactive outlets cannot receive new assignments.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assign menu item' })).toBeDisabled();
  });
});

describe('Price overrides and assignment status', () => {
  const overridden = assignment({
    overridePrice: '280.00',
    effectivePrice: '280.00',
    priceSource: 'OVERRIDE',
  });

  it('restores master pricing by sending null', async () => {
    const requests = mockApi(
      routeOutletMenu({
        menu: (config) =>
          config.method === 'patch'
            ? ok(config, assignmentBody(assignment()))
            : ok(config, menuBody([overridden])),
      }),
    );
    renderRoutes(pageRoutes, MENU_URL);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Actions for Classic Burger' }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Restore master price' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('radio', { name: /Use master menu price/ })).toBeChecked();
    expect(within(dialog).getByText(/Effective price/)).toHaveTextContent('৳250.00');
    expect(within(dialog).getByText(/Future master price changes apply/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save price' }));

    expect(await screen.findByText('BURGER-001 now uses the master price.')).toBeInTheDocument();
    expect(requests.find((request) => request.method === 'PATCH')).toMatchObject({
      url: `${MENU_PATH}/${overridden.menuItemId}/price`,
      data: { overridePrice: null },
    });
  });

  it('validates custom prices as exact decimals', async () => {
    const requests = mockApi(
      routeOutletMenu({
        menu: (config) =>
          config.method === 'patch'
            ? ok(
                config,
                assignmentBody({
                  ...overridden,
                  overridePrice: '300.50',
                  effectivePrice: '300.50',
                }),
              )
            : ok(config, menuBody([overridden])),
      }),
    );
    renderRoutes(pageRoutes, MENU_URL);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Actions for Classic Burger' }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Edit price' }));
    const dialog = await screen.findByRole('dialog');
    const price = within(dialog).getByLabelText('Custom price');
    expect(price).toHaveValue('280.00');
    expect(price).toHaveAttribute('inputmode', 'decimal');

    await userEvent.clear(price);
    await userEvent.type(price, '1.234');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save price' }));
    expect(await within(dialog).findByText(/with at most 2 decimals/)).toBeInTheDocument();

    await userEvent.clear(price);
    await userEvent.type(price, '300.5');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save price' }));
    await screen.findByText(/now costs ৳300.50/);
    expect(requests.filter((request) => request.method === 'PATCH').map((r) => r.data)).toEqual([
      { overridePrice: '300.50' },
    ]);
  });

  it('confirms deactivation and blocks reactivation under an inactive master item', async () => {
    const requests = mockApi(
      routeOutletMenu({
        menu: (config) =>
          config.method === 'patch'
            ? ok(
                config,
                assignmentBody(
                  assignment({ isActive: false, isEnabled: false, isSellable: false }),
                ),
              )
            : ok(
                config,
                menuBody([
                  assignment(),
                  assignment({
                    menuItemId: '44444444-4444-4444-8444-444444444444',
                    sku: 'D-1',
                    name: 'Master off',
                    isActive: false,
                    menuItemIsActive: false,
                    isEnabled: false,
                    isSellable: false,
                  }),
                ]),
              ),
      }),
    );
    renderRoutes(pageRoutes, MENU_URL);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Actions for Classic Burger' }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate assignment' }));
    let dialog = await screen.findByRole('alertdialog');
    expect(
      within(dialog).getByText('Other outlets that sell this item are not affected.'),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Stock \(12\) and any custom price are preserved/),
    ).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deactivate assignment' }));
    expect(
      await screen.findByText('BURGER-001 is now inactive in this outlet.'),
    ).toBeInTheDocument();
    expect(requests.find((request) => request.method === 'PATCH')?.data).toEqual({
      isActive: false,
    });

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Actions for Master off' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Reactivate assignment' }));
    dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/master menu item is inactive/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Reactivate assignment' })).toBeDisabled();
  });
});

describe('Staff view and access', () => {
  it('shows an operational menu without management controls', async () => {
    signInAs('OUTLET_STAFF');
    mockApi(routeOutletMenu());
    renderRoutes(pageRoutes, MENU_URL);
    expect(await screen.findByText('Classic Burger')).toBeInTheDocument();
    expect(screen.getByText('৳250.00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign menu item' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Actions for/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /assignment status/i })).not.toBeInTheDocument();
  });

  it('links to the menu from outlet details with role-appropriate wording', async () => {
    signInAs('OUTLET_STAFF');
    mockApi(routeOutletMenu());
    const view = renderRoutes(pageRoutes, `/outlets/${OUTLET.id}`);
    expect(await screen.findByRole('link', { name: 'View menu' })).toHaveAttribute(
      'href',
      MENU_URL,
    );
    view.unmount();

    signInAs('HQ_ADMIN');
    renderRoutes(pageRoutes, `/outlets/${OUTLET.id}`);
    expect(await screen.findByRole('link', { name: 'Manage menu' })).toBeInTheDocument();
  });

  it('shows the no-access state for unassigned outlets', async () => {
    signInAs('OUTLET_STAFF');
    mockApi((config) => respond(config, 403, errorBody('AUTHORIZATION_ERROR')));
    renderRoutes(pageRoutes, MENU_URL);
    expect(await screen.findByText('No access to this outlet')).toBeInTheDocument();
  });

  it('lets both roles reach the route through the app router', async () => {
    signInAs('OUTLET_STAFF');
    mockApi((config) =>
      config.url === '/auth/me'
        ? ok(config, {
            success: true,
            message: 'ok',
            data: {
              user: {
                id: '1d6eaebf-c25a-4018-ac74-16d4df395294',
                email: 'user@example.com',
                role: 'OUTLET_STAFF',
              },
            },
          })
        : routeOutletMenu()(config),
    );
    renderRoutes(routes, MENU_URL);
    expect(await screen.findByText('Classic Burger')).toBeInTheDocument();
  });
});

describe('Cache dependencies', () => {
  function MasterPriceEditor() {
    const update = useUpdateMenuItem(assignment().menuItemId);
    return (
      <button
        type="button"
        onClick={() =>
          update.mutate({ name: 'Classic Burger', description: null, basePrice: '260.00' })
        }
      >
        Change master price
      </button>
    );
  }

  function Probe() {
    return (
      <>
        <OutletMenuPage />
        <MasterPriceEditor />
      </>
    );
  }

  it('refetches outlet menus when a master menu item changes', async () => {
    let base = '250.00';
    const requests = mockApi((config) => {
      if (config.url === `/menu-items/${assignment().menuItemId}`) {
        base = '260.00';
        return ok(config, menuItemBody(menuItem({ id: assignment().menuItemId, basePrice: base })));
      }
      return routeOutletMenu({
        menu: (inner) =>
          ok(inner, menuBody([assignment({ basePrice: base, effectivePrice: base })])),
      })(config);
    });
    renderRoutes([{ path: '/outlets/:outletId/menu', Component: Probe }], MENU_URL);
    expect(await screen.findAllByText('৳250.00')).not.toHaveLength(0);
    const before = requests.filter((request) => request.url === MENU_PATH).length;

    await userEvent.click(screen.getByRole('button', { name: 'Change master price' }));
    expect(await screen.findAllByText('৳260.00')).not.toHaveLength(0);
    expect(requests.filter((request) => request.url === MENU_PATH).length).toBeGreaterThan(before);
  });

  it('invalidates an outlet menu when that outlet is deactivated', async () => {
    mockApi((config) =>
      config.method === 'patch'
        ? ok(config, outletBody({ ...OUTLET, isActive: false }))
        : routeOutletMenu()(config),
    );
    const { queryClient } = renderRoutes(pageRoutes, `/outlets/${OUTLET.id}`);
    const filters = { page: 1, search: '', status: 'all', sort: 'name-asc' } as const;
    queryClient.setQueryData(
      outletMenuKeys.list(OUTLET.id, filters),
      menuBody([assignment()]).data,
    );
    queryClient.setQueryData(outletMenuKeys.list('other-outlet', filters), menuBody([]).data);

    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate outlet' }));
    await screen.findByText('MIRPUR-01 is now inactive.');

    expect(queryClient.getQueryState(outletMenuKeys.list(OUTLET.id, filters))?.isInvalidated).toBe(
      true,
    );
    expect(
      queryClient.getQueryState(outletMenuKeys.list('other-outlet', filters))?.isInvalidated,
    ).toBe(false);
  });
});
