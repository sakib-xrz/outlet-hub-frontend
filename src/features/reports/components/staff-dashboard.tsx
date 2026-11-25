import { Boxes, ClipboardList, History, ShoppingCart, Store } from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOutletsQuery } from '@/features/outlets/hooks/use-outlets-query';

const FILTERS = { page: 1, search: '', status: 'all', sort: 'code-asc' } as const;

export function StaffDashboard() {
  const outlets = useOutletsQuery(FILTERS);

  if (outlets.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2" role="status" aria-label="Loading your outlets">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (outlets.isError) {
    return (
      <ErrorState
        title="Your outlets could not be loaded"
        description={outlets.error.message}
        onRetry={() => void outlets.refetch()}
      />
    );
  }
  if (outlets.data.items.length === 0) {
    return (
      <EmptyState
        icon={Store}
        titleAs="h2"
        title="No outlets assigned"
        description="Ask HQ to assign you to an active outlet before you can sell."
      />
    );
  }

  return (
    <section aria-label="Your outlets" className="grid gap-4 md:grid-cols-2">
      {outlets.data.items.map((outlet) => (
        <Card key={outlet.id}>
          <CardHeader>
            <CardTitle>{outlet.name}</CardTitle>
            <CardDescription className="font-mono">{outlet.code}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button asChild>
              <Link to={`/outlets/${outlet.id}/pos`}>
                <ShoppingCart aria-hidden />
                Open POS
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/outlets/${outlet.id}/sales`}>
                <History aria-hidden />
                Sales history
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/outlets/${outlet.id}/menu`}>
                <ClipboardList aria-hidden />
                Menu
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/outlets/${outlet.id}/inventory`}>
                <Boxes aria-hidden />
                Inventory
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
