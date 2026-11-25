import { Navigate, Outlet } from 'react-router';
import { ROUTES } from '@/constants/routes';
import { useSessionUser } from '@/features/auth/hooks/use-session';
import type { Role } from '@/features/auth/types/auth.types';

export function RoleGuard({ allow }: { allow: readonly Role[] }) {
  const user = useSessionUser();
  if (!user || !allow.includes(user.role)) return <Navigate to={ROUTES.unauthorized} replace />;
  return <Outlet />;
}
