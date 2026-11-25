import { ArrowLeft, Printer, ReceiptText, ShoppingBag } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/shared/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSessionUser } from '@/features/auth/hooks/use-session';
import type { User } from '@/features/auth/types/auth.types';
import { useOutletQuery } from '@/features/outlets/hooks/use-outlet-query';
import { CartPanel } from '@/features/sales/components/cart-panel';
import { CheckoutRecovery } from '@/features/sales/components/checkout-recovery';
import { ProductCatalog } from '@/features/sales/components/product-catalog';
import { Receipt } from '@/features/sales/components/receipt';
import { useCheckout } from '@/features/sales/hooks/use-checkout';
import { type CartLine, cartKey, useCartStore } from '@/features/sales/stores/cart.store';
import { cashierLabel } from '@/features/sales/utils/cashier-label';
import { normalizeApiError } from '@/lib/api/errors';

const NO_LINES: CartLine[] = [];

function PosWorkspace({ user, outletId }: { user: User; outletId: string }) {
  const key = cartKey(user.id, outletId);
  const lines = useCartStore((state) => state.carts[key] ?? NO_LINES);
  const add = useCartStore((state) => state.add);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const remove = useCartStore((state) => state.remove);
  const clear = useCartStore((state) => state.clear);
  const acceptPrice = useCartStore((state) => state.acceptPrice);
  const checkout = useCheckout(user.id, outletId);
  const { phase, pending } = checkout;
  const submitting = phase.kind === 'submitting';
  const quantities = new Map(lines.map((line) => [line.menuItemId, line.quantity]));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <ProductCatalog
        outletId={outletId}
        quantities={quantities}
        disabled={pending !== null || submitting || phase.kind === 'completed'}
        onAdd={(product) => add(key, product)}
      />
      <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        {phase.kind === 'completed' ? (
          <section aria-label="Completed sale" className="flex flex-col gap-3">
            <Alert data-print-hide>
              <ReceiptText aria-hidden />
              <AlertDescription>
                {phase.replayed
                  ? 'This sale was already recorded. No stock was deducted twice.'
                  : 'Sale completed.'}
              </AlertDescription>
            </Alert>
            <Receipt sale={phase.sale} cashierLabel={cashierLabel(phase.sale.createdById, user)} />
            <div className="flex flex-col gap-2" data-print-hide>
              <Button onClick={() => window.print()}>
                <Printer aria-hidden />
                Print receipt
              </Button>
              <Button asChild variant="outline">
                <Link to={`/outlets/${outletId}/sales/${phase.sale.id}`}>View sale details</Link>
              </Button>
              <Button variant="ghost" onClick={checkout.reset}>
                <ShoppingBag aria-hidden />
                Start new sale
              </Button>
            </div>
          </section>
        ) : pending ? (
          <CheckoutRecovery
            pending={pending}
            message={phase.kind === 'uncertain' ? phase.message : 'Submitting the sale…'}
            busy={submitting}
            onCheckStatus={() => void checkout.checkStatus()}
            onRetry={() => void checkout.retrySame()}
            onDiscard={checkout.discard}
          />
        ) : (
          <>
            {phase.kind === 'rejected' && (
              <Alert variant="destructive" data-print-hide>
                <AlertDescription>{phase.message}</AlertDescription>
              </Alert>
            )}
            <CartPanel
              lines={lines}
              submitting={submitting}
              onQuantity={(menuItemId, quantity) => setQuantity(key, menuItemId, quantity)}
              onRemove={(menuItemId) => remove(key, menuItemId)}
              onAcceptPrice={(menuItemId) => acceptPrice(key, menuItemId)}
              onClear={() => clear(key)}
              onCheckout={() => void checkout.confirm(lines)}
            />
          </>
        )}
      </div>
    </div>
  );
}

export function OutletPosPage() {
  const { outletId = '' } = useParams();
  const user = useSessionUser();
  const outlet = useOutletQuery(outletId);

  if (outlet.isError) {
    const error = normalizeApiError(outlet.error);
    return (
      <EmptyState
        icon={ShoppingBag}
        title={error.kind === 'forbidden' ? 'No access to this outlet' : 'Outlet unavailable'}
        description="You can only sell in active outlets assigned to your account."
        action={
          <Button asChild variant="outline">
            <Link to="/outlets">Back to outlets</Link>
          </Button>
        }
      />
    );
  }

  const data = outlet.data;

  return (
    <PageContainer
      title={data ? `${data.name} · POS` : 'Point of sale'}
      description={data ? `Outlet ${data.code}` : 'Loading outlet…'}
      className="max-w-7xl"
      actions={
        <div className="flex flex-wrap gap-2" data-print-hide>
          <Button asChild variant="outline">
            <Link to={`/outlets/${outletId}/sales`}>Sales history</Link>
          </Button>
        </div>
      }
    >
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit" data-print-hide>
        <Link to={`/outlets/${outletId}`}>
          <ArrowLeft aria-hidden />
          Outlet details
        </Link>
      </Button>
      {data && !data.isActive ? (
        <Alert variant="destructive">
          <AlertDescription>This outlet is inactive. Sales cannot be created.</AlertDescription>
        </Alert>
      ) : (
        user && <PosWorkspace key={`${user.id}:${outletId}`} user={user} outletId={outletId} />
      )}
    </PageContainer>
  );
}
