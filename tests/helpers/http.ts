import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

export function respond<T>(
  config: InternalAxiosRequestConfig,
  status: number,
  data: T,
): Promise<AxiosResponse<T>> {
  const response: AxiosResponse<T> = { data, status, statusText: '', headers: {}, config };
  if (status >= 200 && status < 300) return Promise.resolve(response);
  const code = status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST;
  return Promise.reject(new AxiosError('Request failed', code, config, {}, response));
}

export function failNetwork(config: InternalAxiosRequestConfig): Promise<never> {
  return Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config));
}

export function errorBody(code: string, errors?: { field: string; message: string }[]) {
  return { success: false, message: 'Request failed', code, requestId: 'req-1', errors };
}

export function sessionBody(accessToken: string, userId = 'user-1') {
  return {
    success: true,
    message: 'Token refreshed',
    data: {
      accessToken,
      tokenType: 'Bearer' as const,
      expiresIn: 900,
      user: { id: userId, email: 'admin@example.com', role: 'HQ_ADMIN' as const },
    },
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function bearer(config: InternalAxiosRequestConfig): string | undefined {
  const value = config.headers.get('Authorization');
  return typeof value === 'string' ? value.replace(/^Bearer /, '') : undefined;
}
