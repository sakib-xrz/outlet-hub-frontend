import 'axios';

declare module 'axios' {
  interface AxiosRequestConfig {
    unauthorizedKind?: 'invalid_credentials' | 'session_expired';
    retryAfterRefresh?: boolean;
    isAuthReplay?: boolean;
  }
}
