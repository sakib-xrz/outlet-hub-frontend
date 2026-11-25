import { useMutation } from '@tanstack/react-query';
import { login } from '@/features/auth/services/session';

export function useLogin() {
  return useMutation({ mutationFn: login, meta: { suppressErrorToast: true } });
}
