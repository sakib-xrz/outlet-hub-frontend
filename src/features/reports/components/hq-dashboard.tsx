import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { ReportDateFilter } from '@/features/reports/components/report-date-filter';
import { RevenueByOutletTable } from '@/features/reports/components/revenue-by-outlet-table';
import { SummaryCards } from '@/features/reports/components/summary-cards';
import { TopSellingItems } from '@/features/reports/components/top-selling-items';
import { reportKeys } from '@/features/reports/hooks/report-query-keys';
import { useReportFilters } from '@/features/reports/hooks/use-report-filters';
import { useRevenueByOutletQuery, useSummaryQuery } from '@/features/reports/hooks/use-reports';
import { describeRange, resolveRange } from '@/features/reports/utils/report-range';

export function HqDashboard() {
  const queryClient = useQueryClient();
  const { filters, setFilters } = useReportFilters();
  const resolved = resolveRange(filters.period, filters);
  const { range } = resolved;
  const summary = useSummaryQuery(range);
  const revenue = useRevenueByOutletQuery(range, filters.page);
  const refreshing = useIsFetching({ queryKey: reportKeys.all }) > 0;
  const outletId = filters.outlet ?? revenue.data?.items[0]?.outletId;

  return (
    <div className="flex flex-col gap-6">
      <ReportDateFilter
        key={`${filters.period}:${filters.from ?? ''}:${filters.to ?? ''}`}
        filters={filters}
        periodLabel={describeRange(resolved)}
        refreshing={refreshing}
        onChange={setFilters}
        onRefresh={() => void queryClient.invalidateQueries({ queryKey: reportKeys.all })}
      />
      <SummaryCards
        summary={summary.data}
        isPending={summary.isPending}
        error={summary.error}
        onRetry={() => void summary.refetch()}
      />
      <RevenueByOutletTable
        data={revenue.data}
        isPending={revenue.isPending}
        error={revenue.error}
        selectedOutletId={outletId}
        onRetry={() => void revenue.refetch()}
        onPageChange={(page) => setFilters({ page })}
        onSelectOutlet={(outlet) => setFilters({ outlet })}
      />
      <TopSellingItems
        outletId={outletId}
        range={range}
        onSelectOutlet={(outlet) => setFilters({ outlet })}
      />
    </div>
  );
}
