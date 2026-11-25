import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { staffFiltersSchema } from '@/features/staff/schemas/staff.schemas';
import type { StaffFilters } from '@/features/staff/types/staff.types';

const DEFAULTS: StaffFilters = staffFiltersSchema.parse({});
const KEYS = ['search', 'status', 'outletId', 'sort', 'page'] as const;

export function useStaffFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = staffFiltersSchema.parse(Object.fromEntries(searchParams));

  const setFilters = useCallback(
    (changes: Partial<StaffFilters>, options?: { replace?: boolean }) => {
      setSearchParams(
        (current) => {
          const next = {
            ...staffFiltersSchema.parse(Object.fromEntries(current)),
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
