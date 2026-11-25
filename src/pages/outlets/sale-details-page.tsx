import { ArrowLeft, FileQuestion, Printer, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSessionUser } from '@/features/auth/hooks/use-session';
import { Receipt } from '@/features/sales/components/receipt';
import { useSaleQuery } from '@/features/sales/hooks/use-sales';
import { cashierLabel } from '@/features/sales/utils/cashier-label';
import { normalizeApiError } from '@/lib/api/errors';

export function SaleDetailsPage() {
  const { outletId = '', saleId = '' } = useParams();
  const user = useSessionUser();
  const sale = useSaleQuery(outletId, saleId);
  const back = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit" data-print-hide>
      <Link to={`/outlets/${outletId}/sales`}>
        <ArrowLeft aria-hidden />
        Sales history
      </Link>
    </Button>
  );

  if (sale.isError) {
    const error = normalizeApiError(sale.error);
    if (error.kind === 'forbidden' || error.kind === 'not_found' || error.kind === 'validation') {
      return (
        <EmptyState
          icon={error.kind === 'forbidden' ? ShieldAlert : FileQuestion}
          title={error.kind === 'forbidden' ? 'No access to this outlet' : 'Sale not found'}
          description="The receipt does not exist in this outlet or you cannot view it."
          action={back}
        />
      );
    }
    return (
      <PageContainer title="Sale">
        <ErrorState
          title="Sale could not be loaded"
          description={error.message}
          onRetry={() => void sale.refetch()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={sale.data ? `Receipt ${sale.data.receiptCode}` : 'Receipt'}
      description="Prices and names are as recorded at the time of sale."
      actions={
        sale.data && (
          <Button onClick={() => window.print()} data-print-hide>
            <Printer aria-hidden />
            Print receipt
          </Button>
        )
      }
    >
      {back}
      {sale.data ? (
        <Receipt sale={sale.data} cashierLabel={cashierLabel(sale.data.createdById, user)} />
      ) : (
        <Skeleton
          className="mx-auto h-80 w-full max-w-sm"
          role="status"
          aria-label="Loading sale"
        />
      )}
    </PageContainer>
  );
}
