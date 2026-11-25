import { type Control, Controller, useWatch } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type {
  PriceFormOutput,
  PriceFormValues,
} from '@/features/outlet-menu-items/types/outlet-menu-item.types';
import { previewEffectivePrice } from '@/features/outlet-menu-items/utils';
import { CURRENCY_SYMBOL, formatMoney } from '@/lib/utils/money';

type PriceModeFieldsProps = {
  control: Control<PriceFormValues, unknown, PriceFormOutput>;
  basePrice: string;
  disabled: boolean;
  idPrefix: string;
};

export function PriceModeFields({ control, basePrice, disabled, idPrefix }: PriceModeFieldsProps) {
  const values = useWatch({ control }) as PriceFormValues;
  const preview = previewEffectivePrice(values, basePrice);

  return (
    <div className="flex flex-col gap-4">
      <Controller
        name="mode"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel id={`${idPrefix}-mode-label`}>Outlet price</FieldLabel>
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              aria-labelledby={`${idPrefix}-mode-label`}
              disabled={disabled}
              className="gap-3"
            >
              <label className="flex items-start gap-3 text-sm">
                <RadioGroupItem value="inherit" aria-describedby={`${idPrefix}-inherit-hint`} />
                <span>
                  <span className="font-medium">Use master menu price</span>{' '}
                  <span className="text-muted-foreground tabular-nums">
                    ({formatMoney(basePrice)})
                  </span>
                  <span id={`${idPrefix}-inherit-hint`} className="block text-muted-foreground">
                    Future master price changes apply to this outlet automatically.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <RadioGroupItem value="custom" />
                <span className="font-medium">Set custom outlet price</span>
              </label>
            </RadioGroup>
          </Field>
        )}
      />

      {values.mode === 'custom' && (
        <Controller
          name="customPrice"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${idPrefix}-custom-price`}>Custom price</FieldLabel>
              <div className="relative">
                <span
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground"
                  aria-hidden
                >
                  {CURRENCY_SYMBOL}
                </span>
                <Input
                  {...field}
                  id={`${idPrefix}-custom-price`}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  className="pl-7 tabular-nums"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={`${idPrefix}-custom-hint ${idPrefix}-custom-error`}
                  disabled={disabled}
                />
              </div>
              <FieldDescription id={`${idPrefix}-custom-hint`}>
                Applies to this outlet only. 0 is allowed.
              </FieldDescription>
              <FieldError id={`${idPrefix}-custom-error`} errors={[fieldState.error]} />
            </Field>
          )}
        />
      )}

      <p className="rounded-md bg-muted/50 px-3 py-2 text-sm" aria-live="polite">
        Effective price:{' '}
        <span className="font-medium tabular-nums">{preview ? formatMoney(preview) : '—'}</span>
      </p>
    </div>
  );
}
