import { roleSchema } from '@/features/auth/schemas/auth.schemas';

export const ROLES = roleSchema.enum;

export const ROLE_LABELS = {
  HQ_ADMIN: 'HQ Administrator',
  OUTLET_STAFF: 'Outlet Staff',
} as const satisfies Record<keyof typeof ROLES, string>;
