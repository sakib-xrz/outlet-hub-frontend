import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import type { Role } from '@/features/auth/types/auth.types';
import { ProtectedRoute } from '@/routes/protected-route';
import { PublicRoute } from '@/routes/public-route';
import { RoleGuard } from '@/routes/role-guard';
import { sessionBody } from '../../helpers/http';

function LocationProbe({ label }: { label: string }) {
  const location = useLocation();
  return <p>{`${label} ${location.pathname}${location.search}`}</p>;
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        Component: PublicRoute,
        children: [{ path: '/login', element: <LocationProbe label="login" /> }],
      },
      {
        Component: ProtectedRoute,
        children: [
          {
            element: <RoleGuard allow={['HQ_ADMIN']} />,
            children: [
              { path: '/dashboard', element: <LocationProbe label="dashboard" /> },
              { path: '/settings', element: <LocationProbe label="settings" /> },
            ],
          },
        ],
      },
      { path: '/unauthorized', element: <LocationProbe label="unauthorized" /> },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

function authenticate(role: Role = 'HQ_ADMIN') {
  const { data } = sessionBody('token');
  useAuthStore.getState().setSession({
    ...data,
    tokenType: 'Bearer',
    user: { ...data.user, role },
  });
}

describe('route guards', () => {
  beforeEach(() => useAuthStore.setState(useAuthStore.getInitialState(), true));

  it('shows a loader instead of protected content while the session is restoring', () => {
    renderAt('/dashboard');
    expect(screen.getByRole('status')).toHaveTextContent('Restoring your session');
    expect(screen.queryByText(/dashboard/)).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to login and preserves the destination', async () => {
    useAuthStore.getState().clearSession();
    renderAt('/settings?tab=profile');
    expect(
      await screen.findByText('login /login?redirect=%2Fsettings%3Ftab%3Dprofile'),
    ).toBeInTheDocument();
  });

  it('renders protected content for an authenticated user with an allowed role', async () => {
    authenticate();
    renderAt('/dashboard');
    expect(await screen.findByText('dashboard /dashboard')).toBeInTheDocument();
  });

  it('sends users without the required role to the unauthorized page', async () => {
    authenticate('OUTLET_STAFF');
    renderAt('/dashboard');
    expect(await screen.findByText('unauthorized /unauthorized')).toBeInTheDocument();
  });

  it('redirects authenticated users away from login to a safe internal destination', async () => {
    authenticate();
    renderAt('/login?redirect=%2Fsettings');
    expect(await screen.findByText('settings /settings')).toBeInTheDocument();
  });

  it('ignores external redirect targets', async () => {
    authenticate();
    renderAt('/login?redirect=https%3A%2F%2Fevil.example');
    expect(await screen.findByText('dashboard /dashboard')).toBeInTheDocument();
  });

  it('shows the login page to unauthenticated users', async () => {
    useAuthStore.getState().clearSession();
    renderAt('/login');
    expect(await screen.findByText('login /login')).toBeInTheDocument();
  });
});

describe('post-login redirect fallback', () => {
  // Router with /dashboard open to all roles and /settings behind HQ_ADMIN guard.
  function renderLoginRedirect(role: Role, redirectPath: string) {
    authenticate(role);
    const router = createMemoryRouter(
      [
        {
          Component: PublicRoute,
          children: [{ path: '/login', element: <LocationProbe label="login" /> }],
        },
        {
          Component: ProtectedRoute,
          children: [
            { path: '/dashboard', element: <LocationProbe label="dashboard" /> },
            {
              element: <RoleGuard allow={['HQ_ADMIN']} />,
              children: [{ path: '/settings', element: <LocationProbe label="settings" /> }],
            },
          ],
        },
        { path: '/unauthorized', element: <LocationProbe label="unauthorized" /> },
      ],
      { initialEntries: [`/login?redirect=${encodeURIComponent(redirectPath)}`] },
    );
    return render(<RouterProvider router={router} />);
  }

  beforeEach(() => useAuthStore.setState(useAuthStore.getInitialState(), true));

  it('lands on /dashboard when the post-login redirect leads to a forbidden page', async () => {
    renderLoginRedirect('OUTLET_STAFF', '/settings');
    expect(await screen.findByText('dashboard /dashboard')).toBeInTheDocument();
  });

  it('still redirects to /unauthorized on direct navigation without fromLogin state', async () => {
    authenticate('OUTLET_STAFF');
    const router = createMemoryRouter(
      [
        {
          Component: ProtectedRoute,
          children: [
            { path: '/dashboard', element: <LocationProbe label="dashboard" /> },
            {
              element: <RoleGuard allow={['HQ_ADMIN']} />,
              children: [{ path: '/settings', element: <LocationProbe label="settings" /> }],
            },
          ],
        },
        { path: '/unauthorized', element: <LocationProbe label="unauthorized" /> },
      ],
      { initialEntries: ['/settings'] },
    );
    render(<RouterProvider router={router} />);
    expect(await screen.findByText('unauthorized /unauthorized')).toBeInTheDocument();
  });
});
