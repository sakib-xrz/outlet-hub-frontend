import { useInfiniteQuery } from '@tanstack/react-query';
import { outletKeys } from '@/features/outlets/hooks/outlet-query-keys';
import { outletService } from '@/features/outlets/services/outlet.service';

export const OUTLET_OPTIONS_PAGE_SIZE = 50;

export function useOutletOptionsQuery(search: string) {
  return useInfiniteQuery({
    queryKey: [...outletKeys.lists(), 'options', search] as const,
    queryFn: ({ pageParam, signal }) =>
      outletService.list(
        { page: pageParam, search, status: 'all', sort: 'code-asc' },
        signal,
        OUTLET_OPTIONS_PAGE_SIZE,
      ),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
  });
}
