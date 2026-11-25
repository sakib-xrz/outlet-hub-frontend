import type {
  OutletMenuItem,
  PriceFormValues,
} from '@/features/outlet-menu-items/types/outlet-menu-item.types';
import { moneyInputSchema } from '@/lib/utils/money';

export type Availability = { label: string; tone: 'ok' | 'warn' | 'off' };

export type EnablementFlags = Pick<
  OutletMenuItem,
  'outletIsActive' | 'menuItemIsActive' | 'isActive'
>;

export function getDisabledReason(item: EnablementFlags): string | null {
  if (!item.outletIsActive) return 'Outlet inactive';
  if (!item.menuItemIsActive) return 'Master item inactive';
  if (!item.isActive) return 'Assignment inactive';
  return null;
}

export function getAvailability(item: OutletMenuItem): Availability {
  const disabled = getDisabledReason(item);
  if (disabled) return { label: disabled, tone: 'off' };
  if (!item.isSellable) return { label: 'Out of stock', tone: 'warn' };
  return { label: 'Available', tone: 'ok' };
}

export function previewEffectivePrice(values: PriceFormValues, basePrice: string): string | null {
  if (values.mode === 'inherit') return basePrice;
  const parsed = moneyInputSchema.safeParse(values.customPrice);
  return parsed.success ? parsed.data : null;
}
