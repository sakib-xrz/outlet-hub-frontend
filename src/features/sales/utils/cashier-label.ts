import type { User } from '@/features/auth/types/auth.types';

export function cashierLabel(createdById: string, currentUser: User | null): string {
  return currentUser?.id === createdById ? currentUser.email : `Staff ${createdById.slice(0, 8)}`;
}
