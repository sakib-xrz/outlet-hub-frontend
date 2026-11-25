import { AxiosError, type InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiError, normalizeApiError } from '@/lib/api/errors';
import { errorBody } from '../../helpers/http';

function httpError(
  status: number,
  data: unknown,
  config: Partial<InternalAxiosRequestConfig> = {},
) {
  const request = { headers: new AxiosHeaders(), ...config } as InternalAxiosRequestConfig;
  return new AxiosError(
    'Request failed',
    'ERR_BAD_REQUEST',
    request,
    {},
    {
      data,
      status,
      statusText: '',
      headers: {},
      config: request,
    },
  );
}

describe('normalizeApiError', () => {
  it('distinguishes 401 meanings using the request context', () => {
    const body = errorBody('AUTHENTICATION_ERROR');
    expect(
      normalizeApiError(httpError(401, body, { unauthorizedKind: 'invalid_credentials' })).kind,
    ).toBe('invalid_credentials');
    expect(
      normalizeApiError(httpError(401, body, { unauthorizedKind: 'session_expired' })).kind,
    ).toBe('session_expired');
    expect(normalizeApiError(httpError(401, body)).kind).toBe('unauthenticated');
  });

  it('maps validation details to form field names', () => {
    const error = normalizeApiError(
      httpError(
        400,
        errorBody('VALIDATION_ERROR', [{ field: 'body.email', message: 'Invalid email' }]),
      ),
    );
    expect(error).toMatchObject({
      kind: 'validation',
      code: 'VALIDATION_ERROR',
      requestId: 'req-1',
    });
    expect(error.fieldErrors).toEqual([{ field: 'email', message: 'Invalid email' }]);
  });

  it.each([
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [429, 'rate_limited'],
    [500, 'server'],
    [503, 'server'],
  ] as const)('maps status %i to %s', (status, kind) => {
    expect(normalizeApiError(httpError(status, errorBody('X'))).kind).toBe(kind);
  });

  it('never exposes raw server messages', () => {
    const error = normalizeApiError(
      httpError(500, {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'relation "users" does not exist',
      }),
    );
    expect(error.message).not.toContain('relation');
  });

  it('classifies transport failures', () => {
    const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
    expect(normalizeApiError(new AxiosError('x', AxiosError.ERR_NETWORK, config)).kind).toBe(
      'network',
    );
    expect(normalizeApiError(new AxiosError('x', AxiosError.ECONNABORTED, config)).kind).toBe(
      'timeout',
    );
    expect(normalizeApiError(new AxiosError('x', AxiosError.ERR_CANCELED, config)).kind).toBe(
      'canceled',
    );
  });

  it('passes through ApiError and wraps unknown values', () => {
    const existing = new ApiError({ kind: 'forbidden' });
    expect(normalizeApiError(existing)).toBe(existing);
    expect(normalizeApiError(new TypeError('boom'))).toMatchObject({ kind: 'unknown' });
  });
});
