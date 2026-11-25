import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RevenueByOutletChart } from '@/features/reports/components/revenue-by-outlet-chart';
import type { RevenueByOutletPage } from '@/features/reports/types/report.types';
import { formatCount } from '@/features/reports/utils/report-format';
import { formatMoney } from '@/lib/utils/money';

type RevenueByOutletTableProps = {
  data: RevenueByOutletPage | undefined;
  isPending: boolean;
  error: Error | null;
  selectedOutletId: string | undefined;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onSelectOutlet: (outletId: string) => void;
};

export function RevenueByOutletTable({
  data,
  isPending,
  error,
  selectedOutletId,
  onRetry,
  onPageChange,
  onSelectOutlet,
}: RevenueByOutletTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by outlet</CardTitle>
        <CardDescription>
          Every outlet, including inactive outlets and outlets without sales, highest revenue first.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error && !data ? (
          <ErrorState
            title="Revenue by outlet unavailable"
            description={error.message}
            onRetry={onRetry}
          />
        ) : isPending || !data ? (
          <div className="flex flex-col gap-2" role="status" aria-label="Loading revenue by outlet">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-6 w-full" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            titleAs="h2"
            title="No outlets yet"
            description="Create an outlet to see its revenue here."
          />
        ) : (
          <>
            <RevenueByOutletChart items={data.items} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((row) => (
                  <TableRow key={row.outletId}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{row.outletName}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {row.outletCode}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge isActive={row.isActive} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(row.totalSales)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(row.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-pressed={selectedOutletId === row.outletId}
                        aria-label={`Show top items for ${row.outletName}`}
                        onClick={() => onSelectOutlet(row.outletId)}
                      >
                        Top items
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationBar
              label="Revenue by outlet pages"
              pagination={data.pagination}
              itemCount={data.items.length}
              onPageChange={onPageChange}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
