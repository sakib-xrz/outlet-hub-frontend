import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default defineConfig((configEnv) =>
  mergeConfig(viteConfig(configEnv), {
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['tests/unit/**/*.test.{ts,tsx}'],
      setupFiles: ['tests/setup.ts'],
      env: { VITE_API_BASE_URL: 'http://api.test.invalid/api/v1' },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/components/ui/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      },
    },
  }),
);
