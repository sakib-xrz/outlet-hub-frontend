import { LayoutDashboard, type LucideIcon } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { ROLES } from '@/features/auth/constants';
import type { Role } from '@/features/auth/types/auth.types';

export type NavigationItem = {
  title: string;
  to: string;
  icon: LucideIcon;
  roles: readonly Role[];
};

export const NAVIGATION: readonly NavigationItem[] = [
  {
    title: 'Dashboard',
    to: ROUTES.dashboard,
    icon: LayoutDashboard,
    roles: [ROLES.HQ_ADMIN, ROLES.OUTLET_STAFF],
  },
];
