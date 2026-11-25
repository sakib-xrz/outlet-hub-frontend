import { z } from 'zod';

export const REVENUE_PAGE_SIZE = 10;
export const REPORT_PERIODS = ['today', '7d', '30d', 'month', 'all', 'custom'] as const;

export const aggregateMoneySchema = z.string().regex(/^\d+\.\d{2}$/);
export const integerStringSchema = z.string().regex(/^\d+$/);

export const businessSummarySchema = z.object({
  totalRevenue: aggregateMoneySchema,
  totalSales: integerStringSchema,
  totalUnitsSold: integerStringSchema,
  totalOutlets: z.number().int().nonnegative(),
  activeOutlets: z.number().int().nonnegative(),
});

export const outletRevenueSchema = z.object({
  outletId: z.uuid(),
  outletCode: z.string(),
  outletName: z.string(),
  isActive: z.boolean(),
  totalRevenue: aggregateMoneySchema,
  totalSales: integerStringSchema,
});

export const revenueByOutletPageSchema = z.object({
  items: z.array(outletRevenueSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const topSellingSchema = z.object({
  outlet: z.object({ id: z.uuid(), code: z.string(), name: z.string(), isActive: z.boolean() }),
  items: z.array(
    z.object({
      rank: z.number().int().positive(),
      menuItemId: z.uuid(),
      sku: z.string(),
      name: z.string(),
      quantitySold: integerStringSchema,
      totalRevenue: aggregateMoneySchema,
    }),
  ),
});

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const reportFiltersSchema = z.object({
  period: z.enum(REPORT_PERIODS).catch('30d'),
  from: isoDay.optional().catch(undefined),
  to: isoDay.optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  outlet: z.uuid().optional().catch(undefined),
});
