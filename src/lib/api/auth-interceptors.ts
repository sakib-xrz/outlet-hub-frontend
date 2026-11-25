import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { isAxiosError } from 'axios';
import { ApiError, normalizeApiError } from '@/lib/api/errors';

export type AuthInterceptorOptions = {
  getAccessToken: () => string | null;
  isAccessTokenExpiring: () => boolean;
  refreshSession: () => Promise<string | null>;
  getSessionSignal: () => AbortSignal;
};

const SAFE_METHODS = new Set(['get', 'head', 'options']);

function withSessionSignal(config: InternalAxiosRequestConfig, sessionSignal: AbortSignal): void {
  const { signal } = config;
  config.signal =
    signal instanceof AbortSignal ? AbortSignal.any([signal, sessionSignal]) : sessionSignal;
}

function canReplay(config: InternalAxiosRequestConfig): boolean {
  return SAFE_METHODS.has((config.method ?? 'get').toLowerCase()) || !!config.retryAfterRefresh;
}

export function attachAuthInterceptors(
  client: AxiosInstance,
  options: AuthInterceptorOptions,
): () => void {
  const sentTokens = new WeakMap<InternalAxiosRequestConfig, string>();

  const requestId = client.interceptors.request.use(async (config) => {
    let token = options.getAccessToken();
    if (token && options.isAccessTokenExpiring()) {
      token = await options.refreshSession();
      if (!token) throw new ApiError({ kind: 'session_expired' });
    }
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
      sentTokens.set(config, token);
      withSessionSignal(config, options.getSessionSignal());
    }
    return config;
  });

  const responseId = client.interceptors.response.use(undefined, async (error: unknown) => {
    const config = isAxiosError(error) ? error.config : undefined;
    const sentToken = config && sentTokens.get(config);
    const unauthorized = isAxiosError(error) && error.response?.status === 401;

    if (!config || !sentToken || !unauthorized || config.isAuthReplay) {
      throw normalizeApiError(error);
    }

    const current = options.getAccessToken();
    const token = current && current !== sentToken ? current : await options.refreshSession();
    if (!token) throw new ApiError({ kind: 'session_expired', status: 401 });

    if (!canReplay(config)) {
      throw new ApiError({
        kind: 'unauthenticated',
        status: 401,
        message: 'Your session was renewed. Please try again.',
      });
    }

    return client.request({ ...config, isAuthReplay: true });
  });

  return () => {
    client.interceptors.request.eject(requestId);
    client.interceptors.response.eject(responseId);
  };
}
