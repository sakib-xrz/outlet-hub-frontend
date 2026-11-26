import { describe, expect, it } from 'vitest';
import { getSafeRedirect } from '@/lib/utils/safe-redirect';

describe('getSafeRedirect', () => {
  it('keeps internal paths including query and hash', () => {
    expect(getSafeRedirect('/dashboard?tab=1#top')).toBe('/dashboard?tab=1#top');
  });

  it.each([
    null,
    '',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    'javascript:alert(1)',
    'dashboard',
    '/login',
    '/unauthorized',
  ])('falls back for unsafe or looping target %s', (target) => {
    expect(getSafeRedirect(target)).toBe('/dashboard');
  });

  it('falls back for /unauthorized with a query string', () => {
    expect(getSafeRedirect('/unauthorized?reason=forbidden')).toBe('/dashboard');
  });

  it('falls back for /unauthorized with a hash', () => {
    expect(getSafeRedirect('/unauthorized#section')).toBe('/dashboard');
  });
});
