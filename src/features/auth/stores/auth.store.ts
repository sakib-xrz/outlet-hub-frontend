import { create } from 'zustand';
import type { AuthStatus, SessionPayload, User } from '@/features/auth/types/auth.types';

type AuthState = {
  status: AuthStatus;
  user: User | null;
  accessToken: string | null;
  expiresAt: number | null;
  epoch: number;
  restoreFailed: boolean;
};

type AuthActions = {
  setSession: (payload: SessionPayload, options?: { newEpoch?: boolean }) => void;
  clearSession: (options?: { restoreFailed?: boolean }) => void;
  beginRestore: () => void;
};

export const useAuthStore = create<AuthState & AuthActions>()((set) => ({
  status: 'initializing',
  user: null,
  accessToken: null,
  expiresAt: null,
  epoch: 0,
  restoreFailed: false,

  setSession: ({ accessToken, expiresIn, user }, { newEpoch = false } = {}) =>
    set((state) => ({
      status: 'authenticated',
      user,
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      epoch: newEpoch ? state.epoch + 1 : state.epoch,
      restoreFailed: false,
    })),

  clearSession: ({ restoreFailed = false } = {}) =>
    set((state) => ({
      status: 'unauthenticated',
      user: null,
      accessToken: null,
      expiresAt: null,
      epoch: state.epoch + 1,
      restoreFailed,
    })),

  beginRestore: () => set({ status: 'initializing', restoreFailed: false }),
}));
