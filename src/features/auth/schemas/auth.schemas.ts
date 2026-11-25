import { z } from 'zod';

export const roleSchema = z.enum(['HQ_ADMIN', 'OUTLET_STAFF']);

export const userSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  role: roleSchema,
});

export const sessionPayloadSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive(),
  user: userSchema,
});

export const currentUserPayloadSchema = z.object({ user: userSchema });

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .max(320, 'Email must be at most 320 characters.')
    .pipe(z.email('Enter a valid email address.'))
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(1, 'Enter your password.')
    .min(8, 'Password must be at least 8 characters.')
    .max(1024, 'Password must be at most 1024 characters.'),
});
