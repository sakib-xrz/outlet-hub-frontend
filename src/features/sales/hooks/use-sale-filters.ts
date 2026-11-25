import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { saleFiltersSchema } from '@/features/sales/schemas/sale.schemas';
import type { SaleFilters } from '@/features/sales/types/sale.types';

const DEFAULTS: SaleFilters = saleFiltersSchema.parse({});
const KEYS = ['search', 'sort', 'page'] as const;

export function useSaleFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = saleFiltersSchema.parse(Object.fromEntries(searchParams));

  const setFilters = useCallback(
    (changes: Partial<SaleFilters>, options?: { replace?: boolean }) => {
      setSearchParams(
        (current) => {
          const next = {
            ...saleFiltersSchema.parse(Object.fromEntries(current)),
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
