import { randomBytes } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

const databaseUrl = process.env.E2E_DATABASE_URL ?? '';
const host = (() => {
  try {
    return new URL(databaseUrl).hostname;
  } catch {
    return '';
  }
})();
if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
  throw new Error(
    'E2E_DATABASE_URL must point to a local, disposable, migrated PostgreSQL database.',
  );
}

const API_PORT = 3100;
const WEB_PORT = 5174;
const WEB_ORIGIN = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: WEB_ORIGIN,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'pnpm --dir ../backend exec tsx src/server.ts',
      url: `http://localhost:${API_PORT}/api/v1/health/ready`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NODE_ENV: 'development',
        PORT: String(API_PORT),
        DATABASE_URL: databaseUrl,
        JWT_SECRET: randomBytes(48).toString('hex'),
        ALLOWED_ORIGINS: WEB_ORIGIN,
        COOKIE_SECURE: 'false',
        COOKIE_SAME_SITE: 'strict',
        AUTH_RATE_LIMIT_MAX: '1000',
        GLOBAL_RATE_LIMIT_MAX: '100000',
        LOG_LEVEL: 'warn',
        SWAGGER_ENABLED: 'false',
      },
    },
    {
      command: `pnpm exec vite --port ${WEB_PORT} --strictPort`,
      url: WEB_ORIGIN,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_API_BASE_URL: `http://localhost:${API_PORT}/api/v1` },
    },
  ],
});
