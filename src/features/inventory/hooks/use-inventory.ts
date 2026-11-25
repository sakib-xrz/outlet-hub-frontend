import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryKeys } from '@/features/inventory/hooks/inventory-query-keys';
import { inventoryService } from '@/features/inventory/services/inventory.service';
import type { InventoryFilters, StockAdjustment } from '@/features/inventory/types/inventory.types';
import { outletMenuKeys } from '@/features/outlet-menu-items/hooks/outlet-menu-query-keys';

export function useInventoryQuery(outletId: string, filters: InventoryFilters) {
  return useQuery({
    queryKey: inventoryKeys.list(outletId, filters),
    queryFn: ({ signal }) => inventoryService.list(outletId, filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useAdjustStock(outletId: string, menuItemId: string) {
  const queryClient = useQueryClient();

  const refreshOutlet = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: inventoryKeys.outlet(outletId) }),
      queryClient.invalidateQueries({ queryKey: outletMenuKeys.outlet(outletId) }),
    ]);

  const mutation = useMutation({
    mutationFn: (adjustment: StockAdjustment) =>
      inventoryService.adjust(outletId, menuItemId, adjustment),
    meta: { suppressErrorToast: true },
    onSuccess: async (result) => {
      queryClient.setQueryData(inventoryKeys.detail(outletId, menuItemId), result.inventoryItem);
      await refreshOutlet();
    },
  });

  const fetchLatest = () =>
    queryClient.query({
      queryKey: inventoryKeys.detail(outletId, menuItemId),
      queryFn: ({ signal }) => inventoryService.get(outletId, menuItemId, signal),
      staleTime: 0,
    });

  return { mutation, refreshOutlet, fetchLatest };
}
