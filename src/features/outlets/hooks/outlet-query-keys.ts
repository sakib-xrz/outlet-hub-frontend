import type { OutletFilters } from '@/features/outlets/types/outlet.types';

export const outletKeys = {
  all: ['outlets'] as const,
  lists: () => [...outletKeys.all, 'list'] as const,
  list: (filters: OutletFilters) => [...outletKeys.lists(), filters] as const,
  details: () => [...outletKeys.all, 'detail'] as const,
  detail: (outletId: string) => [...outletKeys.details(), outletId] as const,
};
