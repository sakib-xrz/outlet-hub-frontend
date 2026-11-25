import { Plus, UtensilsCrossed } from 'lucide-react';
import { useState } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { PaginationBar } from '@/components/shared/pagination-bar';
import { Button } from '@/components/ui/button';
import { MenuItemFilters } from '@/features/menu-items/components/menu-item-filters';
import { MenuItemFormDialog } from '@/features/menu-items/components/menu-item-form-dialog';
import {
  MenuItemTable,
  MenuItemTableSkeleton,
} from '@/features/menu-items/components/menu-item-table';
import { useMenuItemFilters } from '@/features/menu-items/hooks/use-menu-item-filters';
import { useMenuItemsQuery } from '@/features/menu-items/hooks/use-menu-item-queries';

export function MenuItemsPage() {
  const { filters, setFilters } = useMenuItemFilters();
  const items = useMenuItemsQuery(filters);
  const [creating, setCreating] = useState(false);
  const filtered = filters.search !== '' || filters.status !== 'all';

  return (
    <PageContainer
      title="Master Menu"
      description="The company-wide catalog of items and their default prices."
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          Create menu item
        </Button>
      }
    >
      <MenuItemFilters filters={filters} onChange={setFilters} />

      {items.isPending ? (
        <MenuItemTableSkeleton />
      ) : items.isError ? (
        <ErrorState
          title="Menu items could not be loaded"
          description={items.error.message}
          onRetry={() => void items.refetch()}
        />
      ) : items.data.items.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          titleAs="h2"
          title={
            items.data.pagination.total > 0
              ? 'No menu items on this page'
              : filtered
                ? 'No matching menu items'
                : 'No menu items yet'
          }
          description={
            items.data.pagination.total > 0
              ? 'This page is past the end of the results.'
              : filtered
                ? 'Try a different search term or status filter.'
                : 'Create the first item in the master menu.'
          }
          action={
            items.data.pagination.total > 0 ? (
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
        <div className="flex flex-col gap-4" aria-busy={items.isFetching}>
          <MenuItemTable items={items.data.items} />
          <PaginationBar
            label="Menu item pages"
            pagination={items.data.pagination}
            itemCount={items.data.items.length}
            onPageChange={(page) => setFilters({ page })}
          />
        </div>
      )}

      <MenuItemFormDialog open={creating} onOpenChange={setCreating} />
    </PageContainer>
  );
}
