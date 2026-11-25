import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuItemKeys } from '@/features/menu-items/hooks/menu-item-query-keys';
import { inventoryKeys } from '@/features/inventory/hooks/inventory-query-keys';
import { outletMenuKeys } from '@/features/outlet-menu-items/hooks/outlet-menu-query-keys';
import { menuItemService } from '@/features/menu-items/services/menu-item.service';
import type {
  CreateMenuItemInput,
  MenuItem,
  UpdateMenuItemInput,
} from '@/features/menu-items/types/menu-item.types';

function syncMenuItem(queryClient: QueryClient, item: MenuItem): Promise<void> {
  queryClient.setQueryData(menuItemKeys.detail(item.id), item);
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: menuItemKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: outletMenuKeys.all }),
    queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
  ]).then(() => undefined);
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMenuItemInput) => menuItemService.create(input),
    meta: { suppressErrorToast: true },
    onSuccess: (item) => syncMenuItem(queryClient, item),
  });
}

export function useUpdateMenuItem(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMenuItemInput) => menuItemService.update(id, input),
    meta: { suppressErrorToast: true },
    onSuccess: (item) => syncMenuItem(queryClient, item),
  });
}

export function useUpdateMenuItemStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) => menuItemService.setStatus(id, isActive),
    onSuccess: (item) => syncMenuItem(queryClient, item),
  });
}
