import { z } from 'zod';
import { moneyResponseSchema, moneyTotalResponseSchema } from '@/lib/utils/money';

export const SALES_PAGE_SIZE = 20;
export const MAX_SALE_QUANTITY = 2_147_483_647;

export const saleLineSchema = z.object({
  menuItemId: z.uuid(),
  itemName: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: moneyResponseSchema,
  lineTotal: moneyTotalResponseSchema,
});

export const saleSchema = z.object({
  id: z.uuid(),
  outletId: z.uuid(),
  outletCode: z.string(),
  outletName: z.string(),
  receiptNumber: z.number().int().min(1),
  receiptCode: z.string(),
  requestId: z.uuid(),
  createdById: z.uuid(),
  totalAmount: moneyTotalResponseSchema,
  createdAt: z.iso.datetime(),
  items: z.array(saleLineSchema).min(1),
});

export const salePayloadSchema = z.object({ sale: saleSchema, replayed: z.boolean() });
export const saleDetailPayloadSchema = z.object({ sale: saleSchema });

export const saleSummarySchema = z.object({
  id: z.uuid(),
  receiptNumber: z.number().int(),
  receiptCode: z.string(),
  totalAmount: moneyTotalResponseSchema,
  lineCount: z.number().int(),
  unitCount: z.number().int(),
  createdById: z.uuid(),
  createdAt: z.iso.datetime(),
});

export const salePageSchema = z.object({
  items: z.array(saleSummarySchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const SALE_SORT_OPTIONS = {
  newest: { sortBy: 'createdAt', sortOrder: 'desc', label: 'Newest first' },
  oldest: { sortBy: 'createdAt', sortOrder: 'asc', label: 'Oldest first' },
  'receipt-desc': {
    sortBy: 'receiptNumber',
    sortOrder: 'desc',
    label: 'Receipt number: high to low',
  },
  'total-desc': { sortBy: 'totalAmount', sortOrder: 'desc', label: 'Total: high to low' },
  'total-asc': { sortBy: 'totalAmount', sortOrder: 'asc', label: 'Total: low to high' },
} as const;

export const saleFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  search: z.string().trim().max(40).catch(''),
  sort: z.enum(Object.keys(SALE_SORT_OPTIONS) as [keyof typeof SALE_SORT_OPTIONS]).catch('newest'),
});

export const pendingCheckoutSchema = z.object({
  requestId: z.uuid(),
  createdAt: z.iso.datetime(),
  lines: z
    .array(
      z.object({
        menuItemId: z.uuid(),
        sku: z.string(),
        name: z.string(),
        quantity: z.number().int().min(1).max(MAX_SALE_QUANTITY),
        unitPrice: moneyResponseSchema,
      }),
    )
    .min(1),
});
