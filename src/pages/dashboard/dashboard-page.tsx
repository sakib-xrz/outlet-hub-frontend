import { ShieldCheck } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { ErrorState } from '@/components/shared/error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ROLE_LABELS } from '@/features/auth/constants';
import { useCurrentUserQuery } from '@/features/auth/hooks/use-current-user-query';

export function DashboardPage() {
  const currentUser = useCurrentUserQuery();

  return (
    <PageContainer title="Dashboard" description="You are signed in to OutletHub.">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
            Signed-in account
          </CardTitle>
          <CardDescription>
            Account details confirmed by the server for this session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentUser.isPending ? (
            <div className="space-y-3" role="status" aria-label="Loading account details">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : currentUser.isError ? (
            <ErrorState
              className="py-4"
              title="Account details unavailable"
              description={currentUser.error.message}
              onRetry={() => void currentUser.refetch()}
            />
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate font-medium">{currentUser.data.email}</dd>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="font-medium">{ROLE_LABELS[currentUser.data.role]}</dd>
            </dl>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
