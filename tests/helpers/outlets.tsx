import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { InternalAxiosRequestConfig } from 'axios';
import { createMemoryRouter, type RouteObject, RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import type { Role } from '@/features/auth/types/auth.types';
import type { Outlet } from '@/features/outlets/types/outlet.types';
import { attachAuthInterceptors } from '@/lib/api/auth-interceptors';
import { apiClient } from '@/lib/api/client';
import { createQueryClient } from '@/lib/query/client';
import { OutletDetailsPage } from '@/pages/outlets/outlet-details-page';
import { OutletsPage } from '@/pages/outlets/outlets-page';
import { respond } from './http';

let interceptorsAttached = false;

export type RecordedRequest = { method: string; url: string; params: unknown; data: unknown };
export type Handler = (config: InternalAxiosRequestConfig) => Promise<unknown>;

export function mockApi(handler: Handler): RecordedRequest[] {
  if (!interceptorsAttached) {
    interceptorsAttached = true;
    attachAuthInterceptors(apiClient, {
      getAccessToken: () => 'test-token',
      isAccessTokenExpiring: () => false,
      refreshSession: () => Promise.resolve(null),
      getSessionSignal: () => new AbortController().signal,
    });
  }
  const requests: RecordedRequest[] = [];
  apiClient.defaults.adapter = (config) => {
    requests.push({
      method: (config.method ?? 'get').toUpperCase(),
      url: config.url ?? '',
      params: config.params,
      data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    });
    return handler(config) as never;
  };
  return requests;
}

export function signInAs(role: Role): void {
  useAuthStore.getState().setSession({
    accessToken: 'test-token',
    tokenType: 'Bearer',
    expiresIn: 900,
    user: { id: '1d6eaebf-c25a-4018-ac74-16d4df395294', email: 'user@example.com', role },
  });
}

export function outlet(overrides: Partial<Outlet> = {}): Outlet {
  return {
    id: '6f0c2b1e-9a43-4c2f-8f7e-0b8f1d2a3c4d',
    code: 'MIRPUR-01',
    name: 'Mirpur Outlet',
    address: 'Mirpur, Dhaka',
    isActive: true,
    createdAt: '2026-01-05T10:00:00.000Z',
    updatedAt: '2026-01-06T10:00:00.000Z',
    ...overrides,
  };
}

export function pageBody(items: Outlet[], total = items.length, page = 1) {
  return {
    success: true,
    message: 'Outlets retrieved successfully',
    data: { items, pagination: { page, limit: 20, total, totalPages: Math.ceil(total / 20) } },
  };
}

export function outletBody(value: Outlet) {
  return { success: true, message: 'ok', data: { outlet: value } };
}

export const ok = (config: InternalAxiosRequestConfig, body: unknown) => respond(config, 200, body);

export function renderRoutes(
  routes: RouteObject[],
  path: string,
): RenderResult & { router: ReturnType<typeof createMemoryRouter>; queryClient: QueryClient } {
  const queryClient = createQueryClient();
  const defaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({ ...defaults, queries: { ...defaults.queries, retry: false } });
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );
  return { ...result, router, queryClient };
}

export function renderOutlets(path: string): ReturnType<typeof renderRoutes> {
  return renderRoutes(
    [
      { path: '/outlets', Component: OutletsPage },
      { path: '/outlets/:outletId', Component: OutletDetailsPage },
    ],
    path,
  );
}
