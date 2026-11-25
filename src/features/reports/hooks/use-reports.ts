import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { reportKeys } from '@/features/reports/hooks/report-query-keys';
import { reportService } from '@/features/reports/services/report.service';
import type { ReportRange } from '@/features/reports/types/report.types';

export function useSummaryQuery(range: ReportRange) {
  return useQuery({
    queryKey: reportKeys.summary(range),
    queryFn: ({ signal }) => reportService.summary(range, signal),
    placeholderData: keepPreviousData,
  });
}

export function useRevenueByOutletQuery(range: ReportRange, page: number) {
  return useQuery({
    queryKey: reportKeys.revenueByOutlet(range, { page }),
    queryFn: ({ signal }) => reportService.revenueByOutlet(range, page, signal),
    placeholderData: keepPreviousData,
  });
}

export function useTopSellingQuery(outletId: string | undefined, range: ReportRange) {
  return useQuery({
    queryKey: reportKeys.topSelling(outletId ?? '', range),
    queryFn: ({ signal }) => reportService.topSelling(outletId ?? '', range, signal),
    enabled: Boolean(outletId),
  });
}
