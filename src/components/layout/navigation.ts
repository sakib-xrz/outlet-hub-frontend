import { LayoutDashboard, type LucideIcon, Store, Users, UtensilsCrossed } from 'lucide-react';
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
  {
    title: 'Outlets',
    to: ROUTES.outlets,
    icon: Store,
    roles: [ROLES.HQ_ADMIN, ROLES.OUTLET_STAFF],
  },
  {
    title: 'Staff',
    to: ROUTES.staff,
    icon: Users,
    roles: [ROLES.HQ_ADMIN],
  },
  {
    title: 'Master Menu',
    to: ROUTES.menuItems,
    icon: UtensilsCrossed,
    roles: [ROLES.HQ_ADMIN],
  },
];
