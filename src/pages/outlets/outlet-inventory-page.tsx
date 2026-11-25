import { ArrowLeft, Boxes, FileQuestion, ShieldAlert, UtensilsCrossed } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsHqAdmin } from '@/features/auth/hooks/use-session';
import { InventoryFilters } from '@/features/inventory/components/inventory-filters';
import {
  InventoryTable,
  InventoryTableSkeleton,
} from '@/features/inventory/components/inventory-table';
import { useInventoryQuery } from '@/features/inventory/hooks/use-inventory';
import { useInventoryFilters } from '@/features/inventory/hooks/use-inventory-filters';
import { useOutletQuery } from '@/features/outlets/hooks/use-outlet-query';
import { normalizeApiError } from '@/lib/api/errors';

function BackToOutlets() {
  return (
    <Button asChild variant="outline">
      <Link to="/outlets">Back to outlets</Link>
    </Button>
  );
}

export function OutletInventoryPage() {
  const { outletId = '' } = useParams();
  const canManage = useIsHqAdmin();
  const outlet = useOutletQuery(outletId);
  const { filters, setFilters } = useInventoryFilters();
  const inventory = useInventoryQuery(outletId, filters);
  const filtered =
    filters.search !== '' || filters.status !== 'all' || filters.stockStatus !== 'all';

  if (outlet.isError) {
    const error = normalizeApiError(outlet.error);
    if (error.kind === 'forbidden') {
      return (
        <EmptyState
          icon={ShieldAlert}
          title="No access to this outlet"
          description="This outlet is not assigned to your account or is currently inactive."
          action={<BackToOutlets />}
        />
      );
    }
    if (error.kind === 'not_found' || error.kind === 'validation') {
      return (
        <EmptyState
          icon={FileQuestion}
          title="Outlet not found"
          description="The outlet does not exist or the link is incorrect."
          action={<BackToOutlets />}
        />
      );
    }
  }

  const outletData = outlet.data;
  const outletIsActive = outletData?.isActive ?? false;

  return (
    <PageContainer
      title={outletData ? `${outletData.name} inventory` : 'Outlet inventory'}
      description={
        canManage
          ? 'Current stock balances for this outlet. Adjust stock as deliveries arrive or after counts.'
          : 'Current stock balances for items available in this outlet.'
      }
      actions={
        <Button asChild variant="outline">
          <Link to={`/outlets/${outletId}/menu`}>
            <UtensilsCrossed aria-hidden />
            Outlet menu
          </Link>
        </Button>
      }
    >
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link to={`/outlets/${outletId}`}>
          <ArrowLeft aria-hidden />
          Outlet details
        </Link>
      </Button>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {outletData ? (
          <>
            <span className="font-mono">{outletData.code}</span>
            <StatusBadge isActive={outletData.isActive} />
            {canManage && !outletData.isActive && (
              <span className="text-muted-foreground">
                Stock cannot be adjusted while the outlet is inactive.
              </span>
            )}
          </>
        ) : (
          <Skeleton className="h-5 w-40" />
        )}
      </div>

      <InventoryFilters filters={filters} onChange={setFilters} showStatus={canManage} />

      {inventory.isPending ? (
        <InventoryTableSkeleton />
      ) : inventory.isError ? (
        <ErrorState
          title="Inventory could not be loaded"
          description={inventory.error.message}
          onRetry={() => void inventory.refetch()}
        />
      ) : inventory.data.items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          titleAs="h2"
          title={
            inventory.data.pagination.total > 0
              ? 'No items on this page'
              : filtered
                ? 'No matching items'
                : 'No inventory yet'
          }
          description={
            inventory.data.pagination.total > 0
              ? 'This page is past the end of the results.'
              : filtered
                ? 'Try a different search term or filter.'
                : canManage
                  ? 'Assign menu items to this outlet first; each assignment starts with 0 stock.'
                  : 'No menu items are currently available in this outlet.'
          }
          action={
            inventory.data.pagination.total > 0 ? (
              <Button variant="outline" onClick={() => setFilters({ page: 1 })}>
                Go to first page
              </Button>
            ) : filtered ? (
              <Button
                variant="outline"
                onClick={() => setFilters({ search: '', status: 'all', stockStatus: 'all' })}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4" aria-busy={inventory.isFetching}>
          <InventoryTable
            items={inventory.data.items}
            canManage={canManage}
            outletIsActive={outletIsActive}
          />
          <PaginationBar
            label="Inventory pages"
            pagination={inventory.data.pagination}
            itemCount={inventory.data.items.length}
            onPageChange={(page) => setFilters({ page })}
          />
        </div>
      )}
    </PageContainer>
  );
}
