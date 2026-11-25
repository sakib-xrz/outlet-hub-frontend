import { keepPreviousData, type QueryClient, useQuery } from '@tanstack/react-query';
import { inventoryKeys } from '@/features/inventory/hooks/inventory-query-keys';
import { outletMenuKeys } from '@/features/outlet-menu-items/hooks/outlet-menu-query-keys';
import { salesKeys } from '@/features/sales/hooks/sale-query-keys';
import { saleService } from '@/features/sales/services/sale.service';
import type { Sale, SaleFilters } from '@/features/sales/types/sale.types';

export function useSalesQuery(outletId: string, filters: SaleFilters) {
  return useQuery({
    queryKey: salesKeys.list(outletId, filters),
    queryFn: ({ signal }) => saleService.list(outletId, filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useSaleQuery(outletId: string, saleId: string) {
  return useQuery({
    queryKey: salesKeys.detail(outletId, saleId),
    queryFn: ({ signal }) => saleService.get(outletId, saleId, signal),
    staleTime: Infinity,
  });
}

export async function syncCompletedSale(queryClient: QueryClient, sale: Sale): Promise<void> {
  queryClient.setQueryData(salesKeys.detail(sale.outletId, sale.id), sale);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: salesKeys.lists(sale.outletId) }),
    queryClient.invalidateQueries({ queryKey: outletMenuKeys.outlet(sale.outletId) }),
    queryClient.invalidateQueries({ queryKey: inventoryKeys.outlet(sale.outletId) }),
  ]);
}
