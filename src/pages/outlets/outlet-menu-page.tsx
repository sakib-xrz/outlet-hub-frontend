import { ArrowLeft, FileQuestion, Plus, ShieldAlert, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsHqAdmin } from '@/features/auth/hooks/use-session';
import { AssignMenuItemDialog } from '@/features/outlet-menu-items/components/assign-menu-item-dialog';
import { OutletMenuFilters } from '@/features/outlet-menu-items/components/outlet-menu-filters';
import {
  OutletMenuTable,
  OutletMenuTableSkeleton,
} from '@/features/outlet-menu-items/components/outlet-menu-table';
import { useOutletMenuQuery } from '@/features/outlet-menu-items/hooks/use-outlet-menu';
import { useOutletMenuFilters } from '@/features/outlet-menu-items/hooks/use-outlet-menu-filters';
import { useOutletQuery } from '@/features/outlets/hooks/use-outlet-query';
import { normalizeApiError } from '@/lib/api/errors';

function BackLink({ outletId }: { outletId: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
      <Link to={`/outlets/${outletId}`}>
        <ArrowLeft aria-hidden />
        Outlet details
      </Link>
    </Button>
  );
}

export function OutletMenuPage() {
  const { outletId = '' } = useParams();
  const canManage = useIsHqAdmin();
  const outlet = useOutletQuery(outletId);
  const { filters, setFilters } = useOutletMenuFilters();
  const menu = useOutletMenuQuery(outletId, filters);
  const [assigning, setAssigning] = useState(false);
  const filtered = filters.search !== '' || filters.status !== 'all';

  if (outlet.isError) {
    const error = normalizeApiError(outlet.error);
    if (error.kind === 'forbidden') {
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
    if (error.kind === 'not_found' || error.kind === 'validation') {
      return (
        <EmptyState
          icon={FileQuestion}
          title="Outlet not found"
          description="The outlet does not exist or the link is incorrect."
          action={
            <Button asChild variant="outline">
              <Link to="/outlets">Back to outlets</Link>
            </Button>
          }
        />
      );
    }
  }

  const outletData = outlet.data;

  return (
    <PageContainer
      title={outletData ? `${outletData.name} menu` : 'Outlet menu'}
      description={
        canManage
          ? 'Assign master menu items to this outlet and set outlet-specific prices.'
          : 'Items available in this outlet, with current prices and stock.'
      }
      actions={
        canManage && (
          <Button onClick={() => setAssigning(true)} disabled={outletData?.isActive === false}>
            <Plus aria-hidden />
            Assign menu item
          </Button>
        )
      }
    >
      <BackLink outletId={outletId} />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {outletData ? (
          <>
            <span className="font-mono">{outletData.code}</span>
            <StatusBadge isActive={outletData.isActive} />
            {canManage && !outletData.isActive && (
              <span className="text-muted-foreground">
                Inactive outlets cannot receive new assignments.
              </span>
            )}
          </>
        ) : (
          <Skeleton className="h-5 w-40" />
        )}
      </div>

      <OutletMenuFilters filters={filters} onChange={setFilters} showStatus={canManage} />

      {menu.isPending ? (
        <OutletMenuTableSkeleton />
      ) : menu.isError ? (
        <ErrorState
          title="The outlet menu could not be loaded"
          description={menu.error.message}
          onRetry={() => void menu.refetch()}
        />
      ) : menu.data.items.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          titleAs="h2"
          title={
            menu.data.pagination.total > 0
              ? 'No items on this page'
              : filtered
                ? 'No matching items'
                : canManage
                  ? 'No menu items assigned yet'
                  : 'No items available'
          }
          description={
            menu.data.pagination.total > 0
              ? 'This page is past the end of the results.'
              : filtered
                ? 'Try a different search term or filter.'
                : canManage
                  ? 'Assign items from the master menu to start this outlet’s menu.'
                  : 'No menu items are currently available in this outlet.'
          }
          action={
            menu.data.pagination.total > 0 ? (
              <Button variant="outline" onClick={() => setFilters({ page: 1 })}>
                Go to first page
              </Button>
            ) : filtered ? (
              <Button variant="outline" onClick={() => setFilters({ search: '', status: 'all' })}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4" aria-busy={menu.isFetching}>
          <OutletMenuTable items={menu.data.items} canManage={canManage} />
          <PaginationBar
            label="Outlet menu pages"
            pagination={menu.data.pagination}
            itemCount={menu.data.items.length}
            onPageChange={(page) => setFilters({ page })}
          />
        </div>
      )}

      {canManage && (
        <AssignMenuItemDialog outletId={outletId} open={assigning} onOpenChange={setAssigning} />
      )}
    </PageContainer>
  );
}
