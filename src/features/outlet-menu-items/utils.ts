import type {
  OutletMenuItem,
  PriceFormValues,
} from '@/features/outlet-menu-items/types/outlet-menu-item.types';
import { moneyInputSchema } from '@/lib/utils/money';

export type Availability = { label: string; tone: 'ok' | 'warn' | 'off' };

export function getAvailability(item: OutletMenuItem): Availability {
  if (!item.outletIsActive) return { label: 'Outlet inactive', tone: 'off' };
  if (!item.menuItemIsActive) return { label: 'Master item inactive', tone: 'off' };
  if (!item.isActive) return { label: 'Assignment inactive', tone: 'off' };
  if (!item.isSellable) return { label: 'Out of stock', tone: 'warn' };
  return { label: 'Available', tone: 'ok' };
}

export function previewEffectivePrice(values: PriceFormValues, basePrice: string): string | null {
  if (values.mode === 'inherit') return basePrice;
  const parsed = moneyInputSchema.safeParse(values.customPrice);
  return parsed.success ? parsed.data : null;
}
