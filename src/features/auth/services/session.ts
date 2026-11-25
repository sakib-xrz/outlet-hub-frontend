import { toast } from 'sonner';
import { attachAuthInterceptors } from '@/lib/api/auth-interceptors';
import { apiClient } from '@/lib/api/client';
import { normalizeApiError } from '@/lib/api/errors';
import { queryClient } from '@/lib/query/client';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import type { LoginCredentials, SessionPayload, User } from '@/features/auth/types/auth.types';

const AUTH_LOCK_NAME = 'outlethub:auth';
const AUTH_CHANNEL_NAME = 'outlethub:auth';
const SESSION_HINT_KEY = 'outlethub:session-hint';
const EXPIRY_SKEW_MS = 30_000;

type AuthBroadcast = { type: 'login' } | { type: 'logout' };
type EndReason = 'logout' | 'expired' | 'remote-logout';

let started = false;
let channel: BroadcastChannel | null = null;
let initialization: Promise<void> | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let sessionController = new AbortController();
let localLockQueue: Promise<unknown> = Promise.resolve();

const store = () => useAuthStore.getState();

function withAuthLock<T>(task: () => Promise<T>): Promise<T> {
  if ('locks' in navigator) return navigator.locks.request(AUTH_LOCK_NAME, task);
  const run = localLockQueue.then(task, task);
  localLockQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function hasSessionHint(): boolean {
  try {
    return localStorage.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return true;
  }
}

function setSessionHint(active: boolean): void {
  try {
    if (active) localStorage.setItem(SESSION_HINT_KEY, '1');
    else localStorage.removeItem(SESSION_HINT_KEY);
  } catch {
    // Storage can be unavailable (privacy mode); the hint only avoids a needless refresh call.
  }
}

function broadcast(message: AuthBroadcast): void {
  channel?.postMessage(message);
}

function resetSessionScope(): void {
  sessionController.abort();
  sessionController = new AbortController();
  queryClient.clear();
}

function startSession(payload: SessionPayload): void {
  resetSessionScope();
  store().setSession(payload, { newEpoch: true });
  setSessionHint(true);
}

function endSession(reason: EndReason): void {
  const wasAuthenticated = store().status === 'authenticated';
  resetSessionScope();
  store().clearSession();
  setSessionHint(false);

  if (reason !== 'remote-logout' && wasAuthenticated) broadcast({ type: 'logout' });
  if (!wasAuthenticated) return;
  if (reason === 'expired') {
    toast.error('Your session has expired. Please sign in again.', { id: 'session-ended' });
  } else if (reason === 'remote-logout') {
    toast.info('You were signed out in another tab.', { id: 'session-ended' });
  }
}

async function runRefresh(): Promise<string | null> {
  const epoch = store().epoch;
  return withAuthLock(async () => {
    if (store().epoch !== epoch) return store().accessToken;
    try {
      const payload = await authService.refresh();
      if (store().epoch !== epoch) return store().accessToken;

      const currentUser = store().user;
      if (currentUser && currentUser.id !== payload.user.id) {
        startSession(payload);
      } else {
        store().setSession(payload);
        setSessionHint(true);
      }
      return payload.accessToken;
    } catch (error) {
      const apiError = normalizeApiError(error);
      if (apiError.kind !== 'session_expired') throw apiError;
      if (store().epoch === epoch) endSession('expired');
      return null;
    }
  });
}

export function refreshSession(): Promise<string | null> {
  refreshInFlight ??= runRefresh().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function restoreSession(): Promise<void> {
  if (!hasSessionHint()) {
    store().clearSession();
    return;
  }
  try {
    await refreshSession();
  } catch {
    store().clearSession({ restoreFailed: true });
  }
}

export function initializeSession(): Promise<void> {
  initialization ??= restoreSession();
  return initialization;
}

export function retrySessionRestore(): Promise<void> {
  store().beginRestore();
  initialization = restoreSession();
  return initialization;
}

export async function login(credentials: LoginCredentials): Promise<User> {
  const payload = await withAuthLock(() => authService.login(credentials));
  startSession(payload);
  broadcast({ type: 'login' });
  return payload.user;
}

export async function logout(): Promise<void> {
  endSession('logout');
  await withAuthLock(() => authService.logout());
}

function handleBroadcast(event: MessageEvent<AuthBroadcast>): void {
  if (event.data.type === 'logout') {
    if (store().status !== 'unauthenticated') endSession('remote-logout');
    return;
  }
  refreshSession().catch((error: unknown) => {
    if (import.meta.env.DEV) {
      console.warn('Cross-tab session sync failed:', normalizeApiError(error).kind);
    }
  });
}

export function startAuthSession(): Promise<void> {
  if (!started) {
    started = true;
    attachAuthInterceptors(apiClient, {
      getAccessToken: () => store().accessToken,
      isAccessTokenExpiring: () => {
        const { accessToken, expiresAt } = store();
        return !!accessToken && expiresAt !== null && expiresAt - Date.now() < EXPIRY_SKEW_MS;
      },
      refreshSession,
      getSessionSignal: () => sessionController.signal,
    });
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
      channel.onmessage = handleBroadcast;
    }
  }
  return initializeSession();
}
