import type { OutletMenuFilters } from '@/features/outlet-menu-items/types/outlet-menu-item.types';

export const outletMenuKeys = {
  all: ['outlet-menu'] as const,
  outlet: (outletId: string) => [...outletMenuKeys.all, outletId] as const,
  lists: (outletId: string) => [...outletMenuKeys.outlet(outletId), 'list'] as const,
  list: (outletId: string, filters: OutletMenuFilters) =>
    [...outletMenuKeys.lists(outletId), filters] as const,
  details: (outletId: string) => [...outletMenuKeys.outlet(outletId), 'detail'] as const,
  detail: (outletId: string, menuItemId: string) =>
    [...outletMenuKeys.details(outletId), menuItemId] as const,
};
