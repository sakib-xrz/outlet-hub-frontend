import { Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { useSessionUser } from '@/features/auth/hooks/use-session';
import type { Role } from '@/features/auth/types/auth.types';

export function RoleGuard({ allow }: { allow: readonly Role[] }) {
  const user = useSessionUser();
  const location = useLocation();
  if (!user || !allow.includes(user.role)) {
    const fromLogin =
      typeof location.state === 'object' &&
      location.state !== null &&
      (location.state as Record<string, unknown>).fromLogin === true;
    return <Navigate to={fromLogin ? ROUTES.dashboard : ROUTES.unauthorized} replace />;
  }
  return <Outlet />;
}
