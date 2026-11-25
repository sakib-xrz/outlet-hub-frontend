import { ArrowLeft, FileQuestion, Pencil, Power, PowerOff, ShieldAlert } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useParams } from 'react-router';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MenuItemFormDialog } from '@/features/menu-items/components/menu-item-form-dialog';
import { MenuItemStatusDialog } from '@/features/menu-items/components/menu-item-status-dialog';
import { useMenuItemQuery } from '@/features/menu-items/hooks/use-menu-item-queries';
import { normalizeApiError } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/utils/format';
import { formatMoney } from '@/lib/utils/money';

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
      <Link to="/menu-items">
        <ArrowLeft aria-hidden />
        Master Menu
      </Link>
    </Button>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words whitespace-pre-line">{children}</dd>
    </div>
  );
}

export function MenuItemDetailsPage() {
  const { menuItemId = '' } = useParams();
  const item = useMenuItemQuery(menuItemId);
  const [dialog, setDialog] = useState<'edit' | 'status' | null>(null);

  if (item.isPending) {
    return (
      <PageContainer title="Menu item" description="Loading menu item…">
        <Card role="status" aria-label="Loading menu item">
          <CardContent className="space-y-4">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-4 w-full max-w-md" />
            ))}
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (item.isError) {
    const error = normalizeApiError(item.error);
    if (error.kind === 'forbidden') {
      return (
        <EmptyState
          icon={ShieldAlert}
          title="Access denied"
          description="Only HQ administrators can manage the master menu."
          action={<BackLink />}
        />
      );
    }
    if (error.kind === 'not_found' || error.kind === 'validation') {
      return (
        <EmptyState
          icon={FileQuestion}
          title="Menu item not found"
          description="The item does not exist or the link is incorrect."
          action={<BackLink />}
        />
      );
    }
    return (
      <PageContainer title="Menu item">
        <ErrorState
          title="Menu item could not be loaded"
          description={error.message}
          onRetry={() => void item.refetch()}
        />
      </PageContainer>
    );
  }

  const data = item.data;

  return (
    <PageContainer
      title={data.name}
      description={`SKU ${data.sku}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialog('edit')}>
            <Pencil aria-hidden />
            Edit
          </Button>
          <Button
            variant={data.isActive ? 'destructive' : 'default'}
            onClick={() => setDialog('status')}
          >
            {data.isActive ? <PowerOff aria-hidden /> : <Power aria-hidden />}
            {data.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      }
    >
      <BackLink />
      <Card>
        <CardContent>
          <dl className="space-y-4">
            <Detail label="SKU">
              <span className="font-mono">{data.sku}</span>
            </Detail>
            <Detail label="Item name">{data.name}</Detail>
            <Detail label="Description">
              {data.description ?? <span className="text-muted-foreground">Not provided</span>}
            </Detail>
            <Detail label="Base price">
              <span className="tabular-nums">{formatMoney(data.basePrice)}</span>
            </Detail>
            <Detail label="Master status">
              <StatusBadge isActive={data.isActive} />
            </Detail>
            <Detail label="Created">{formatDateTime(data.createdAt)}</Detail>
            <Detail label="Last updated">{formatDateTime(data.updatedAt)}</Detail>
          </dl>
        </CardContent>
      </Card>

      <MenuItemFormDialog
        menuItem={data}
        open={dialog === 'edit'}
        onOpenChange={(open) => setDialog(open ? 'edit' : null)}
      />
      <MenuItemStatusDialog
        menuItem={data}
        open={dialog === 'status'}
        onOpenChange={(open) => setDialog(open ? 'status' : null)}
      />
    </PageContainer>
  );
}
