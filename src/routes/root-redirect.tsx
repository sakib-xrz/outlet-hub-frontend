import { Navigate } from 'react-router';
import { FullPageLoader } from '@/components/shared/full-page-loader';
import { ROUTES } from '@/constants/routes';
import { useAuthStatus } from '@/features/auth/hooks/use-session';

export function RootRedirect() {
  const status = useAuthStatus();
  if (status === 'initializing') return <FullPageLoader label="Restoring your session" />;
  return <Navigate to={status === 'authenticated' ? ROUTES.dashboard : ROUTES.login} replace />;
}
