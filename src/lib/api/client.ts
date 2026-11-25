import axios, { type CreateAxiosDefaults } from 'axios';
import { env } from '@/config/env';
import { normalizeApiError } from '@/lib/api/errors';

const defaults: CreateAxiosDefaults = {
  baseURL: env.apiBaseUrl,
  timeout: 15_000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
};

export const apiClient = axios.create(defaults);

export const authClient = axios.create(defaults);
authClient.interceptors.response.use(undefined, (error: unknown) =>
  Promise.reject(normalizeApiError(error)),
);
