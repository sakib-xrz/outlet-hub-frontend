import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { outletKeys } from '@/features/outlets/hooks/outlet-query-keys';
import { outletService } from '@/features/outlets/services/outlet.service';
import { STAFF_SORT_OPTIONS, staffFiltersSchema } from '@/features/staff/schemas/staff.schemas';
import type { StaffFilters as Filters } from '@/features/staff/types/staff.types';

const ALL_OUTLETS = 'all-outlets';
const OUTLET_FILTER_LIMIT = 100;
const STATUS_LABELS = { all: 'All statuses', active: 'Active', inactive: 'Inactive' } as const;

type StaffFiltersProps = {
  filters: Filters;
  onChange: (changes: Partial<Filters>, options?: { replace?: boolean }) => void;
};

function useOutletFilterOptions() {
  return useQuery({
    queryKey: [...outletKeys.lists(), 'filter-options'] as const,
    queryFn: ({ signal }) =>
      outletService.list(
        { page: 1, search: '', status: 'all', sort: 'code-asc' },
        signal,
        OUTLET_FILTER_LIMIT,
      ),
  });
}

export function StaffFilters({ filters, onChange }: StaffFiltersProps) {
  const [search, setSearch] = useState(filters.search);
  const [appliedSearch, setAppliedSearch] = useState(filters.search);
  if (filters.search !== appliedSearch) {
    setAppliedSearch(filters.search);
    setSearch(filters.search);
  }
  const applySearch = useDebouncedCallback((value: string) => {
    onChange({ search: value.trim() }, { replace: true });
  }, 300);
  const outlets = useOutletFilterOptions();
  const outletItems = outlets.data?.items ?? [];
  const selectedOutletMissing =
    filters.outletId !== '' && !outletItems.some((outlet) => outlet.id === filters.outletId);

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="relative lg:max-w-xs lg:flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          maxLength={100}
          placeholder="Search by email"
          aria-label="Search staff by email"
          className="pl-8"
          onChange={(event) => {
            setSearch(event.target.value);
            applySearch(event.target.value);
          }}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex">
        <Select
          value={filters.status}
          onValueChange={(value) =>
            onChange({ status: staffFiltersSchema.shape.status.parse(value) })
          }
        >
          <SelectTrigger className="w-full lg:w-36" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.outletId || ALL_OUTLETS}
          onValueChange={(value) => onChange({ outletId: value === ALL_OUTLETS ? '' : value })}
        >
          <SelectTrigger className="w-full lg:w-48" aria-label="Filter by outlet">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_OUTLETS}>All outlets</SelectItem>
            {selectedOutletMissing && (
              <SelectItem value={filters.outletId}>Selected outlet</SelectItem>
            )}
            {outletItems.map((outlet) => (
              <SelectItem key={outlet.id} value={outlet.id}>
                {outlet.code} · {outlet.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.sort}
          onValueChange={(value) => onChange({ sort: staffFiltersSchema.shape.sort.parse(value) })}
        >
          <SelectTrigger className="w-full lg:w-44" aria-label="Sort staff">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STAFF_SORT_OPTIONS).map(([value, option]) => (
              <SelectItem key={value} value={value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
