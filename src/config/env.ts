import { parseClientEnv } from '@/config/env-schema';

export const env = parseClientEnv(import.meta.env, { production: import.meta.env.PROD });
