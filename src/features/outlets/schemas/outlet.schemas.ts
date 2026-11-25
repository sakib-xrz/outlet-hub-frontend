import { z } from 'zod';

export const OUTLET_CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
export const OUTLET_PAGE_SIZE = 20;

export const outletSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const outletPageSchema = z.object({
  items: z.array(outletSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const outletPayloadSchema = z.object({ outlet: outletSchema });

const name = z
  .string()
  .trim()
  .min(1, 'Enter the outlet name.')
  .max(150, 'Name must be at most 150 characters.');

const address = z
  .string()
  .trim()
  .max(500, 'Address must be at most 500 characters.')
  .transform((value) => value || null);

export const createOutletFormSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Code must be at least 2 characters.')
    .max(20, 'Code must be at most 20 characters.')
    .regex(OUTLET_CODE_PATTERN, 'Use letters, numbers and single hyphens only.'),
  name,
  address,
});

export const updateOutletFormSchema = z.object({ name, address });

export const OUTLET_STATUS_FILTERS = ['all', 'active', 'inactive'] as const;
export const OUTLET_SORT_OPTIONS = {
  newest: { sortBy: 'createdAt', sortOrder: 'desc', label: 'Newest first' },
  oldest: { sortBy: 'createdAt', sortOrder: 'asc', label: 'Oldest first' },
  'name-asc': { sortBy: 'name', sortOrder: 'asc', label: 'Name A–Z' },
  'name-desc': { sortBy: 'name', sortOrder: 'desc', label: 'Name Z–A' },
  'code-asc': { sortBy: 'code', sortOrder: 'asc', label: 'Code A–Z' },
  updated: { sortBy: 'updatedAt', sortOrder: 'desc', label: 'Recently updated' },
} as const;

export const outletFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  search: z.string().trim().max(100).catch(''),
  status: z.enum(OUTLET_STATUS_FILTERS).catch('all'),
  sort: z
    .enum(Object.keys(OUTLET_SORT_OPTIONS) as [keyof typeof OUTLET_SORT_OPTIONS])
    .catch('newest'),
});
