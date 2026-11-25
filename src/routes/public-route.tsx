import { Navigate, Outlet, useSearchParams } from 'react-router';
import { FullPageLoader } from '@/components/shared/full-page-loader';
import { REDIRECT_PARAM } from '@/constants/routes';
import { useAuthStatus } from '@/features/auth/hooks/use-session';
import { getSafeRedirect } from '@/lib/utils/safe-redirect';

export function PublicRoute() {
  const status = useAuthStatus();
  const [searchParams] = useSearchParams();

  if (status === 'initializing') return <FullPageLoader label="Restoring your session" />;
  if (status === 'authenticated') {
    return <Navigate to={getSafeRedirect(searchParams.get(REDIRECT_PARAM))} replace />;
  }
  return <Outlet />;
}
