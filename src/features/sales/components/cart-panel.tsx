import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Spinner } from '@/components/shared/spinner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type CartLine, lineNeedsReview } from '@/features/sales/stores/cart.store';
import { formatMoney, multiplyMoney, sumMoney } from '@/lib/utils/money';

type CartPanelProps = {
  lines: CartLine[];
  submitting: boolean;
  onQuantity: (menuItemId: string, quantity: number) => void;
  onRemove: (menuItemId: string) => void;
  onAcceptPrice: (menuItemId: string) => void;
  onClear: () => void;
  onCheckout: () => void;
};

function QuantityInput({
  label,
  quantity,
  disabled,
  onCommit,
}: {
  label: string;
  quantity: number;
  disabled: boolean;
  onCommit: (quantity: number) => void;
}) {
  const [draft, setDraft] = useState(String(quantity));
  const [synced, setSynced] = useState(quantity);
  if (quantity !== synced) {
    setSynced(quantity);
    if (Number(draft) !== quantity) setDraft(String(quantity));
  }
  return (
    <Input
      className="h-8 w-16 text-center tabular-nums"
      inputMode="numeric"
      aria-label={label}
      value={draft}
      disabled={disabled}
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, '').slice(0, 10);
        setDraft(digits);
        if (digits && Number(digits) > 0) onCommit(Number(digits));
      }}
      onBlur={() => setDraft(String(quantity))}
    />
  );
}

function LineIssue({ line, onAcceptPrice }: { line: CartLine; onAcceptPrice: () => void }) {
  if (line.unavailable) {
    return <p className="text-xs text-destructive">No longer available. Remove this item.</p>;
  }
  return (
    <>
      {line.changedPrice !== undefined && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-destructive">
            Price changed: {formatMoney(line.unitPrice)} → {formatMoney(line.changedPrice)}
          </span>
          <Button size="xs" variant="outline" onClick={onAcceptPrice}>
            Accept new price
          </Button>
        </div>
      )}
      {line.stockLimit !== undefined && line.quantity > line.stockLimit && (
        <p className="text-xs text-destructive">
          Only {line.stockLimit} available. Reduce the quantity
          {line.stockLimit === 0 ? ' or remove it' : ''}.
        </p>
      )}
    </>
  );
}

export function CartPanel({
  lines,
  submitting,
  onQuantity,
  onRemove,
  onAcceptPrice,
  onClear,
  onCheckout,
}: CartPanelProps) {
  const [confirm, setConfirm] = useState<'clear' | 'checkout' | null>(null);
  const total = sumMoney(lines.map((line) => multiplyMoney(line.unitPrice, line.quantity)));
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  const needsReview = lines.some(lineNeedsReview);

  return (
    <section
      aria-labelledby="cart-heading"
      className="flex flex-col gap-3 rounded-lg border p-4"
      data-print-hide
    >
      <div className="flex items-center justify-between">
        <h2 id="cart-heading" className="flex items-center gap-2 text-base font-semibold">
          <ShoppingCart className="size-4" aria-hidden />
          Cart
        </h2>
        {lines.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirm('clear')}
            disabled={submitting}
          >
            Clear
          </Button>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          The cart is empty. Add products to start a sale.
        </p>
      ) : (
        <ul className="divide-y" aria-label="Cart items">
          {lines.map((line) => (
            <li key={line.menuItemId} className="flex flex-col gap-2 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{line.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatMoney(line.unitPrice)} each
                  </p>
                </div>
                <p className="font-medium tabular-nums" aria-label={`Line total for ${line.name}`}>
                  {formatMoney(multiplyMoney(line.unitPrice, line.quantity))}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Decrease ${line.name}`}
                  disabled={submitting || line.quantity <= 1}
                  onClick={() => onQuantity(line.menuItemId, line.quantity - 1)}
                >
                  <Minus aria-hidden />
                </Button>
                <QuantityInput
                  label={`Quantity of ${line.name}`}
                  quantity={line.quantity}
                  disabled={submitting}
                  onCommit={(quantity) => onQuantity(line.menuItemId, quantity)}
                />
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Increase ${line.name}`}
                  disabled={submitting || line.quantity >= line.availableStock}
                  onClick={() => onQuantity(line.menuItemId, line.quantity + 1)}
                >
                  <Plus aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="ml-auto"
                  aria-label={`Remove ${line.name}`}
                  disabled={submitting}
                  onClick={() => onRemove(line.menuItemId)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <LineIssue line={line} onAcceptPrice={() => onAcceptPrice(line.menuItemId)} />
            </li>
          ))}
        </ul>
      )}

      <div className="border-t pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {units} {units === 1 ? 'unit' : 'units'}
          </span>
          <span className="text-lg font-semibold tabular-nums" aria-label="Cart total">
            {formatMoney(total)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Final prices and stock are confirmed by the server.
        </p>
      </div>

      <Button
        size="lg"
        disabled={lines.length === 0 || submitting || needsReview}
        aria-busy={submitting}
        onClick={() => setConfirm('checkout')}
      >
        {submitting && <Spinner />}
        {needsReview ? 'Review highlighted items' : 'Checkout'}
      </Button>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'clear' ? 'Clear the cart?' : `Complete sale for ${formatMoney(total)}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'clear'
                ? 'All items will be removed from the cart.'
                : `${lines.length} ${lines.length === 1 ? 'item' : 'items'}, ${units} ${units === 1 ? 'unit' : 'units'}. Stock is deducted and a receipt number is issued.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant={confirm === 'clear' ? 'destructive' : 'default'}
              onClick={() => {
                const action = confirm;
                setConfirm(null);
                if (action === 'clear') onClear();
                if (action === 'checkout') onCheckout();
              }}
            >
              {confirm === 'clear' ? 'Clear cart' : 'Confirm sale'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
