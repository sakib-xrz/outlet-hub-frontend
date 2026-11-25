import { Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { Button } from '@/components/ui/button';
import { StaffCreateDialog } from '@/features/staff/components/staff-create-dialog';
import { StaffFilters } from '@/features/staff/components/staff-filters';
import { StaffTable, StaffTableSkeleton } from '@/features/staff/components/staff-table';
import { useStaffFilters } from '@/features/staff/hooks/use-staff-filters';
import { useStaffListQuery } from '@/features/staff/hooks/use-staff-queries';

export function StaffPage() {
  const { filters, setFilters } = useStaffFilters();
  const staff = useStaffListQuery(filters);
  const [creating, setCreating] = useState(false);
  const filtered = filters.search !== '' || filters.status !== 'all' || filters.outletId !== '';

  return (
    <PageContainer
      title="Staff"
      description="Create outlet staff accounts, assign outlets, and control account access."
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          Create staff
        </Button>
      }
    >
      <StaffFilters filters={filters} onChange={setFilters} />

      {staff.isPending ? (
        <StaffTableSkeleton />
      ) : staff.isError ? (
        <ErrorState
          title="Staff could not be loaded"
          description={staff.error.message}
          onRetry={() => void staff.refetch()}
        />
      ) : staff.data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          titleAs="h2"
          title={
            staff.data.pagination.total > 0
              ? 'No staff on this page'
              : filtered
                ? 'No matching staff'
                : 'No staff accounts yet'
          }
          description={
            staff.data.pagination.total > 0
              ? 'This page is past the end of the results.'
              : filtered
                ? 'Try a different search term or filter.'
                : 'Create the first outlet staff account to get started.'
          }
          action={
            staff.data.pagination.total > 0 ? (
              <Button variant="outline" onClick={() => setFilters({ page: 1 })}>
                Go to first page
              </Button>
            ) : filtered ? (
              <Button
                variant="outline"
                onClick={() => setFilters({ search: '', status: 'all', outletId: '' })}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4" aria-busy={staff.isFetching}>
          <StaffTable staff={staff.data.items} />
          <PaginationBar
            label="Staff pages"
            pagination={staff.data.pagination}
            itemCount={staff.data.items.length}
            onPageChange={(page) => setFilters({ page })}
          />
        </div>
      )}

      <StaffCreateDialog open={creating} onOpenChange={setCreating} />
    </PageContainer>
  );
}
