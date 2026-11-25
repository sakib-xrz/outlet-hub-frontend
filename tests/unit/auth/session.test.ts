import type { InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { bearer, deferred, errorBody, failNetwork, respond, sessionBody } from '../../helpers/http';

type Handler = (config: InternalAxiosRequestConfig) => Promise<unknown>;

const SESSION_HINT_KEY = 'outlethub:session-hint';

async function loadTab() {
  vi.resetModules();
  const session = await import('@/features/auth/services/session');
  const { apiClient, authClient } = await import('@/lib/api/client');
  const { useAuthStore } = await import('@/features/auth/stores/auth.store');
  const { authService } = await import('@/features/auth/services/auth.service');
  const { queryClient } = await import('@/lib/query/client');

  const calls: string[] = [];
  const handlers: Record<string, Handler> = {};
  const route = (config: InternalAxiosRequestConfig) => {
    const path = config.url ?? '';
    calls.push(path);
    const handler = handlers[path];
    return (
      handler ? handler(config) : Promise.reject(new Error(`No handler for ${path}`))
    ) as never;
  };
  apiClient.defaults.adapter = route;
  authClient.defaults.adapter = route;

  const signIn = (accessToken: string, expiresIn = 900) =>
    useAuthStore
      .getState()
      .setSession(
        { ...sessionBody(accessToken).data, tokenType: 'Bearer', expiresIn },
        { newEpoch: true },
      );

  return { session, useAuthStore, authService, queryClient, calls, handlers, signIn };
}

describe('session initialization', () => {
  it('restores the session once even when initialization is invoked repeatedly', async () => {
    localStorage.setItem(SESSION_HINT_KEY, '1');
    const tab = await loadTab();
    tab.handlers['/auth/refresh'] = (config) => respond(config, 200, sessionBody('restored'));

    await Promise.all([
      tab.session.startAuthSession(),
      tab.session.initializeSession(),
      tab.session.initializeSession(),
    ]);

    expect(tab.calls).toEqual(['/auth/refresh']);
    expect(tab.useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      accessToken: 'restored',
    });
  });

  it('skips the refresh call when this browser has no session hint', async () => {
    const tab = await loadTab();
    await tab.session.initializeSession();
    expect(tab.calls).toEqual([]);
    expect(tab.useAuthStore.getState().status).toBe('unauthenticated');
  });

  it('treats a rejected refresh session as signed out and clears the hint', async () => {
    localStorage.setItem(SESSION_HINT_KEY, '1');
    const tab = await loadTab();
    tab.handlers['/auth/refresh'] = (config) =>
      respond(config, 401, errorBody('AUTHENTICATION_ERROR'));

    await tab.session.initializeSession();

    expect(tab.useAuthStore.getState()).toMatchObject({
      status: 'unauthenticated',
      restoreFailed: false,
    });
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBeNull();
  });

  it('keeps the session hint when restoration fails because of the network', async () => {
    localStorage.setItem(SESSION_HINT_KEY, '1');
    const tab = await loadTab();
    tab.handlers['/auth/refresh'] = failNetwork;

    await tab.session.initializeSession();

    expect(tab.useAuthStore.getState()).toMatchObject({
      status: 'unauthenticated',
      restoreFailed: true,
    });
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBe('1');
  });
});

describe('token refresh coordination', () => {
  it('coalesces concurrent refresh calls into a single request', async () => {
    const tab = await loadTab();
    tab.signIn('old');
    tab.handlers['/auth/refresh'] = (config) => respond(config, 200, sessionBody('new'));

    const tokens = await Promise.all([
      tab.session.refreshSession(),
      tab.session.refreshSession(),
      tab.session.refreshSession(),
    ]);

    expect(tokens).toEqual(['new', 'new', 'new']);
    expect(tab.calls).toEqual(['/auth/refresh']);
  });

  it('serves concurrent unauthorized requests with one refresh and replays each once', async () => {
    const tab = await loadTab();
    await tab.session.startAuthSession();
    tab.signIn('expired');
    tab.handlers['/auth/refresh'] = (config) => respond(config, 200, sessionBody('fresh'));
    tab.handlers['/auth/me'] = (config) =>
      bearer(config) === 'fresh'
        ? respond(config, 200, { success: true, message: 'ok', data: sessionBody('x').data })
        : respond(config, 401, errorBody('AUTHENTICATION_ERROR'));

    const users = await Promise.all([
      tab.authService.getCurrentUser(),
      tab.authService.getCurrentUser(),
      tab.authService.getCurrentUser(),
    ]);

    expect(users.map((user) => user.id)).toEqual(['user-1', 'user-1', 'user-1']);
    expect(tab.calls.filter((path) => path === '/auth/refresh')).toHaveLength(1);
    expect(tab.calls.filter((path) => path === '/auth/me')).toHaveLength(6);
  });

  it('ends the session and clears user data when another account is returned', async () => {
    const tab = await loadTab();
    tab.signIn('old');
    tab.queryClient.setQueryData(['auth', 'current-user'], { id: 'user-1' });
    tab.handlers['/auth/refresh'] = (config) => respond(config, 200, sessionBody('new', 'user-2'));

    await tab.session.refreshSession();

    expect(tab.queryClient.getQueryData(['auth', 'current-user'])).toBeUndefined();
    expect(tab.useAuthStore.getState().user?.id).toBe('user-2');
  });
});

describe('logout', () => {
  it('cannot be undone by a refresh that was already in flight', async () => {
    const tab = await loadTab();
    tab.signIn('old');
    const refreshResponse = deferred<undefined>();
    tab.handlers['/auth/refresh'] = async (config) => {
      await refreshResponse.promise;
      return respond(config, 200, sessionBody('resurrected'));
    };
    tab.handlers['/auth/logout'] = (config) =>
      respond(config, 200, { success: true, message: 'Logout successful', data: {} });

    const refresh = tab.session.refreshSession();
    await vi.waitFor(() => expect(tab.calls).toEqual(['/auth/refresh']));
    const logout = tab.session.logout();

    expect(tab.useAuthStore.getState().status).toBe('unauthenticated');
    expect(tab.calls).toEqual(['/auth/refresh']);

    refreshResponse.resolve(undefined);
    await Promise.all([refresh, logout]);

    expect(tab.calls).toEqual(['/auth/refresh', '/auth/logout']);
    expect(tab.useAuthStore.getState()).toMatchObject({
      status: 'unauthenticated',
      accessToken: null,
    });
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBeNull();
  });

  it('clears local state immediately even if the server cannot be reached', async () => {
    const tab = await loadTab();
    tab.signIn('token');
    tab.queryClient.setQueryData(['auth', 'current-user'], { id: 'user-1' });
    tab.handlers['/auth/logout'] = failNetwork;

    await expect(tab.session.logout()).rejects.toMatchObject({ kind: 'network' });
    expect(tab.useAuthStore.getState().status).toBe('unauthenticated');
    expect(tab.queryClient.getQueryData(['auth', 'current-user'])).toBeUndefined();
  });
});

describe('login', () => {
  it('starts a new session epoch and records the session hint', async () => {
    const tab = await loadTab();
    const epoch = tab.useAuthStore.getState().epoch;
    tab.handlers['/auth/login'] = (config) => respond(config, 200, sessionBody('signed-in'));

    const user = await tab.session.login({ email: 'admin@example.com', password: 'password123' });

    expect(user.email).toBe('admin@example.com');
    expect(tab.useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      epoch: epoch + 1,
    });
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBe('1');
  });
});
