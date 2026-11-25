import { Plus, Store } from 'lucide-react';
import { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { useIsHqAdmin } from '@/features/auth/hooks/use-session';
import { OutletFilters } from '@/features/outlets/components/outlet-filters';
import { OutletFormDialog } from '@/features/outlets/components/outlet-form-dialog';
import { OutletPagination } from '@/features/outlets/components/outlet-pagination';
import { OutletTable, OutletTableSkeleton } from '@/features/outlets/components/outlet-table';
import { useOutletFilters } from '@/features/outlets/hooks/use-outlet-filters';
import { useOutletsQuery } from '@/features/outlets/hooks/use-outlets-query';

export function OutletsPage() {
  const canManage = useIsHqAdmin();
  const { filters, setFilters } = useOutletFilters();
  const outlets = useOutletsQuery(filters);
  const [creating, setCreating] = useState(false);
  const filtered = filters.search !== '' || filters.status !== 'all';

  return (
    <PageContainer
      title="Outlets"
      description={
        canManage
          ? 'Create outlets and manage their details and availability.'
          : 'Outlets assigned to your account.'
      }
      actions={
        canManage && (
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            Create outlet
          </Button>
        )
      }
    >
      <OutletFilters filters={filters} onChange={setFilters} />

      {outlets.isPending ? (
        <OutletTableSkeleton />
      ) : outlets.isError ? (
        <ErrorState
          title="Outlets could not be loaded"
          description={outlets.error.message}
          onRetry={() => void outlets.refetch()}
        />
      ) : outlets.data.items.length === 0 ? (
        <EmptyState
          icon={Store}
          titleAs="h2"
          title={
            outlets.data.pagination.total > 0
              ? 'No outlets on this page'
              : filtered
                ? 'No matching outlets'
                : 'No outlets yet'
          }
          description={
            outlets.data.pagination.total > 0
              ? 'This page is past the end of the results.'
              : filtered
                ? 'Try a different search term or status filter.'
                : canManage
                  ? 'Create the first outlet to get started.'
                  : 'You are not assigned to any active outlet yet.'
          }
          action={
            outlets.data.pagination.total > 0 ? (
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
        <div className="flex flex-col gap-4" aria-busy={outlets.isFetching}>
          <OutletTable outlets={outlets.data.items} canManage={canManage} />
          <OutletPagination
            pagination={outlets.data.pagination}
            itemCount={outlets.data.items.length}
            onPageChange={(page) => setFilters({ page })}
          />
        </div>
      )}

      {canManage && <OutletFormDialog open={creating} onOpenChange={setCreating} />}
    </PageContainer>
  );
}
