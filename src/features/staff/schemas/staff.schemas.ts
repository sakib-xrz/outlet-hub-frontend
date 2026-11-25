import { z } from 'zod';

export const STAFF_PAGE_SIZE = 20;
export const STAFF_PASSWORD_MIN_LENGTH = 12;
export const STAFF_PASSWORD_MAX_LENGTH = 128;

const identity = {
  id: z.uuid(),
  email: z.string(),
  role: z.literal('OUTLET_STAFF'),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
};

export const staffSummarySchema = z.object({ ...identity, outletCount: z.number().int() });

export const staffOutletSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  isActive: z.boolean(),
});

export const staffDetailSchema = z.object({ ...identity, outlets: z.array(staffOutletSchema) });

export const staffPageSchema = z.object({
  items: z.array(staffSummarySchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});

export const staffPayloadSchema = z.object({ staff: staffDetailSchema });

export const staffEmailSchema = z
  .string()
  .trim()
  .min(1, 'Enter an email address.')
  .max(320, 'Email must be at most 320 characters.')
  .pipe(z.email('Enter a valid email address.'))
  .transform((email) => email.toLowerCase());

export const newPasswordSchema = z
  .string()
  .min(STAFF_PASSWORD_MIN_LENGTH, `Use at least ${STAFF_PASSWORD_MIN_LENGTH} characters.`)
  .max(STAFF_PASSWORD_MAX_LENGTH, `Use at most ${STAFF_PASSWORD_MAX_LENGTH} characters.`)
  .refine((value) => value.trim().length >= STAFF_PASSWORD_MIN_LENGTH, {
    error: 'Password must not be mostly spaces.',
  });

const outletOptionSchema = staffOutletSchema;

export const createStaffFormSchema = z
  .object({
    email: staffEmailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm the password.'),
    outlets: z.array(outletOptionSchema),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Passwords do not match.',
  })
  .refine((value) => value.password.toLowerCase() !== value.email, {
    path: ['password'],
    error: 'Password must not be the email address.',
  });

export const editStaffFormSchema = z.object({ email: staffEmailSchema });

export const resetPasswordFormSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm the password.'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Passwords do not match.',
  });

export const STAFF_STATUS_FILTERS = ['all', 'active', 'inactive'] as const;
export const STAFF_SORT_OPTIONS = {
  newest: { sortBy: 'createdAt', sortOrder: 'desc', label: 'Newest first' },
  oldest: { sortBy: 'createdAt', sortOrder: 'asc', label: 'Oldest first' },
  'email-asc': { sortBy: 'email', sortOrder: 'asc', label: 'Email A–Z' },
  'email-desc': { sortBy: 'email', sortOrder: 'desc', label: 'Email Z–A' },
  updated: { sortBy: 'updatedAt', sortOrder: 'desc', label: 'Recently updated' },
} as const;

export const staffFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  search: z.string().trim().max(100).catch(''),
  status: z.enum(STAFF_STATUS_FILTERS).catch('all'),
  outletId: z.union([z.uuid(), z.literal('')]).catch(''),
  sort: z
    .enum(Object.keys(STAFF_SORT_OPTIONS) as [keyof typeof STAFF_SORT_OPTIONS])
    .catch('newest'),
});
