import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageLoader } from '@/components/shared/full-page-loader';
import { useAuthStatus } from '@/features/auth/hooks/use-session';
import { buildLoginPath } from '@/routes/login-path';

export function ProtectedRoute() {
  const status = useAuthStatus();
  const location = useLocation();

  if (status === 'initializing') return <FullPageLoader label="Restoring your session" />;
  if (status === 'unauthenticated') return <Navigate to={buildLoginPath(location)} replace />;
  return <Outlet />;
}
