import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { sessionBody } from '../../helpers/http';

function storageContents(storage: Storage): string {
  return Array.from({ length: storage.length }, (_, index) => {
    const key = storage.key(index) ?? '';
    return `${key}=${storage.getItem(key) ?? ''}`;
  }).join(';');
}

const payload = { ...sessionBody('token').data, tokenType: 'Bearer' as const };

describe('auth store', () => {
  beforeEach(() => useAuthStore.setState(useAuthStore.getInitialState(), true));

  it('starts in the initializing state with no credentials', () => {
    expect(useAuthStore.getState()).toMatchObject({
      status: 'initializing',
      accessToken: null,
      user: null,
    });
  });

  it('stores the session in memory with an absolute expiry', () => {
    const before = Date.now();
    useAuthStore.getState().setSession(payload);
    const state = useAuthStore.getState();
    expect(state).toMatchObject({ status: 'authenticated', accessToken: 'token', epoch: 0 });
    expect(state.expiresAt).toBeGreaterThanOrEqual(before + 900_000);
  });

  it('advances the epoch on session boundaries only', () => {
    const { setSession, clearSession } = useAuthStore.getState();
    setSession(payload, { newEpoch: true });
    setSession(payload);
    expect(useAuthStore.getState().epoch).toBe(1);
    clearSession();
    expect(useAuthStore.getState()).toMatchObject({
      status: 'unauthenticated',
      epoch: 2,
      user: null,
    });
  });

  it('never writes credentials to browser storage', () => {
    useAuthStore.getState().setSession(payload);
    expect(storageContents(localStorage)).not.toContain('token');
    expect(storageContents(sessionStorage)).not.toContain('token');
  });
});
