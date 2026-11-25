import { Banknote, Package, ReceiptText, Store } from 'lucide-react';
import { ErrorState } from '@/components/shared/error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { BusinessSummary } from '@/features/reports/types/report.types';
import { formatCount } from '@/features/reports/utils/report-format';
import { formatMoney } from '@/lib/utils/money';

type SummaryCardsProps = {
  summary: BusinessSummary | undefined;
  isPending: boolean;
  error: Error | null;
  onRetry: () => void;
};

export function SummaryCards({ summary, isPending, error, onRetry }: SummaryCardsProps) {
  if (error && !summary) {
    return (
      <ErrorState
        className="rounded-lg border"
        title="Summary unavailable"
        description={error.message}
        onRetry={onRetry}
      />
    );
  }

  const cards = [
    {
      title: 'Total revenue',
      icon: Banknote,
      value: summary && formatMoney(summary.totalRevenue),
      note: 'Completed sales in the period',
    },
    {
      title: 'Sales',
      icon: ReceiptText,
      value: summary && formatCount(summary.totalSales),
      note: 'Receipts issued in the period',
    },
    {
      title: 'Units sold',
      icon: Package,
      value: summary && formatCount(summary.totalUnitsSold),
      note: 'Item quantities in the period',
    },
    {
      title: 'Active outlets',
      icon: Store,
      value:
        summary && `${formatCount(summary.activeOutlets)} of ${formatCount(summary.totalOutlets)}`,
      note: 'Current status, not for the period',
    },
  ];

  return (
    <section aria-label="Key figures" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ title, icon: Icon, value, note }) => (
        <Card key={title} className="gap-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon className="size-4" aria-hidden />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {isPending || value === undefined ? (
              <Skeleton className="h-8 w-32" role="status" aria-label={`Loading ${title}`} />
            ) : (
              <p className="text-2xl font-semibold tabular-nums" aria-label={`${title}: ${value}`}>
                {value}
              </p>
            )}
            <CardDescription>{note}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
