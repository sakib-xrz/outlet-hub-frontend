import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { inventoryFiltersSchema } from '@/features/inventory/schemas/inventory.schemas';
import type { InventoryFilters } from '@/features/inventory/types/inventory.types';

const DEFAULTS: InventoryFilters = inventoryFiltersSchema.parse({});
const KEYS = ['search', 'status', 'stockStatus', 'sort', 'page'] as const;

export function useInventoryFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = inventoryFiltersSchema.parse(Object.fromEntries(searchParams));

  const setFilters = useCallback(
    (changes: Partial<InventoryFilters>, options?: { replace?: boolean }) => {
      setSearchParams(
        (current) => {
          const next = {
            ...inventoryFiltersSchema.parse(Object.fromEntries(current)),
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
