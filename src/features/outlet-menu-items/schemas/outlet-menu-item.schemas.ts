import { z } from 'zod';
import { moneyInputSchema, moneyResponseSchema } from '@/lib/utils/money';

export const OUTLET_MENU_PAGE_SIZE = 20;

export const outletMenuItemSchema = z.object({
  outletId: z.uuid(),
  menuItemId: z.uuid(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  basePrice: moneyResponseSchema,
  overridePrice: moneyResponseSchema.nullable(),
  effectivePrice: moneyResponseSchema,
  priceSource: z.enum(['BASE', 'OVERRIDE']),
  stockQuantity: z.number().int(),
  isActive: z.boolean(),
  outletIsActive: z.boolean(),
  menuItemIsActive: z.boolean(),
  isEnabled: z.boolean(),
  isSellable: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const outletMenuPageSchema = z.object({
  items: z.array(outletMenuItemSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const outletMenuItemPayloadSchema = z.object({ outletMenuItem: outletMenuItemSchema });

export const priceFormSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('inherit'), customPrice: z.string() }),
  z.object({ mode: z.literal('custom'), customPrice: moneyInputSchema }),
]);

export const OUTLET_MENU_SORT_OPTIONS = {
  'name-asc': { sortBy: 'name', sortOrder: 'asc', label: 'Name A–Z' },
  'name-desc': { sortBy: 'name', sortOrder: 'desc', label: 'Name Z–A' },
  'sku-asc': { sortBy: 'sku', sortOrder: 'asc', label: 'SKU A–Z' },
  newest: { sortBy: 'createdAt', sortOrder: 'desc', label: 'Recently assigned' },
  updated: { sortBy: 'updatedAt', sortOrder: 'desc', label: 'Recently updated' },
} as const;

export const outletMenuFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  search: z.string().trim().max(100).catch(''),
  status: z.enum(['all', 'active', 'inactive']).catch('all'),
  sort: z
    .enum(Object.keys(OUTLET_MENU_SORT_OPTIONS) as [keyof typeof OUTLET_MENU_SORT_OPTIONS])
    .catch('name-asc'),
});
