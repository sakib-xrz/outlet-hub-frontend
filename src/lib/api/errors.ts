import { isAxiosError } from 'axios';
import { z } from 'zod';

export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'canceled'
  | 'invalid_credentials'
  | 'session_expired'
  | 'unauthenticated'
  | 'forbidden'
  | 'validation'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'server'
  | 'unknown';

export type FieldError = { field: string; message: string };

const DEFAULT_MESSAGES: Record<ApiErrorKind, string> = {
  network: 'Unable to reach the server. Check your connection and try again.',
  timeout: 'The server took too long to respond. Please try again.',
  canceled: 'The request was canceled.',
  invalid_credentials: 'Invalid email or password.',
  session_expired: 'Your session has expired. Please sign in again.',
  unauthenticated: 'You need to sign in to continue.',
  forbidden: 'You do not have permission to perform this action.',
  validation: 'Some of the information provided is invalid.',
  not_found: 'The requested resource was not found.',
  conflict: 'This change conflicts with the current state. Refresh and try again.',
  rate_limited: 'Too many attempts. Please wait a few minutes and try again.',
  server: 'Something went wrong on our side. Please try again later.',
  unknown: 'An unexpected error occurred.',
};

const errorBodySchema = z.object({
  success: z.literal(false),
  code: z.string(),
  requestId: z.string().optional(),
  errors: z.array(z.object({ field: z.string().optional(), message: z.string() })).optional(),
});

type ApiErrorInit = {
  kind: ApiErrorKind;
  message?: string;
  status?: number;
  code?: string;
  requestId?: string;
  fieldErrors?: FieldError[];
};

export class ApiError extends Error {
  public readonly kind: ApiErrorKind;
  public readonly status: number | undefined;
  public readonly code: string | undefined;
  public readonly requestId: string | undefined;
  public readonly fieldErrors: FieldError[];

  public constructor({ kind, message, status, code, requestId, fieldErrors = [] }: ApiErrorInit) {
    super(message ?? DEFAULT_MESSAGES[kind]);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.fieldErrors = fieldErrors;
  }
}

function kindForStatus(status: number, unauthorizedKind: ApiErrorKind | undefined): ApiErrorKind {
  if (status === 401) return unauthorizedKind ?? 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 400 || status === 422) return 'validation';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}

function toFieldErrors(
  errors: { field?: string | undefined; message: string }[] = [],
): FieldError[] {
  return errors.flatMap(({ field, message }) =>
    field ? [{ field: field.replace(/^(body|query|params)\./, ''), message }] : [],
  );
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (!isAxiosError(error)) return new ApiError({ kind: 'unknown' });

  if (error.code === 'ERR_CANCELED') return new ApiError({ kind: 'canceled' });
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return new ApiError({ kind: 'timeout' });
  }
  if (!error.response) return new ApiError({ kind: 'network' });

  const { status } = error.response;
  const body = errorBodySchema.safeParse(error.response.data as unknown);
  const kind = kindForStatus(status, error.config?.unauthorizedKind);

  return new ApiError({
    kind,
    status,
    ...(body.success && { code: body.data.code }),
    ...(body.success && body.data.requestId && { requestId: body.data.requestId }),
    fieldErrors: body.success ? toFieldErrors(body.data.errors) : [],
  });
}
