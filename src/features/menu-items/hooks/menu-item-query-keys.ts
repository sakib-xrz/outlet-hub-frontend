import type { MenuItemFilters } from '@/features/menu-items/types/menu-item.types';

export const menuItemKeys = {
  all: ['menu-items'] as const,
  lists: () => [...menuItemKeys.all, 'list'] as const,
  list: (filters: MenuItemFilters) => [...menuItemKeys.lists(), filters] as const,
  details: () => [...menuItemKeys.all, 'detail'] as const,
  detail: (id: string) => [...menuItemKeys.details(), id] as const,
};
