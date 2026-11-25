import { ROUTES } from '@/constants/routes';

const INTERNAL_ORIGIN = 'http://outlethub.internal';

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function getSafeRedirect(
  target: string | null | undefined,
  fallback: string = ROUTES.dashboard,
): string {
  if (!target || !target.startsWith('/') || target.startsWith('//')) return fallback;
  if (target.includes('\\') || hasControlCharacter(target)) return fallback;

  let url: URL;
  try {
    url = new URL(target, INTERNAL_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== INTERNAL_ORIGIN || url.pathname === ROUTES.login) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
