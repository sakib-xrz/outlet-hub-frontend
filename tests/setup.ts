import '@testing-library/jest-dom/vitest';
import axios from 'axios';
import { beforeEach, vi } from 'vitest';

axios.defaults.adapter = (config) =>
  Promise.reject(
    new Error(`Unmocked network request: ${config.method ?? 'get'} ${config.url ?? ''}`),
  );

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

beforeEach(() => {
  localStorage.clear();
});
