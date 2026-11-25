import { useInfiniteQuery } from '@tanstack/react-query';
import { menuItemKeys } from '@/features/menu-items/hooks/menu-item-query-keys';
import { menuItemService } from '@/features/menu-items/services/menu-item.service';

export function useActiveMenuItemOptionsQuery(search: string) {
  return useInfiniteQuery({
    queryKey: [...menuItemKeys.lists(), 'assign-options', search] as const,
    queryFn: ({ pageParam, signal }) =>
      menuItemService.list({ page: pageParam, search, status: 'active', sort: 'name-asc' }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
  });
}
