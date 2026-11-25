import type { z } from 'zod';
import type {
  OUTLET_SORT_OPTIONS,
  createOutletFormSchema,
  outletFiltersSchema,
  outletPageSchema,
  outletSchema,
  updateOutletFormSchema,
} from '@/features/outlets/schemas/outlet.schemas';

export type Outlet = z.infer<typeof outletSchema>;
export type OutletPage = z.infer<typeof outletPageSchema>;
export type OutletFilters = z.infer<typeof outletFiltersSchema>;
export type OutletSort = keyof typeof OUTLET_SORT_OPTIONS;
export type CreateOutletFormValues = z.input<typeof createOutletFormSchema>;
export type CreateOutletInput = z.output<typeof createOutletFormSchema>;
export type UpdateOutletFormValues = z.input<typeof updateOutletFormSchema>;
export type UpdateOutletInput = z.output<typeof updateOutletFormSchema>;
