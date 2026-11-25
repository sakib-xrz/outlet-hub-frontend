import type { Location } from 'react-router';
import { REDIRECT_PARAM, ROUTES } from '@/constants/routes';

export function buildLoginPath(location: Pick<Location, 'pathname' | 'search' | 'hash'>): string {
  const destination = `${location.pathname}${location.search}${location.hash}`;
  if (location.pathname === ROUTES.root || location.pathname === ROUTES.dashboard) {
    return ROUTES.login;
  }
  return `${ROUTES.login}?${new URLSearchParams({ [REDIRECT_PARAM]: destination }).toString()}`;
}
