import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { outletKeys } from '@/features/outlets/hooks/outlet-query-keys';
import { outletService } from '@/features/outlets/services/outlet.service';
import type { OutletFilters } from '@/features/outlets/types/outlet.types';

export function useOutletsQuery(filters: OutletFilters) {
  return useQuery({
    queryKey: outletKeys.list(filters),
    queryFn: ({ signal }) => outletService.list(filters, signal),
    placeholderData: keepPreviousData,
  });
}
