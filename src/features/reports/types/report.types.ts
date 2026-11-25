import type { z } from 'zod';
import type {
  REPORT_PERIODS,
  businessSummarySchema,
  outletRevenueSchema,
  reportFiltersSchema,
  revenueByOutletPageSchema,
  topSellingSchema,
} from '@/features/reports/schemas/report.schemas';

export type ReportPeriod = (typeof REPORT_PERIODS)[number];
export type ReportFilters = z.infer<typeof reportFiltersSchema>;
export type BusinessSummary = z.infer<typeof businessSummarySchema>;
export type OutletRevenue = z.infer<typeof outletRevenueSchema>;
export type RevenueByOutletPage = z.infer<typeof revenueByOutletPageSchema>;
export type TopSelling = z.infer<typeof topSellingSchema>;

export type ReportRange = { from: string; to: string } | null;
