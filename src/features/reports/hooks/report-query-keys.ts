import type { ReportRange } from '@/features/reports/types/report.types';

const rangeKey = (range: ReportRange) => ({ from: range?.from ?? null, to: range?.to ?? null });

export const reportKeys = {
  all: ['reports'] as const,
  summary: (range: ReportRange) => [...reportKeys.all, 'summary', rangeKey(range)] as const,
  revenueByOutlet: (range: ReportRange, filters: { page: number }) =>
    [...reportKeys.all, 'revenue-by-outlet', rangeKey(range), filters] as const,
  topSelling: (outletId: string, range: ReportRange) =>
    [...reportKeys.all, 'top-selling', outletId, rangeKey(range)] as const,
};
