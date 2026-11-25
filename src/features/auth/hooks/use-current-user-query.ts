import { useQuery } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/hooks/auth-query-keys';
import { useAuthStatus } from '@/features/auth/hooks/use-session';
import { authService } from '@/features/auth/services/auth.service';

export function useCurrentUserQuery() {
  const status = useAuthStatus();
  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: ({ signal }) => authService.getCurrentUser(signal),
    enabled: status === 'authenticated',
    staleTime: 60_000,
  });
}
