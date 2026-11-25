import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffKeys } from '@/features/staff/hooks/staff-query-keys';
import { staffService } from '@/features/staff/services/staff.service';
import type { CreateStaffInput, StaffDetail } from '@/features/staff/types/staff.types';

const SENSITIVE = { gcTime: 0, meta: { suppressErrorToast: true } } as const;

function syncStaff(queryClient: QueryClient, staff: StaffDetail): Promise<void> {
  queryClient.setQueryData(staffKeys.detail(staff.id), staff);
  return queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    ...SENSITIVE,
    mutationFn: (input: CreateStaffInput) => staffService.create(input),
    onSuccess: (staff) => syncStaff(queryClient, staff),
  });
}

export function useUpdateStaffEmail(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => staffService.updateEmail(staffId, email),
    meta: { suppressErrorToast: true },
    onSuccess: (staff) => syncStaff(queryClient, staff),
  });
}

export function useUpdateStaffStatus(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isActive: boolean) => staffService.setStatus(staffId, isActive),
    onSuccess: (staff) => syncStaff(queryClient, staff),
  });
}

export function useReplaceStaffOutlets(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (outletIds: string[]) => staffService.replaceOutlets(staffId, outletIds),
    meta: { suppressErrorToast: true },
    onSuccess: (staff) => syncStaff(queryClient, staff),
  });
}

export function useResetStaffPassword(staffId: string) {
  return useMutation({
    ...SENSITIVE,
    mutationFn: (newPassword: string) => staffService.resetPassword(staffId, newPassword),
  });
}
