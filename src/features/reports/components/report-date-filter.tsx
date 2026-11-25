import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Spinner } from '@/components/shared/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { REPORT_PERIODS } from '@/features/reports/schemas/report.schemas';
import type { ReportFilters, ReportPeriod } from '@/features/reports/types/report.types';
import {
  PERIOD_LABELS,
  customRangeError,
  resolveRange,
  toDay,
} from '@/features/reports/utils/report-range';

type ReportDateFilterProps = {
  filters: ReportFilters;
  periodLabel: string;
  refreshing: boolean;
  onChange: (changes: Partial<ReportFilters>) => void;
  onRefresh: () => void;
};

export function ReportDateFilter({
  filters,
  periodLabel,
  refreshing,
  onChange,
  onRefresh,
}: ReportDateFilterProps) {
  const [editing, setEditing] = useState(filters.period === 'custom');
  const fallback = resolveRange('30d');
  const [from, setFrom] = useState(filters.from ?? (fallback.start ? toDay(fallback.start) : ''));
  const [to, setTo] = useState(
    filters.to ?? (fallback.endInclusive ? toDay(fallback.endInclusive) : ''),
  );
  const [error, setError] = useState<string | null>(null);

  const choose = (period: ReportPeriod) => {
    if (period === 'custom') {
      setEditing(true);
      return;
    }
    setEditing(false);
    setError(null);
    onChange({ period, from: undefined, to: undefined });
  };

  const apply = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = customRangeError(from, to);
    setError(problem);
    if (!problem) onChange({ period: 'custom', from, to });
  };

  const selected = editing ? 'custom' : filters.period;

  return (
    <section aria-label="Reporting period" className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="group" aria-label="Period presets" className="flex flex-wrap gap-1.5">
          {REPORT_PERIODS.map((period) => (
            <Button
              key={period}
              type="button"
              size="sm"
              variant={selected === period ? 'default' : 'outline'}
              aria-pressed={selected === period}
              onClick={() => choose(period)}
            >
              {PERIOD_LABELS[period]}
            </Button>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? <Spinner /> : <RefreshCw aria-hidden />}
          Refresh
        </Button>
      </div>

      {editing && (
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={apply} noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-from">From</Label>
            <Input
              id="report-from"
              type="date"
              value={from}
              aria-invalid={error !== null}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="report-to">To (inclusive)</Label>
            <Input
              id="report-to"
              type="date"
              value={to}
              aria-invalid={error !== null}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          <Button type="submit" size="sm">
            Apply range
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing <span className="font-medium text-foreground">{periodLabel}</span> in your local
        time zone. Amounts in BDT.
      </p>
    </section>
  );
}
