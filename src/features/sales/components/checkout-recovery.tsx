import { AlertTriangle, RefreshCw, Search } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { PendingCheckout } from '@/features/sales/types/sale.types';
import { formatMoney, multiplyMoney, sumMoney } from '@/lib/utils/money';

export function CheckoutRecovery({
  pending,
  message,
  busy,
  onCheckStatus,
  onRetry,
  onDiscard,
}: {
  pending: PendingCheckout;
  message: string;
  busy: boolean;
  onCheckStatus: () => void;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const total = sumMoney(pending.lines.map((line) => multiplyMoney(line.unitPrice, line.quantity)));

  return (
    <section
      aria-labelledby="recovery-heading"
      className="flex flex-col gap-3 rounded-lg border p-4"
      data-print-hide
    >
      <Alert>
        <AlertTriangle aria-hidden />
        <AlertTitle id="recovery-heading">Unconfirmed sale</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      <ul className="divide-y text-sm" aria-label="Unconfirmed sale items">
        {pending.lines.map((line) => (
          <li key={line.menuItemId} className="flex justify-between gap-2 py-2">
            <span className="truncate">
              {line.quantity} × {line.name}
            </span>
            <span className="tabular-nums">
              {formatMoney(multiplyMoney(line.unitPrice, line.quantity))}
            </span>
          </li>
        ))}
      </ul>
      <p className="flex justify-between font-semibold">
        <span>Total</span>
        <span className="tabular-nums">{formatMoney(total)}</span>
      </p>
      <p className="font-mono text-xs text-muted-foreground">Request {pending.requestId}</p>
      <div className="flex flex-col gap-2">
        <Button onClick={onCheckStatus} disabled={busy}>
          {busy ? <Spinner /> : <Search aria-hidden />}
          Check sale status
        </Button>
        <Button variant="outline" onClick={onRetry} disabled={busy}>
          <RefreshCw aria-hidden />
          Retry same sale
        </Button>
        <Button variant="ghost" onClick={() => setConfirmDiscard(true)} disabled={busy}>
          Discard and start over
        </Button>
      </div>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard the unconfirmed sale?</AlertDialogTitle>
            <AlertDialogDescription>
              The cart will be emptied so these items are not sent again by accident as a new sale.
              If the original request was already completed, it stays recorded and appears in the
              sales history. Check its status first if you are unsure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDiscard(false);
                onDiscard();
              }}
            >
              Discard
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
