import {
  ArrowLeft,
  FileQuestion,
  KeyRound,
  Mail,
  Power,
  PowerOff,
  ShieldAlert,
  Store,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useParams } from 'react-router';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ROLE_LABELS } from '@/features/auth/constants';
import { type StaffDialog, StaffDialogs } from '@/features/staff/components/staff-actions';
import { useStaffQuery } from '@/features/staff/hooks/use-staff-queries';
import { normalizeApiError } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/utils/format';

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
      <Link to="/staff">
        <ArrowLeft aria-hidden />
        Staff
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

export function StaffDetailsPage() {
  const { staffId = '' } = useParams();
  const staff = useStaffQuery(staffId);
  const [dialog, setDialog] = useState<StaffDialog>(null);

  if (staff.isPending) {
    return (
      <PageContainer title="Staff member" description="Loading account details…">
        <Card role="status" aria-label="Loading staff member">
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-4 w-full max-w-md" />
            ))}
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  if (staff.isError) {
    const error = normalizeApiError(staff.error);
    if (error.kind === 'forbidden') {
      return (
        <EmptyState
          icon={ShieldAlert}
          title="Access denied"
          description="Only HQ administrators can manage staff accounts."
          action={<BackLink />}
        />
      );
    }
    if (error.kind === 'not_found' || error.kind === 'validation') {
      return (
        <EmptyState
          icon={FileQuestion}
          title="Staff member not found"
          description="The account does not exist, is not an outlet staff account, or the link is incorrect."
          action={<BackLink />}
        />
      );
    }
    return (
      <PageContainer title="Staff member">
        <ErrorState
          title="Staff member could not be loaded"
          description={error.message}
          onRetry={() => void staff.refetch()}
        />
      </PageContainer>
    );
  }

  const data = staff.data;

  return (
    <PageContainer
      title={data.email}
      description="Outlet staff account"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialog('email')}>
            <Mail aria-hidden />
            Edit email
          </Button>
          <Button variant="outline" onClick={() => setDialog('outlets')}>
            <Store aria-hidden />
            Manage outlets
          </Button>
          <Button variant="outline" onClick={() => setDialog('password')}>
            <KeyRound aria-hidden />
            Reset password
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
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            <Detail label="Email">{data.email}</Detail>
            <Detail label="Role">{ROLE_LABELS[data.role]}</Detail>
            <Detail label="Status">
              <StatusBadge isActive={data.isActive} />
            </Detail>
            <Detail label="Created">{formatDateTime(data.createdAt)}</Detail>
            <Detail label="Last updated">{formatDateTime(data.updatedAt)}</Detail>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned outlets</CardTitle>
          <CardDescription>
            Staff can only work in active outlets. Inactive assignments are kept until removed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.outlets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outlets assigned.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {data.outlets.map((outlet) => (
                <li key={outlet.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="font-mono text-xs font-medium">{outlet.code}</span>
                  <Link
                    to={`/outlets/${outlet.id}`}
                    className="min-w-0 flex-1 truncate hover:underline"
                  >
                    {outlet.name}
                  </Link>
                  <StatusBadge isActive={outlet.isActive} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <StaffDialogs staff={data} dialog={dialog} onDialogChange={setDialog} />
    </PageContainer>
  );
}
