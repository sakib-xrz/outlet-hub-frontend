import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { outletFiltersSchema } from '@/features/outlets/schemas/outlet.schemas';
import type { OutletFilters } from '@/features/outlets/types/outlet.types';

const DEFAULTS: OutletFilters = outletFiltersSchema.parse({});

export function useOutletFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = outletFiltersSchema.parse(Object.fromEntries(searchParams));

  const setFilters = useCallback(
    (changes: Partial<OutletFilters>, options?: { replace?: boolean }) => {
      setSearchParams(
        (current) => {
          const next = {
            ...outletFiltersSchema.parse(Object.fromEntries(current)),
            page: 1,
            ...changes,
          };
          const params = new URLSearchParams();
          for (const key of ['search', 'status', 'sort', 'page'] as const) {
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
