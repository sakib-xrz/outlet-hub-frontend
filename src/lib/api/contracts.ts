import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';

export function successResponseSchema<T extends z.ZodType>(data: T) {
  return z.object({ success: z.literal(true), message: z.string(), data });
}

export function parseResponse<T extends z.ZodType>(schema: T, payload: unknown): z.infer<T> {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new ApiError({
      kind: 'unknown',
      message: 'Received an unexpected response from the server.',
    });
  }
  return result.data;
}
