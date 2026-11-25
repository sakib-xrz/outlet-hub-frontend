import { ArrowLeft, ReceiptText, Search, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useIsHqAdmin } from '@/features/auth/hooks/use-session';
import { useOutletQuery } from '@/features/outlets/hooks/use-outlet-query';
import { useSaleFilters } from '@/features/sales/hooks/use-sale-filters';
import { useSalesQuery } from '@/features/sales/hooks/use-sales';
import { SALE_SORT_OPTIONS, saleFiltersSchema } from '@/features/sales/schemas/sale.schemas';
import { normalizeApiError } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/utils/format';
import { formatMoney } from '@/lib/utils/money';

export function OutletSalesPage() {
  const { outletId = '' } = useParams();
  const isHq = useIsHqAdmin();
  const outlet = useOutletQuery(outletId);
  const { filters, setFilters } = useSaleFilters();
  const sales = useSalesQuery(outletId, filters);
  const [search, setSearch] = useState(filters.search);
  const applySearch = useDebouncedCallback((value: string) => {
    setFilters({ search: value.trim() }, { replace: true });
  }, 300);

  if (outlet.isError && normalizeApiError(outlet.error).kind === 'forbidden') {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No access to this outlet"
        description="This outlet is not assigned to your account or is currently inactive."
        action={
          <Button asChild variant="outline">
            <Link to="/outlets">Back to outlets</Link>
          </Button>
        }
      />
    );
  }

  return (
    <PageContainer
      title={outlet.data ? `${outlet.data.name} sales` : 'Sales history'}
      description="Completed sales and their receipts for this outlet."
      actions={
        !isHq &&
        outlet.data?.isActive && (
          <Button asChild>
            <Link to={`/outlets/${outletId}/pos`}>Open POS</Link>
          </Button>
        )
      }
    >
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to={`/outlets/${outletId}`}>
          <ArrowLeft aria-hidden />
          Outlet details
        </Link>
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={search}
            maxLength={40}
            placeholder="Receipt number, e.g. 101"
            aria-label="Search by receipt number"
            className="pl-8"
            onChange={(event) => {
              setSearch(event.target.value);
              applySearch(event.target.value);
            }}
          />
        </div>
        <Select
          value={filters.sort}
          onValueChange={(value) => setFilters({ sort: saleFiltersSchema.shape.sort.parse(value) })}
        >
          <SelectTrigger className="w-full sm:w-56" aria-label="Sort sales">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SALE_SORT_OPTIONS).map(([value, option]) => (
              <SelectItem key={value} value={value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {sales.isPending ? (
        <div className="space-y-3 rounded-lg border p-4" role="status" aria-label="Loading sales">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-6 w-full" />
          ))}
        </div>
      ) : sales.isError ? (
        <ErrorState
          title="Sales could not be loaded"
          description={sales.error.message}
          onRetry={() => void sales.refetch()}
        />
      ) : sales.data.items.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          titleAs="h2"
          title={
            sales.data.pagination.total > 0
              ? 'No sales on this page'
              : filters.search
                ? 'No matching receipt'
                : 'No sales yet'
          }
          description={
            sales.data.pagination.total > 0
              ? 'This page is past the end of the results.'
              : filters.search
                ? 'Check the receipt number and try again.'
                : 'Completed sales will appear here.'
          }
          action={
            sales.data.pagination.total > 0 ? (
              <Button variant="outline" onClick={() => setFilters({ page: 1 })}>
                Go to first page
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4" aria-busy={sales.isFetching}>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="hidden md:table-cell">Date</TableHead>
                  <TableHead className="text-right">Items / units</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-20 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.data.items.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-xs font-medium">
                      {sale.receiptCode}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {formatDateTime(sale.createdAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {sale.lineCount} / {sale.unitCount}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(sale.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link
                          to={`/outlets/${outletId}/sales/${sale.id}`}
                          aria-label={`View receipt ${sale.receiptCode}`}
                        >
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar
            label="Sales pages"
            pagination={sales.data.pagination}
            itemCount={sales.data.items.length}
            onPageChange={(page) => setFilters({ page })}
          />
        </div>
      )}
    </PageContainer>
  );
}
