import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Spinner } from '@/components/shared/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { menuItemFormSchema } from '@/features/menu-items/schemas/menu-item.schemas';
import type {
  MenuItem,
  MenuItemFormOutput,
  MenuItemFormValues,
} from '@/features/menu-items/types/menu-item.types';
import { normalizeApiError } from '@/lib/api/errors';
import { CURRENCY_SYMBOL } from '@/lib/utils/money';

const FIELDS = ['sku', 'name', 'description', 'basePrice'] as const;
const isField = (field: string): field is (typeof FIELDS)[number] =>
  (FIELDS as readonly string[]).includes(field);

type MenuItemFormProps = {
  menuItem?: MenuItem;
  onSubmit: (values: MenuItemFormOutput) => Promise<unknown>;
  onCancel: () => void;
};

export function MenuItemForm({ menuItem, onSubmit, onCancel }: MenuItemFormProps) {
  const editing = menuItem !== undefined;
  const form = useForm<MenuItemFormValues, unknown, MenuItemFormOutput>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      sku: menuItem?.sku ?? '',
      name: menuItem?.name ?? '',
      description: menuItem?.description ?? '',
      basePrice: menuItem?.basePrice ?? '',
    },
    mode: 'onTouched',
  });
  const pending = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.server?.message;

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      const apiError = normalizeApiError(error);
      const fieldErrors = apiError.fieldErrors.filter(({ field }) => isField(field));
      for (const { field, message } of fieldErrors) {
        if (isField(field)) form.setError(field, { type: 'server', message });
      }
      if (!fieldErrors.length) form.setError('root.server', { message: apiError.message });
    }
  });

  return (
    <form noValidate onSubmit={submit}>
      <FieldGroup className="gap-5">
        {rootError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden />
            <AlertDescription>{rootError}</AlertDescription>
          </Alert>
        )}

        <Controller
          name="sku"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="menu-item-sku">SKU</FieldLabel>
              <Input
                {...field}
                id="menu-item-sku"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                readOnly={editing}
                aria-readonly={editing}
                aria-invalid={fieldState.invalid}
                aria-describedby="menu-item-sku-hint menu-item-sku-error"
                className="font-mono uppercase read-only:bg-muted read-only:text-muted-foreground"
                disabled={pending}
                onChange={(event) => field.onChange(event.target.value.toUpperCase())}
              />
              <FieldDescription id="menu-item-sku-hint">
                {editing
                  ? 'SKUs cannot be changed after creation.'
                  : 'Letters, numbers and hyphens, e.g. COFFEE-001. Cannot be changed later.'}
              </FieldDescription>
              <FieldError id="menu-item-sku-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="menu-item-name">Item name</FieldLabel>
              <Input
                {...field}
                id="menu-item-name"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? 'menu-item-name-error' : undefined}
                disabled={pending}
              />
              <FieldError id="menu-item-name-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="basePrice"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="menu-item-price">Base price</FieldLabel>
              <div className="relative">
                <span
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground"
                  aria-hidden
                >
                  {CURRENCY_SYMBOL}
                </span>
                <Input
                  {...field}
                  id="menu-item-price"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  className="pl-7 tabular-nums"
                  aria-invalid={fieldState.invalid}
                  aria-describedby="menu-item-price-hint menu-item-price-error"
                  disabled={pending}
                />
              </div>
              <FieldDescription id="menu-item-price-hint">
                Default price for every outlet. Up to 2 decimals; 0 is allowed.
              </FieldDescription>
              <FieldError id="menu-item-price-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="menu-item-description">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Textarea
                {...field}
                id="menu-item-description"
                rows={3}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? 'menu-item-description-error' : undefined}
                disabled={pending}
              />
              <FieldError id="menu-item-description-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending && <Spinner />}
            {editing ? 'Save changes' : 'Create menu item'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
