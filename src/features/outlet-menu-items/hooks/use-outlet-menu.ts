import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { outletMenuKeys } from '@/features/outlet-menu-items/hooks/outlet-menu-query-keys';
import { outletMenuItemService } from '@/features/outlet-menu-items/services/outlet-menu-item.service';
import type {
  OutletMenuFilters,
  OutletMenuItem,
} from '@/features/outlet-menu-items/types/outlet-menu-item.types';

export function useOutletMenuQuery(outletId: string, filters: OutletMenuFilters) {
  return useQuery({
    queryKey: outletMenuKeys.list(outletId, filters),
    queryFn: ({ signal }) => outletMenuItemService.list(outletId, filters, signal),
    placeholderData: keepPreviousData,
  });
}

function syncAssignment(queryClient: QueryClient, item: OutletMenuItem): Promise<void> {
  queryClient.setQueryData(outletMenuKeys.detail(item.outletId, item.menuItemId), item);
  return queryClient.invalidateQueries({ queryKey: outletMenuKeys.lists(item.outletId) });
}

export function useAssignMenuItem(outletId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { menuItemId: string; overridePrice: string | null }) =>
      outletMenuItemService.assign(outletId, input),
    meta: { suppressErrorToast: true },
    onSuccess: (item) => syncAssignment(queryClient, item),
  });
}

export function useSetOverridePrice(outletId: string, menuItemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (overridePrice: string | null) =>
      outletMenuItemService.setOverridePrice(outletId, menuItemId, overridePrice),
    meta: { suppressErrorToast: true },
    onSuccess: (item) => syncAssignment(queryClient, item),
  });
}

export function useSetAssignmentStatus(outletId: string, menuItemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) =>
      outletMenuItemService.setStatus(outletId, menuItemId, isActive),
    onSuccess: (item) => syncAssignment(queryClient, item),
  });
}
