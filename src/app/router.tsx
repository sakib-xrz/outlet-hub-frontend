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
