import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { staffKeys } from '@/features/staff/hooks/staff-query-keys';
import { staffService } from '@/features/staff/services/staff.service';
import type { StaffFilters } from '@/features/staff/types/staff.types';

export function useStaffListQuery(filters: StaffFilters) {
  return useQuery({
    queryKey: staffKeys.list(filters),
    queryFn: ({ signal }) => staffService.list(filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useStaffQuery(staffId: string) {
  return useQuery({
    queryKey: staffKeys.detail(staffId),
    queryFn: ({ signal }) => staffService.get(staffId, signal),
  });
}
