import { z } from 'zod';
import { moneyInputSchema, moneyResponseSchema } from '@/lib/utils/money';

export const MENU_ITEM_PAGE_SIZE = 20;
export const MENU_ITEM_SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export const menuItemSchema = z.object({
  id: z.uuid(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  basePrice: moneyResponseSchema,
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const menuItemPageSchema = z.object({
  items: z.array(menuItemSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const menuItemPayloadSchema = z.object({ menuItem: menuItemSchema });

const name = z
  .string()
  .trim()
  .min(1, 'Enter the item name.')
  .max(150, 'Name must be at most 150 characters.');

const description = z
  .string()
  .trim()
  .max(1000, 'Description must be at most 1000 characters.')
  .transform((value) => value || null);

export const menuItemFormSchema = z.object({
  sku: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Enter a SKU.')
    .max(50, 'SKU must be at most 50 characters.')
    .regex(MENU_ITEM_SKU_PATTERN, 'Use letters, numbers and single hyphens only.'),
  name,
  description,
  basePrice: moneyInputSchema,
});

export const MENU_ITEM_SORT_OPTIONS = {
  newest: { sortBy: 'createdAt', sortOrder: 'desc', label: 'Newest first' },
  oldest: { sortBy: 'createdAt', sortOrder: 'asc', label: 'Oldest first' },
  'name-asc': { sortBy: 'name', sortOrder: 'asc', label: 'Name A–Z' },
  'sku-asc': { sortBy: 'sku', sortOrder: 'asc', label: 'SKU A–Z' },
  'price-asc': { sortBy: 'basePrice', sortOrder: 'asc', label: 'Price: low to high' },
  'price-desc': { sortBy: 'basePrice', sortOrder: 'desc', label: 'Price: high to low' },
  updated: { sortBy: 'updatedAt', sortOrder: 'desc', label: 'Recently updated' },
} as const;

export const menuItemFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  search: z.string().trim().max(100).catch(''),
  status: z.enum(['all', 'active', 'inactive']).catch('all'),
  sort: z
    .enum(Object.keys(MENU_ITEM_SORT_OPTIONS) as [keyof typeof MENU_ITEM_SORT_OPTIONS])
    .catch('newest'),
});
