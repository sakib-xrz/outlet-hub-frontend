import type { InventoryFilters } from '@/features/inventory/types/inventory.types';

export const inventoryKeys = {
  all: ['inventory'] as const,
  outlet: (outletId: string) => [...inventoryKeys.all, outletId] as const,
  lists: (outletId: string) => [...inventoryKeys.outlet(outletId), 'list'] as const,
  list: (outletId: string, filters: InventoryFilters) =>
    [...inventoryKeys.lists(outletId), filters] as const,
  details: (outletId: string) => [...inventoryKeys.outlet(outletId), 'detail'] as const,
  detail: (outletId: string, menuItemId: string) =>
    [...inventoryKeys.details(outletId), menuItemId] as const,
};
