import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { reportFiltersSchema } from '@/features/reports/schemas/report.schemas';
import type { ReportFilters } from '@/features/reports/types/report.types';

const DEFAULTS: ReportFilters = reportFiltersSchema.parse({});

function toParams(filters: ReportFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.period !== DEFAULTS.period) params.set('period', filters.period);
  if (filters.period === 'custom') {
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
  }
  if (filters.page !== 1) params.set('page', String(filters.page));
  if (filters.outlet) params.set('outlet', filters.outlet);
  return params;
}

export function useReportFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = reportFiltersSchema.parse(Object.fromEntries(searchParams));

  const setFilters = useCallback(
    (changes: Partial<ReportFilters>) => {
      setSearchParams((current) => {
        const previous = reportFiltersSchema.parse(Object.fromEntries(current));
        const rangeChanged = 'period' in changes || 'from' in changes || 'to' in changes;
        return toParams({ ...previous, ...(rangeChanged && { page: 1 }), ...changes });
      });
    },
    [setSearchParams],
  );

  return { filters, setFilters };
}
