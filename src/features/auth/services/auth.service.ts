import { apiClient, authClient } from '@/lib/api/client';
import { parseResponse, successResponseSchema } from '@/lib/api/contracts';
import {
  currentUserPayloadSchema,
  sessionPayloadSchema,
} from '@/features/auth/schemas/auth.schemas';
import type { LoginCredentials, SessionPayload, User } from '@/features/auth/types/auth.types';

const sessionResponse = successResponseSchema(sessionPayloadSchema);
const currentUserResponse = successResponseSchema(currentUserPayloadSchema);

export const authService = {
  async login(credentials: LoginCredentials): Promise<SessionPayload> {
    const response = await authClient.post('/auth/login', credentials, {
      unauthorizedKind: 'invalid_credentials',
    });
    return parseResponse(sessionResponse, response.data).data;
  },

  async refresh(): Promise<SessionPayload> {
    const response = await authClient.post('/auth/refresh', undefined, {
      unauthorizedKind: 'session_expired',
    });
    return parseResponse(sessionResponse, response.data).data;
  },

  async logout(): Promise<void> {
    await authClient.post('/auth/logout');
  },

  async getCurrentUser(signal?: AbortSignal): Promise<User> {
    const response = await apiClient.get('/auth/me', signal ? { signal } : {});
    return parseResponse(currentUserResponse, response.data).data.user;
  },
};
