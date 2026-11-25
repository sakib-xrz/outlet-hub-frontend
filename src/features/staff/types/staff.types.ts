import type { z } from 'zod';
import type {
  STAFF_SORT_OPTIONS,
  createStaffFormSchema,
  editStaffFormSchema,
  resetPasswordFormSchema,
  staffDetailSchema,
  staffFiltersSchema,
  staffOutletSchema,
  staffPageSchema,
  staffSummarySchema,
} from '@/features/staff/schemas/staff.schemas';

export type StaffSummary = z.infer<typeof staffSummarySchema>;
export type StaffDetail = z.infer<typeof staffDetailSchema>;
export type StaffOutlet = z.infer<typeof staffOutletSchema>;
export type StaffPage = z.infer<typeof staffPageSchema>;
export type StaffFilters = z.infer<typeof staffFiltersSchema>;
export type StaffSort = keyof typeof STAFF_SORT_OPTIONS;
export type CreateStaffFormValues = z.input<typeof createStaffFormSchema>;
export type CreateStaffFormOutput = z.output<typeof createStaffFormSchema>;
export type EditStaffFormValues = z.input<typeof editStaffFormSchema>;
export type ResetPasswordFormValues = z.input<typeof resetPasswordFormSchema>;
export type CreateStaffInput = { email: string; password: string; outletIds: string[] };
