import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
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
import { PriceModeFields } from '@/features/outlet-menu-items/components/price-mode-fields';
import { useSetOverridePrice } from '@/features/outlet-menu-items/hooks/use-outlet-menu';
import { priceFormSchema } from '@/features/outlet-menu-items/schemas/outlet-menu-item.schemas';
import type {
  OutletMenuItem,
  PriceFormOutput,
  PriceFormValues,
} from '@/features/outlet-menu-items/types/outlet-menu-item.types';
import { normalizeApiError } from '@/lib/api/errors';
import { formatMoney } from '@/lib/utils/money';

function PriceForm({
  item,
  initialMode,
  onDone,
}: {
  item: OutletMenuItem;
  initialMode: 'inherit' | 'custom';
  onDone: () => void;
}) {
  const setPrice = useSetOverridePrice(item.outletId, item.menuItemId);
  const form = useForm<PriceFormValues, unknown, PriceFormOutput>({
    resolver: zodResolver(priceFormSchema),
    defaultValues: { mode: initialMode, customPrice: item.overridePrice ?? '' },
  });
  const pending = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.server?.message;

  const submit = form.handleSubmit(async (values) => {
    const overridePrice = values.mode === 'custom' ? values.customPrice : null;
    try {
      await setPrice.mutateAsync(overridePrice);
      toast.success(
        overridePrice === null
          ? `${item.sku} now uses the master price.`
          : `${item.sku} now costs ${formatMoney(overridePrice)} in this outlet.`,
      );
      onDone();
    } catch (error) {
      const apiError = normalizeApiError(error);
      const priceError = apiError.fieldErrors.find(({ field }) => field === 'overridePrice');
      if (priceError) form.setError('customPrice', { type: 'server', message: priceError.message });
      else form.setError('root.server', { message: apiError.message });
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
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-muted-foreground">Master price</dt>
        <dd className="text-right tabular-nums">{formatMoney(item.basePrice)}</dd>
        <dt className="text-muted-foreground">Current effective price</dt>
        <dd className="text-right tabular-nums">{formatMoney(item.effectivePrice)}</dd>
      </dl>
      <PriceModeFields
        control={form.control}
        basePrice={item.basePrice}
        disabled={pending}
        idPrefix="price-dialog"
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending && <Spinner />}
          Save price
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PriceOverrideDialog({
  item,
  initialMode,
  open,
  onOpenChange,
}: {
  item: OutletMenuItem;
  initialMode: 'inherit' | 'custom';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Outlet price for {item.name}</DialogTitle>
          <DialogDescription>
            Changes apply to future sales in this outlet only. Past sales keep their recorded
            prices.
          </DialogDescription>
        </DialogHeader>
        <PriceForm item={item} initialMode={initialMode} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
