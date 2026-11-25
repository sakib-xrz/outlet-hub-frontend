import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { parseClientEnv } from './src/config/env-schema.ts';

export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    parseClientEnv(loadEnv(mode, process.cwd(), 'VITE_'), { production: mode === 'production' });
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { port: 5173, strictPort: true },
    preview: { port: 4173, strictPort: true },
    build: { target: 'es2022' },
  };
});
