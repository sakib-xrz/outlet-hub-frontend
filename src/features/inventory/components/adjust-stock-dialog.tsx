import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { Spinner } from '@/components/shared/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAdjustStock } from '@/features/inventory/hooks/use-inventory';
import {
  createAdjustmentSchema,
  resultingStock,
} from '@/features/inventory/schemas/inventory.schemas';
import type {
  AdjustmentFormOutput,
  AdjustmentFormValues,
  InventoryItem,
  StockAdjustment,
} from '@/features/inventory/types/inventory.types';
import { normalizeApiError } from '@/lib/api/errors';

const OPERATIONS = [
  { value: 'INCREASE', label: 'Add stock', hint: 'Receive or replenish units' },
  { value: 'DECREASE', label: 'Reduce stock', hint: 'Remove damaged, expired or lost units' },
  { value: 'SET', label: 'Set stock quantity', hint: 'Correct the balance after a count' },
] as const;

const STALE_CODES = new Set(['STOCK_CHANGED', 'INSUFFICIENT_STOCK', 'STOCK_LIMIT_EXCEEDED']);
const AMBIGUOUS = new Set(['network', 'timeout', 'server', 'unknown']);
const CONFLICT_MESSAGES: Record<string, string> = {
  STOCK_CHANGED: 'The stock changed while this form was open.',
  INSUFFICIENT_STOCK: 'There is not enough stock for this reduction.',
  STOCK_LIMIT_EXCEEDED: 'The resulting stock would exceed the maximum allowed.',
  OUTLET_INACTIVE: 'Stock cannot be adjusted while the outlet is inactive.',
  CONCURRENT_UPDATE: 'Another change to this item is in progress. Wait a moment and try again.',
};

function AdjustForm({ item, onDone }: { item: InventoryItem; onDone: () => void }) {
  const { mutation, refreshOutlet, fetchLatest } = useAdjustStock(item.outletId, item.menuItemId);
  const [baseline, setBaseline] = useState(item.stockQuantity);
  const [notice, setNotice] = useState<string | null>(null);
  const resolver = useMemo(() => zodResolver(createAdjustmentSchema(baseline)), [baseline]);
  const form = useForm<AdjustmentFormValues, unknown, AdjustmentFormOutput>({
    resolver,
    defaultValues: { operation: 'INCREASE', quantity: '' },
    mode: 'onChange',
  });
  const pending = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.server?.message;
  const [operation, quantity] = useWatch({
    control: form.control,
    name: ['operation', 'quantity'],
  });
  const preview = /^\d{1,10}$/.test(quantity.trim())
    ? resultingStock(baseline, operation, Number(quantity.trim()))
    : null;

  const reloadBaseline = async (): Promise<number | null> => {
    try {
      const latest = await fetchLatest();
      setBaseline(latest.stockQuantity);
      return latest.stockQuantity;
    } catch {
      return null;
    }
  };

  const submit = form.handleSubmit(async (values) => {
    setNotice(null);
    const adjustment: StockAdjustment =
      values.operation === 'SET'
        ? { operation: 'SET', quantity: values.quantity, expectedStockQuantity: baseline }
        : { operation: values.operation, quantity: values.quantity };
    try {
      const result = await mutation.mutateAsync(adjustment);
      toast.success(
        result.changed
          ? `${item.sku}: stock ${result.previousStockQuantity} → ${result.newStockQuantity}.`
          : `${item.sku}: stock is already ${result.newStockQuantity}; nothing changed.`,
      );
      onDone();
    } catch (error) {
      const apiError = normalizeApiError(error);
      if (apiError.code && STALE_CODES.has(apiError.code)) {
        const latest = await reloadBaseline();
        setNotice(
          latest === null
            ? 'The stock balance changed. Close this dialog and reopen it to review the latest balance.'
            : `The current stock is now ${latest}. Review the adjustment and confirm again.`,
        );
        form.setError('root.server', {
          message: CONFLICT_MESSAGES[apiError.code] ?? apiError.message,
        });
        return;
      }
      if (AMBIGUOUS.has(apiError.kind)) {
        await refreshOutlet();
        const latest = await reloadBaseline();
        setNotice(
          `We could not confirm whether the adjustment was saved. ${
            latest === null ? 'Refresh the page' : `The latest balance is ${latest}`
          } — verify it before trying again. Nothing was resubmitted.`,
        );
        return;
      }
      form.setError('root.server', {
        message: (apiError.code && CONFLICT_MESSAGES[apiError.code]) ?? apiError.message,
      });
    }
  });

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      {rootError && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{rootError}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <Info aria-hidden />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Current stock</dt>
        <dd className="text-right font-medium tabular-nums" data-testid="baseline-stock">
          {baseline}
        </dd>
      </dl>

      <Controller
        name="operation"
        control={form.control}
        render={({ field }) => (
          <Field>
            <FieldLabel id="adjust-operation-label">Adjustment</FieldLabel>
            <RadioGroup
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                void form.trigger('quantity');
              }}
              aria-labelledby="adjust-operation-label"
              disabled={pending}
              className="gap-2"
            >
              {OPERATIONS.map((option) => (
                <label key={option.value} className="flex items-start gap-3 text-sm">
                  <RadioGroupItem value={option.value} />
                  <span>
                    <span className="font-medium">{option.label}</span>
                    <span className="block text-muted-foreground">{option.hint}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </Field>
        )}
      />

      <Controller
        name="quantity"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="adjust-quantity">
              {operation === 'SET' ? 'New stock quantity' : 'Quantity'}
            </FieldLabel>
            <Input
              {...field}
              id="adjust-quantity"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className="tabular-nums"
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.error ? 'adjust-quantity-error' : undefined}
              disabled={pending}
            />
            <FieldError id="adjust-quantity-error" errors={[fieldState.error]} />
          </Field>
        )}
      />

      <p className="rounded-md bg-muted/50 px-3 py-2 text-sm" aria-live="polite">
        Resulting stock:{' '}
        <span className="font-medium tabular-nums">
          {preview === null || preview < 0 ? '—' : preview}
        </span>
        <span className="block text-xs text-muted-foreground">
          Preview only. The server re-checks the balance when you confirm.
        </span>
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending && <Spinner />}
          Confirm adjustment
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AdjustStockDialog({
  item,
  open,
  onOpenChange,
}: {
  item: InventoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{item.sku}</span> · {item.name}. Only the current balance is
            stored; adjustments are not kept as a history.
          </DialogDescription>
        </DialogHeader>
        <AdjustForm item={item} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
