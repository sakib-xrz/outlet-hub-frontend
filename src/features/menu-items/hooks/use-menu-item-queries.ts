import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { menuItemKeys } from '@/features/menu-items/hooks/menu-item-query-keys';
import { menuItemService } from '@/features/menu-items/services/menu-item.service';
import type { MenuItemFilters } from '@/features/menu-items/types/menu-item.types';

export function useMenuItemsQuery(filters: MenuItemFilters) {
  return useQuery({
    queryKey: menuItemKeys.list(filters),
    queryFn: ({ signal }) => menuItemService.list(filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useMenuItemQuery(id: string) {
  return useQuery({
    queryKey: menuItemKeys.detail(id),
    queryFn: ({ signal }) => menuItemService.get(id, signal),
  });
}
