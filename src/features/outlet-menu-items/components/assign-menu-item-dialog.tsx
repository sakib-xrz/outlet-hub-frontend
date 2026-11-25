import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Search } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ErrorState } from '@/components/shared/error-state';
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
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import type { MenuItem } from '@/features/menu-items/types/menu-item.types';
import { PriceModeFields } from '@/features/outlet-menu-items/components/price-mode-fields';
import { useActiveMenuItemOptionsQuery } from '@/features/outlet-menu-items/hooks/use-menu-item-options-query';
import { useAssignMenuItem } from '@/features/outlet-menu-items/hooks/use-outlet-menu';
import { priceFormSchema } from '@/features/outlet-menu-items/schemas/outlet-menu-item.schemas';
import type {
  PriceFormOutput,
  PriceFormValues,
} from '@/features/outlet-menu-items/types/outlet-menu-item.types';
import { normalizeApiError } from '@/lib/api/errors';
import { formatMoney } from '@/lib/utils/money';

function MenuItemPicker({
  selected,
  onSelect,
  disabled,
}: {
  selected: MenuItem | null;
  onSelect: (item: MenuItem) => void;
  disabled: boolean;
}) {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const applySearch = useDebouncedCallback((value: string) => setSearch(value.trim()), 300);
  const options = useActiveMenuItemOptionsQuery(search);
  const items = options.data?.pages.flatMap((page) => page.items) ?? [];
  const byId = new Map(items.map((item) => [item.id, item]));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={input}
          maxLength={100}
          placeholder="Search active items by SKU or name"
          aria-label="Search master menu items"
          className="pl-8"
          disabled={disabled}
          onChange={(event) => {
            setInput(event.target.value);
            applySearch(event.target.value);
          }}
        />
      </div>
      <p className="text-sm" aria-live="polite">
        {selected ? (
          <>
            Selected: <span className="font-mono text-xs">{selected.sku}</span> {selected.name} ·{' '}
            <span className="tabular-nums">{formatMoney(selected.basePrice)}</span>
          </>
        ) : (
          <span className="text-muted-foreground">No item selected</span>
        )}
      </p>
      <div className="max-h-56 overflow-y-auto rounded-md border">
        {options.isPending ? (
          <div className="space-y-2 p-3" role="status" aria-label="Loading menu items">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-5 w-full" />
            ))}
          </div>
        ) : options.isError ? (
          <ErrorState
            className="py-4"
            title="Menu items could not be loaded"
            description={options.error.message}
            onRetry={() => void options.refetch()}
          />
        ) : items.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {search ? 'No active items match your search.' : 'The master menu has no active items.'}
          </p>
        ) : (
          <RadioGroup
            value={selected?.id ?? ''}
            onValueChange={(id) => {
              const item = byId.get(id);
              if (item) onSelect(item);
            }}
            aria-label="Master menu items"
            disabled={disabled}
            className="gap-0 divide-y"
          >
            {items.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm"
              >
                <RadioGroupItem value={item.id} aria-label={`${item.sku} ${item.name}`} />
                <span className="font-mono text-xs font-medium">{item.sku}</span>
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatMoney(item.basePrice)}
                </span>
              </label>
            ))}
          </RadioGroup>
        )}
        {options.hasNextPage && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={options.isFetchingNextPage}
              onClick={() => void options.fetchNextPage()}
            >
              {options.isFetchingNextPage && <Spinner />}
              Load more items
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function AssignForm({ outletId, onDone }: { outletId: string; onDone: () => void }) {
  const assign = useAssignMenuItem(outletId);
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const form = useForm<PriceFormValues, unknown, PriceFormOutput>({
    resolver: zodResolver(priceFormSchema),
    defaultValues: { mode: 'inherit', customPrice: '' },
  });
  const pending = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.server?.message;

  const submit = form.handleSubmit(async (values) => {
    if (!selected) {
      setSelectionError('Choose a menu item to assign.');
      return;
    }
    setSelectionError(null);
    try {
      const created = await assign.mutateAsync({
        menuItemId: selected.id,
        overridePrice: values.mode === 'custom' ? values.customPrice : null,
      });
      toast.success(`${created.sku} assigned to this outlet.`);
      onDone();
    } catch (error) {
      const apiError = normalizeApiError(error);
      const itemError = apiError.fieldErrors.find(({ field }) => field === 'menuItemId');
      const priceError = apiError.fieldErrors.find(({ field }) => field === 'overridePrice');
      if (itemError) setSelectionError(itemError.message);
      else if (priceError)
        form.setError('customPrice', { type: 'server', message: priceError.message });
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
      <MenuItemPicker
        selected={selected}
        disabled={pending}
        onSelect={(item) => {
          setSelected(item);
          setSelectionError(null);
        }}
      />
      {selectionError && (
        <p role="alert" className="text-sm text-destructive">
          {selectionError}
        </p>
      )}
      {selected && (
        <PriceModeFields
          control={form.control}
          basePrice={selected.basePrice}
          disabled={pending}
          idPrefix="assign-dialog"
        />
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending && <Spinner />}
          Assign item
        </Button>
      </DialogFooter>
    </form>
  );
}

export function AssignMenuItemDialog({
  outletId,
  open,
  onOpenChange,
}: {
  outletId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign menu item</DialogTitle>
          <DialogDescription>
            Choose an active master menu item. Stock starts at 0 and the item uses the master price
            unless you set a custom outlet price.
          </DialogDescription>
        </DialogHeader>
        <AssignForm outletId={outletId} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
