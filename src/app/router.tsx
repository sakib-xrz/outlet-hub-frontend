import { createBrowserRouter, type RouteObject } from 'react-router';
import { FullPageLoader } from '@/components/shared/full-page-loader';
import { ROLES } from '@/features/auth/constants';
import { NotFoundPage } from '@/pages/errors/not-found-page';
import { ProtectedRoute } from '@/routes/protected-route';
import { PublicRoute } from '@/routes/public-route';
import { RoleGuard } from '@/routes/role-guard';
import { RootRedirect } from '@/routes/root-redirect';
import { RouteErrorBoundary } from '@/routes/route-error-boundary';

export const routes: RouteObject[] = [
  {
    path: '/',
    ErrorBoundary: RouteErrorBoundary,
    HydrateFallback: FullPageLoader,
    children: [
      { index: true, Component: RootRedirect },
      {
        Component: PublicRoute,
        children: [
          {
            lazy: async () => ({
              Component: (await import('@/components/layout/auth-layout')).AuthLayout,
            }),
            children: [
              {
                path: 'login',
                lazy: async () => ({
                  Component: (await import('@/pages/auth/login-page')).LoginPage,
                }),
              },
            ],
          },
        ],
      },
      {
        Component: ProtectedRoute,
        children: [
          {
            lazy: async () => ({
              Component: (await import('@/components/layout/app-layout')).AppLayout,
            }),
            children: [
              {
                element: <RoleGuard allow={[ROLES.HQ_ADMIN, ROLES.OUTLET_STAFF]} />,
                children: [
                  {
                    path: 'dashboard',
                    lazy: async () => ({
                      Component: (await import('@/pages/dashboard/dashboard-page')).DashboardPage,
                    }),
                  },
                  {
                    path: 'outlets',
                    lazy: async () => ({
                      Component: (await import('@/pages/outlets/outlets-page')).OutletsPage,
                    }),
                  },
                  {
                    path: 'outlets/:outletId/sales',
                    lazy: async () => ({
                      Component: (await import('@/pages/outlets/outlet-sales-page'))
                        .OutletSalesPage,
                    }),
                  },
                  {
                    path: 'outlets/:outletId/sales/:saleId',
                    lazy: async () => ({
                      Component: (await import('@/pages/outlets/sale-details-page'))
                        .SaleDetailsPage,
                    }),
                  },
                  {
                    path: 'outlets/:outletId/inventory',
                    lazy: async () => ({
                      Component: (await import('@/pages/outlets/outlet-inventory-page'))
                        .OutletInventoryPage,
                    }),
                  },
                  {
                    path: 'outlets/:outletId/menu',
                    lazy: async () => ({
                      Component: (await import('@/pages/outlets/outlet-menu-page')).OutletMenuPage,
                    }),
                  },
                  {
                    path: 'outlets/:outletId',
                    lazy: async () => ({
                      Component: (await import('@/pages/outlets/outlet-details-page'))
                        .OutletDetailsPage,
                    }),
                  },
                ],
              },
              {
                element: <RoleGuard allow={[ROLES.OUTLET_STAFF]} />,
                children: [
                  {
                    path: 'outlets/:outletId/pos',
                    lazy: async () => ({
                      Component: (await import('@/pages/outlets/outlet-pos-page')).OutletPosPage,
                    }),
                  },
                ],
              },
              {
                element: <RoleGuard allow={[ROLES.HQ_ADMIN]} />,
                children: [
                  {
                    path: 'staff',
                    lazy: async () => ({
                      Component: (await import('@/pages/staff/staff-page')).StaffPage,
                    }),
                  },
                  {
                    path: 'staff/:staffId',
                    lazy: async () => ({
                      Component: (await import('@/pages/staff/staff-details-page'))
                        .StaffDetailsPage,
                    }),
                  },
                  {
                    path: 'menu-items',
                    lazy: async () => ({
                      Component: (await import('@/pages/menu-items/menu-items-page')).MenuItemsPage,
                    }),
                  },
                  {
                    path: 'menu-items/:menuItemId',
                    lazy: async () => ({
                      Component: (await import('@/pages/menu-items/menu-item-details-page'))
                        .MenuItemDetailsPage,
                    }),
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        path: 'unauthorized',
        lazy: async () => ({
          Component: (await import('@/pages/errors/unauthorized-page')).UnauthorizedPage,
        }),
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
];

export const router = createBrowserRouter(routes);
