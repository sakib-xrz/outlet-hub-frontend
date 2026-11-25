import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { menuItemFiltersSchema } from '@/features/menu-items/schemas/menu-item.schemas';
import type { MenuItemFilters } from '@/features/menu-items/types/menu-item.types';

const DEFAULTS: MenuItemFilters = menuItemFiltersSchema.parse({});
const KEYS = ['search', 'status', 'sort', 'page'] as const;

export function useMenuItemFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = menuItemFiltersSchema.parse(Object.fromEntries(searchParams));

  const setFilters = useCallback(
    (changes: Partial<MenuItemFilters>, options?: { replace?: boolean }) => {
      setSearchParams(
        (current) => {
          const next = {
            ...menuItemFiltersSchema.parse(Object.fromEntries(current)),
            page: 1,
            ...changes,
          };
          const params = new URLSearchParams();
          for (const key of KEYS) {
            if (next[key] !== DEFAULTS[key]) params.set(key, String(next[key]));
          }
          return params;
        },
        { replace: options?.replace ?? false },
      );
    },
    [setSearchParams],
  );

  return { filters, setFilters };
}
