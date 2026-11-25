import type { z } from 'zod';
import type {
  loginFormSchema,
  roleSchema,
  sessionPayloadSchema,
  userSchema,
} from '@/features/auth/schemas/auth.schemas';

export type Role = z.infer<typeof roleSchema>;
export type User = z.infer<typeof userSchema>;
export type SessionPayload = z.infer<typeof sessionPayloadSchema>;
export type LoginFormValues = z.input<typeof loginFormSchema>;
export type LoginCredentials = z.output<typeof loginFormSchema>;
export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated';
