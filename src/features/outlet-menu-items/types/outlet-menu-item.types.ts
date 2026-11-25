import type { z } from 'zod';
import type {
  outletMenuFiltersSchema,
  outletMenuItemSchema,
  outletMenuPageSchema,
  priceFormSchema,
} from '@/features/outlet-menu-items/schemas/outlet-menu-item.schemas';

export type OutletMenuItem = z.infer<typeof outletMenuItemSchema>;
export type OutletMenuPage = z.infer<typeof outletMenuPageSchema>;
export type OutletMenuFilters = z.infer<typeof outletMenuFiltersSchema>;
export type PriceFormValues = z.input<typeof priceFormSchema>;
export type PriceFormOutput = z.output<typeof priceFormSchema>;
