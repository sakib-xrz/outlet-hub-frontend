import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { logout } from '@/features/auth/services/session';

export function useLogout() {
  return useMutation({
    mutationFn: logout,
    meta: { suppressErrorToast: true },
    onError: () => {
      toast.warning(
        'You are signed out on this device, but the server could not confirm it. Sign in and out again when you are back online.',
        { id: 'logout-unconfirmed' },
      );
    },
  });
}
