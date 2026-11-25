import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { outletKeys } from '@/features/outlets/hooks/outlet-query-keys';
import { outletService } from '@/features/outlets/services/outlet.service';
import type {
  CreateOutletInput,
  Outlet,
  UpdateOutletInput,
} from '@/features/outlets/types/outlet.types';

function syncOutlet(queryClient: QueryClient, outlet: Outlet): Promise<void> {
  queryClient.setQueryData(outletKeys.detail(outlet.id), outlet);
  return queryClient.invalidateQueries({ queryKey: outletKeys.lists() });
}

export function useCreateOutlet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOutletInput) => outletService.create(input),
    meta: { suppressErrorToast: true },
    onSuccess: (outlet) => syncOutlet(queryClient, outlet),
  });
}

export function useUpdateOutlet(outletId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOutletInput) => outletService.update(outletId, input),
    meta: { suppressErrorToast: true },
    onSuccess: (outlet) => syncOutlet(queryClient, outlet),
  });
}

export function useUpdateOutletStatus(outletId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) => outletService.setStatus(outletId, isActive),
    onSuccess: (outlet) => syncOutlet(queryClient, outlet),
  });
}
