import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { outletMenuFiltersSchema } from '@/features/outlet-menu-items/schemas/outlet-menu-item.schemas';
import type { OutletMenuFilters } from '@/features/outlet-menu-items/types/outlet-menu-item.types';

const DEFAULTS: OutletMenuFilters = outletMenuFiltersSchema.parse({});
const KEYS = ['search', 'status', 'sort', 'page'] as const;

export function useOutletMenuFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = outletMenuFiltersSchema.parse(Object.fromEntries(searchParams));

  const setFilters = useCallback(
    (changes: Partial<OutletMenuFilters>, options?: { replace?: boolean }) => {
      setSearchParams(
        (current) => {
          const next = {
            ...outletMenuFiltersSchema.parse(Object.fromEntries(current)),
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
