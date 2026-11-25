import { z } from 'zod';

export const INVENTORY_PAGE_SIZE = 20;
export const LOW_STOCK_THRESHOLD = 10;
export const MAX_STOCK_QUANTITY = 2_147_483_647;

export const inventoryItemSchema = z.object({
  outletId: z.uuid(),
  menuItemId: z.uuid(),
  sku: z.string(),
  name: z.string(),
  stockQuantity: z.number().int().min(0),
  stockStatus: z.enum(['OUT_OF_STOCK', 'LOW', 'IN_STOCK']),
  isActive: z.boolean(),
  outletIsActive: z.boolean(),
  menuItemIsActive: z.boolean(),
  isEnabled: z.boolean(),
  isSellable: z.boolean(),
  updatedAt: z.iso.datetime(),
});

export const inventoryPageSchema = z.object({
  items: z.array(inventoryItemSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const inventoryItemPayloadSchema = z.object({ inventoryItem: inventoryItemSchema });

export const adjustmentResultSchema = z.object({
  inventoryItem: inventoryItemSchema,
  operation: z.enum(['INCREASE', 'DECREASE', 'SET']),
  previousStockQuantity: z.number().int(),
  newStockQuantity: z.number().int(),
  changed: z.boolean(),
});

export const ADJUSTMENT_OPERATIONS = ['INCREASE', 'DECREASE', 'SET'] as const;
export type AdjustmentOperation = (typeof ADJUSTMENT_OPERATIONS)[number];

const WHOLE_NUMBER = /^\d{1,10}$/;

export function resultingStock(
  current: number,
  operation: AdjustmentOperation,
  quantity: number,
): number {
  if (operation === 'SET') return quantity;
  return operation === 'INCREASE' ? current + quantity : current - quantity;
}

export function createAdjustmentSchema(currentStock: number) {
  return z
    .object({
      operation: z.enum(ADJUSTMENT_OPERATIONS),
      quantity: z
        .string()
        .trim()
        .min(1, 'Enter a quantity.')
        .regex(WHOLE_NUMBER, 'Enter a whole number with no sign or decimals.')
        .transform(Number),
    })
    .superRefine(({ operation, quantity }, context) => {
      const issue = (message: string) =>
        context.addIssue({ code: 'custom', path: ['quantity'], message });
      if (quantity > MAX_STOCK_QUANTITY) return issue('This quantity is too large.');
      if (operation !== 'SET' && quantity < 1) return issue('Enter at least 1.');
      const next = resultingStock(currentStock, operation, quantity);
      if (next < 0) return issue(`Only ${currentStock} in stock; you cannot remove ${quantity}.`);
      if (next > MAX_STOCK_QUANTITY) return issue('The resulting stock would exceed the maximum.');
    });
}

export const INVENTORY_SORT_OPTIONS = {
  'name-asc': { sortBy: 'name', sortOrder: 'asc', label: 'Name A–Z' },
  'sku-asc': { sortBy: 'sku', sortOrder: 'asc', label: 'SKU A–Z' },
  'stock-asc': { sortBy: 'stockQuantity', sortOrder: 'asc', label: 'Stock: low to high' },
  'stock-desc': { sortBy: 'stockQuantity', sortOrder: 'desc', label: 'Stock: high to low' },
  updated: { sortBy: 'updatedAt', sortOrder: 'desc', label: 'Recently updated' },
} as const;

export const inventoryFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  search: z.string().trim().max(100).catch(''),
  status: z.enum(['all', 'active', 'inactive']).catch('all'),
  stockStatus: z.enum(['all', 'out_of_stock', 'low', 'in_stock']).catch('all'),
  sort: z
    .enum(Object.keys(INVENTORY_SORT_OPTIONS) as [keyof typeof INVENTORY_SORT_OPTIONS])
    .catch('name-asc'),
});
