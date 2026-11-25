import type { SaleFilters } from '@/features/sales/types/sale.types';

export const salesKeys = {
  all: ['sales'] as const,
  outlet: (outletId: string) => [...salesKeys.all, outletId] as const,
  lists: (outletId: string) => [...salesKeys.outlet(outletId), 'list'] as const,
  list: (outletId: string, filters: SaleFilters) =>
    [...salesKeys.lists(outletId), filters] as const,
  detail: (outletId: string, saleId: string) =>
    [...salesKeys.outlet(outletId), 'detail', saleId] as const,
  byRequest: (outletId: string, requestId: string) =>
    [...salesKeys.outlet(outletId), 'by-request', requestId] as const,
};
