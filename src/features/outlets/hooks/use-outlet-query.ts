import { useQuery } from '@tanstack/react-query';
import { outletKeys } from '@/features/outlets/hooks/outlet-query-keys';
import { outletService } from '@/features/outlets/services/outlet.service';

export function useOutletQuery(outletId: string) {
  return useQuery({
    queryKey: outletKeys.detail(outletId),
    queryFn: ({ signal }) => outletService.get(outletId, signal),
  });
}
