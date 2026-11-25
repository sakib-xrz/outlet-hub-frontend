import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { attachAuthInterceptors, type AuthInterceptorOptions } from '@/lib/api/auth-interceptors';
import { ApiError } from '@/lib/api/errors';
import { bearer, errorBody, failNetwork, respond } from '../../helpers/http';

let client: AxiosInstance;
let token: string | null;
let sessionController: AbortController;
let requests: InternalAxiosRequestConfig[];
let options: AuthInterceptorOptions & { refreshSession: ReturnType<typeof vi.fn> };

function serve(handler: (config: InternalAxiosRequestConfig) => Promise<unknown>) {
  client.defaults.adapter = (config) => {
    requests.push(config);
    return handler(config) as never;
  };
}

const rejectExpired = (config: InternalAxiosRequestConfig) =>
  bearer(config) === 'fresh'
    ? respond(config, 200, { ok: true })
    : respond(config, 401, errorBody('AUTHENTICATION_ERROR'));

beforeEach(() => {
  client = axios.create({ baseURL: 'http://api.test.invalid/api/v1' });
  token = 'stale';
  sessionController = new AbortController();
  requests = [];
  options = {
    getAccessToken: () => token,
    isAccessTokenExpiring: () => false,
    getSessionSignal: () => sessionController.signal,
    refreshSession: vi.fn(() => {
      token = 'fresh';
      return Promise.resolve(token);
    }),
  };
  attachAuthInterceptors(client, options);
});

describe('attachAuthInterceptors', () => {
  it('injects the in-memory bearer token', async () => {
    serve((config) => respond(config, 200, {}));
    await client.get('/resource');
    expect(requests.map(bearer)).toEqual(['stale']);
  });

  it('refreshes once and replays a safe request with the new token', async () => {
    serve(rejectExpired);
    await expect(client.get('/resource')).resolves.toMatchObject({ data: { ok: true } });
    expect(options.refreshSession).toHaveBeenCalledTimes(1);
    expect(requests.map(bearer)).toEqual(['stale', 'fresh']);
  });

  it('reuses a token refreshed by a concurrent request instead of refreshing again', async () => {
    serve((config) => {
      if (bearer(config) === 'stale') token = 'fresh';
      return rejectExpired(config);
    });
    await client.get('/resource');
    expect(options.refreshSession).not.toHaveBeenCalled();
    expect(requests.map(bearer)).toEqual(['stale', 'fresh']);
  });

  it('refreshes but never replays a non-idempotent mutation', async () => {
    serve(rejectExpired);
    await expect(client.post('/orders', { total: 1 })).rejects.toMatchObject({
      kind: 'unauthenticated',
      message: 'Your session was renewed. Please try again.',
    });
    expect(options.refreshSession).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(1);
  });

  it('replays a mutation only when it is explicitly marked safe', async () => {
    serve(rejectExpired);
    await client.post('/idempotent', {}, { retryAfterRefresh: true });
    expect(requests.map(bearer)).toEqual(['stale', 'fresh']);
  });

  it('retries at most once to prevent refresh loops', async () => {
    serve((config) => respond(config, 401, errorBody('AUTHENTICATION_ERROR')));
    await expect(client.get('/resource')).rejects.toMatchObject({ kind: 'unauthenticated' });
    expect(options.refreshSession).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(2);
  });

  it('reports an expired session when refresh finds no valid session', async () => {
    options.refreshSession.mockResolvedValueOnce(null);
    serve(rejectExpired);
    await expect(client.get('/resource')).rejects.toMatchObject({ kind: 'session_expired' });
  });

  it('surfaces refresh network failures without converting them to logouts', async () => {
    options.refreshSession.mockRejectedValueOnce(new ApiError({ kind: 'network' }));
    serve(rejectExpired);
    await expect(client.get('/resource')).rejects.toMatchObject({ kind: 'network' });
  });

  it('does not refresh for unauthenticated requests or other errors', async () => {
    token = null;
    serve((config) => respond(config, 401, errorBody('AUTHENTICATION_ERROR')));
    await expect(client.get('/resource')).rejects.toMatchObject({ kind: 'unauthenticated' });

    token = 'stale';
    serve((config) => respond(config, 403, errorBody('AUTHORIZATION_ERROR')));
    await expect(client.get('/resource')).rejects.toMatchObject({ kind: 'forbidden' });
    expect(options.refreshSession).not.toHaveBeenCalled();
  });

  it('refreshes proactively before sending with an expiring token', async () => {
    options.isAccessTokenExpiring = () => token === 'stale';
    serve(rejectExpired);
    await client.post('/orders', {});
    expect(options.refreshSession).toHaveBeenCalledTimes(1);
    expect(requests.map(bearer)).toEqual(['fresh']);
  });

  it('cancels in-flight authenticated requests when the session ends', async () => {
    serve(
      (config) =>
        new Promise((_resolve, reject) => {
          config.signal?.addEventListener?.('abort', () =>
            reject(new axios.CanceledError(undefined, undefined, config)),
          );
        }),
    );
    const pending = client.get('/resource');
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    sessionController.abort();
    await expect(pending).rejects.toMatchObject({ kind: 'canceled' });
  });

  it('normalizes transport errors', async () => {
    serve(failNetwork);
    await expect(client.get('/resource')).rejects.toBeInstanceOf(ApiError);
  });
});
