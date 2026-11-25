import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { routes } from '@/app/router';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { mockApi, ok, signInAs } from '../../helpers/outlets';
import { renderRoutes } from '../../helpers/outlets';

const me = (role: string) => ({
  success: true,
  message: 'ok',
  data: { user: { id: '1d6eaebf-c25a-4018-ac74-16d4df395294', email: 'user@example.com', role } },
});

beforeEach(() => useAuthStore.setState(useAuthStore.getInitialState(), true));

describe('Staff route access', () => {
  it('hides the Staff navigation item and blocks direct URLs for outlet staff', async () => {
    signInAs('OUTLET_STAFF');
    const requests = mockApi((config) => ok(config, me('OUTLET_STAFF')));
    const view = renderRoutes(routes, '/dashboard');
    expect(await screen.findByRole('link', { name: 'Outlets' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Staff' })).not.toBeInTheDocument();
    view.unmount();

    renderRoutes(routes, '/staff');
    expect(await screen.findByText('Access denied')).toBeInTheDocument();
    expect(requests.some((request) => request.url.startsWith('/staff'))).toBe(false);
  });

  it('shows the Staff navigation item to HQ administrators', async () => {
    signInAs('HQ_ADMIN');
    mockApi((config) => ok(config, me('HQ_ADMIN')));
    renderRoutes(routes, '/dashboard');
    expect(await screen.findByRole('link', { name: 'Staff' })).toHaveAttribute('href', '/staff');
  });
});
