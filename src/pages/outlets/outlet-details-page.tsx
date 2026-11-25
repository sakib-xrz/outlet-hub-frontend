import {
  ArrowLeft,
  FileQuestion,
  Pencil,
  Power,
  PowerOff,
  ShieldAlert,
  UtensilsCrossed,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useParams } from 'react-router';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsHqAdmin } from '@/features/auth/hooks/use-session';
import { OutletFormDialog } from '@/features/outlets/components/outlet-form-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import { OutletStatusDialog } from '@/features/outlets/components/outlet-status-dialog';
import { useOutletQuery } from '@/features/outlets/hooks/use-outlet-query';
import { normalizeApiError } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/utils/format';

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
      <Link to="/outlets">
        <ArrowLeft aria-hidden />
        Outlets
      </Link>
    </Button>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{children}</dd>
    </div>
  );
}

export function OutletDetailsPage() {
  const { outletId = '' } = useParams();
  const canManage = useIsHqAdmin();
  const outlet = useOutletQuery(outletId);
  const [dialog, setDialog] = useState<'edit' | 'status' | null>(null);

  if (outlet.isPending) {
    return (
      <PageContainer title="Outlet" description="Loading outlet details…">
        <Card role="status" aria-label="Loading outlet">
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-4 w-full max-w-md" />
            ))}
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (outlet.isError) {
    const error = normalizeApiError(outlet.error);
    if (error.kind === 'forbidden') {
      return (
        <EmptyState
          icon={ShieldAlert}
          title="No access to this outlet"
          description="This outlet is not assigned to your account or is currently inactive."
          action={<BackLink />}
        />
      );
    }
    if (error.kind === 'not_found' || error.kind === 'validation') {
      return (
        <EmptyState
          icon={FileQuestion}
          title="Outlet not found"
          description="The outlet does not exist or the link is incorrect."
          action={<BackLink />}
        />
      );
    }
    return (
      <PageContainer title="Outlet">
        <ErrorState
          title="Outlet could not be loaded"
          description={error.message}
          onRetry={() => void outlet.refetch()}
        />
      </PageContainer>
    );
  }

  const data = outlet.data;

  return (
    <PageContainer
      title={data.name}
      description={`Outlet ${data.code}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to={`/outlets/${data.id}/menu`}>
              <UtensilsCrossed aria-hidden />
              {canManage ? 'Manage menu' : 'View menu'}
            </Link>
          </Button>
          {canManage && (
            <>
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
            </>
          )}
        </div>
      }
    >
      <BackLink />
      <Card>
        <CardContent>
          <dl className="space-y-4">
            <Detail label="Outlet code">
              <span className="font-mono">{data.code}</span>
            </Detail>
            <Detail label="Name">{data.name}</Detail>
            <Detail label="Address">
              {data.address ?? <span className="text-muted-foreground">Not provided</span>}
            </Detail>
            <Detail label="Status">
              <StatusBadge isActive={data.isActive} />
            </Detail>
            <Detail label="Created">{formatDateTime(data.createdAt)}</Detail>
            <Detail label="Last updated">{formatDateTime(data.updatedAt)}</Detail>
          </dl>
        </CardContent>
      </Card>

      {canManage && (
        <>
          <OutletFormDialog
            outlet={data}
            open={dialog === 'edit'}
            onOpenChange={(open) => setDialog(open ? 'edit' : null)}
          />
          <OutletStatusDialog
            outlet={data}
            open={dialog === 'status'}
            onOpenChange={(open) => setDialog(open ? 'status' : null)}
          />
        </>
      )}
    </PageContainer>
  );
}
