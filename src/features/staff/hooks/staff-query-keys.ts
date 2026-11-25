import type { StaffFilters } from '@/features/staff/types/staff.types';

export const staffKeys = {
  all: ['staff'] as const,
  lists: () => [...staffKeys.all, 'list'] as const,
  list: (filters: StaffFilters) => [...staffKeys.lists(), filters] as const,
  details: () => [...staffKeys.all, 'detail'] as const,
  detail: (staffId: string) => [...staffKeys.details(), staffId] as const,
};
