import { useAuthStore } from '@/features/auth/stores/auth.store';

export const useAuthStatus = () => useAuthStore((state) => state.status);
export const useSessionUser = () => useAuthStore((state) => state.user);
export const useRestoreFailed = () => useAuthStore((state) => state.restoreFailed);
