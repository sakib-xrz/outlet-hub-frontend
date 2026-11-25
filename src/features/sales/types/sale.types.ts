import type { z } from 'zod';
import type {
  pendingCheckoutSchema,
  saleFiltersSchema,
  saleLineSchema,
  salePageSchema,
  saleSchema,
  saleSummarySchema,
} from '@/features/sales/schemas/sale.schemas';

export type Sale = z.infer<typeof saleSchema>;
export type SaleLine = z.infer<typeof saleLineSchema>;
export type SaleSummary = z.infer<typeof saleSummarySchema>;
export type SalePage = z.infer<typeof salePageSchema>;
export type SaleFilters = z.infer<typeof saleFiltersSchema>;
export type PendingCheckout = z.infer<typeof pendingCheckoutSchema>;
export type CreateSalePayload = {
  requestId: string;
  items: { menuItemId: string; quantity: number; expectedUnitPrice: string }[];
};
export type SaleResult = { sale: Sale; replayed: boolean };
