import {
  ArrowLeft,
  ChevronUp,
  Printer,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { PageContainer } from '@/components/layout/page-container';
import { EmptyState } from '@/components/shared/empty-state';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
import { formatMoney, multiplyMoney, sumMoney } from '@/lib/utils/money';
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
  const [cartOpen, setCartOpen] = useState(false);

  const total = sumMoney(lines.map((line) => multiplyMoney(line.unitPrice, line.quantity)));
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);

  const isSpecialPhase = phase.kind === 'completed' || pending !== null;

  const completedPanel =
    phase.kind === 'completed' ? (
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
    ) : null;

  const pendingPanel = pending ? (
    <CheckoutRecovery
      pending={pending}
      message={phase.kind === 'uncertain' ? phase.message : 'Submitting the sale…'}
      busy={submitting}
      onCheckStatus={() => void checkout.checkStatus()}
      onRetry={() => void checkout.retrySame()}
      onDiscard={checkout.discard}
    />
  ) : null;

  const specialPanel = completedPanel ?? pendingPanel;

  const normalCartContent = (
    <>
      {phase.kind === 'rejected' && (
        <Alert variant="destructive" data-print-hide>
          <AlertDescription>{phase.message}</AlertDescription>
        </Alert>
      )}
      {phase.kind === 'notice' && (
        <Alert data-print-hide>
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
        onCheckout={() => {
          setCartOpen(false);
          void checkout.confirm(lines);
        }}
      />
    </>
  );

  return (
    <div className={!isSpecialPhase ? 'pb-20 lg:pb-0' : undefined}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <ProductCatalog
          outletId={outletId}
          quantities={quantities}
          disabled={pending !== null || submitting || phase.kind === 'completed'}
          onAdd={(product) => add(key, product)}
        />

        {/*
         * Right column: always occupies the grid slot on desktop.
         * On mobile the grid is single-column, so this flows below the catalog.
         *
         * — specialPanel (receipt / recovery): visible on all screen sizes so
         *   mobile users see the outcome inline after checkout.
         * — normalCartContent (CartPanel): hidden on mobile (the sticky bar + Sheet
         *   handle cart interaction there); shown on desktop.
         */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          {specialPanel}
          {!specialPanel && (
            <div className="hidden flex-col gap-4 lg:flex">{normalCartContent}</div>
          )}
        </div>
      </div>

      {/* Mobile/tablet sticky bottom cart bar — normal flow only */}
      {!isSpecialPhase && (
        <>
          <div
            className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur-sm lg:hidden"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            data-print-hide
          >
            <Button
              size="lg"
              className="w-full gap-2"
              variant={lines.length === 0 ? 'outline' : 'default'}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="size-5" aria-hidden />
              <span>
                {lines.length === 0
                  ? 'Cart is empty'
                  : `${units} ${units === 1 ? 'item' : 'items'} · ${formatMoney(total)}`}
              </span>
              {lines.length > 0 && <ChevronUp className="ml-auto size-4" aria-hidden />}
            </Button>
          </div>

          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto pb-6">
              <SheetHeader>
                <SheetTitle className="sr-only">Cart</SheetTitle>
              </SheetHeader>
              {normalCartContent}
            </SheetContent>
          </Sheet>
        </>
      )}
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
