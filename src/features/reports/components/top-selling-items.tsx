import { PackageSearch, Search } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Spinner } from '@/components/shared/spinner';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOutletOptionsQuery } from '@/features/outlets/hooks/use-outlet-options-query';
import { useTopSellingQuery } from '@/features/reports/hooks/use-reports';
import type { ReportRange } from '@/features/reports/types/report.types';
import { formatCount } from '@/features/reports/utils/report-format';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { normalizeApiError } from '@/lib/api/errors';
import { formatMoney } from '@/lib/utils/money';

function OutletSelector({
  value,
  onSelect,
}: {
  value: string | undefined;
  onSelect: (outletId: string) => void;
}) {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const applySearch = useDebouncedCallback((next: string) => setSearch(next.trim()), 300);
  const options = useOutletOptionsQuery(search);
  const outlets = options.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={input}
          maxLength={100}
          className="pl-8"
          placeholder="Search outlets by code or name"
          aria-label="Search outlets for top items"
          onChange={(event) => {
            setInput(event.target.value);
            applySearch(event.target.value);
          }}
        />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-md border">
        {options.isPending ? (
          <div className="p-3" role="status" aria-label="Loading outlets">
            <Skeleton className="h-5 w-full" />
          </div>
        ) : options.isError ? (
          <ErrorState
            className="py-4"
            title="Outlets could not be loaded"
            description={options.error.message}
            onRetry={() => void options.refetch()}
          />
        ) : outlets.length === 0 ? (
          <p className="p-3 text-center text-sm text-muted-foreground">No outlets match.</p>
        ) : (
          <ul aria-label="Outlets for top items" className="divide-y">
            {outlets.map((outlet) => (
              <li key={outlet.id}>
                <button
                  type="button"
                  aria-pressed={outlet.id === value}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted aria-pressed:bg-muted"
                  onClick={() => onSelect(outlet.id)}
                >
                  <span className="font-mono text-xs font-medium">{outlet.code}</span>
                  <span className="truncate">{outlet.name}</span>
                  {!outlet.isActive && (
                    <span className="ml-auto text-xs text-muted-foreground">Inactive</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {options.hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            disabled={options.isFetchingNextPage}
            onClick={() => void options.fetchNextPage()}
          >
            {options.isFetchingNextPage && <Spinner />}
            Load more outlets
          </Button>
        )}
      </div>
    </div>
  );
}

type TopSellingItemsProps = {
  outletId: string | undefined;
  range: ReportRange;
  onSelectOutlet: (outletId: string) => void;
};

export function TopSellingItems({ outletId, range, onSelectOutlet }: TopSellingItemsProps) {
  const query = useTopSellingQuery(outletId, range);
  const error = query.error ? normalizeApiError(query.error) : null;
  const data = query.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 items</CardTitle>
        <CardDescription>
          Ranked by quantity sold in the period. Names and SKUs are the current menu labels.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <OutletSelector value={outletId} onSelect={onSelectOutlet} />
        <div className="flex min-w-0 flex-col gap-3">
          {!outletId ? (
            <EmptyState
              icon={PackageSearch}
              titleAs="h2"
              title="Choose an outlet"
              description="Select an outlet to see its best sellers."
            />
          ) : error ? (
            <ErrorState
              title={error.kind === 'not_found' ? 'Outlet not found' : 'Top items unavailable'}
              description={error.message}
              onRetry={() => void query.refetch()}
            />
          ) : !data ? (
            <div className="flex flex-col gap-2" role="status" aria-label="Loading top items">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{data.outlet.name}</h3>
                <span className="font-mono text-xs text-muted-foreground">{data.outlet.code}</span>
                <StatusBadge isActive={data.outlet.isActive} />
              </div>
              {data.items.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No items were sold at this outlet in the selected period.
                </p>
              ) : (
                <Table aria-label={`Top items for ${data.outlet.name}`}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => (
                      <TableRow key={item.menuItemId}>
                        <TableCell className="tabular-nums">{item.rank}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.name}</span>
                            <span className="font-mono text-xs text-muted-foreground">
                              {item.sku}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCount(item.quantitySold)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(item.totalRevenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
