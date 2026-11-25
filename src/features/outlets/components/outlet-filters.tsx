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
import {
  OUTLET_SORT_OPTIONS,
  outletFiltersSchema,
} from '@/features/outlets/schemas/outlet.schemas';
import type { OutletFilters as Filters } from '@/features/outlets/types/outlet.types';

type OutletFiltersProps = {
  filters: Filters;
  onChange: (changes: Partial<Filters>, options?: { replace?: boolean }) => void;
};

const STATUS_LABELS = { all: 'All statuses', active: 'Active', inactive: 'Inactive' } as const;
const statusSchema = outletFiltersSchema.shape.status;
const sortSchema = outletFiltersSchema.shape.sort;

export function OutletFilters({ filters, onChange }: OutletFiltersProps) {
  const [search, setSearch] = useState(filters.search);
  const [appliedSearch, setAppliedSearch] = useState(filters.search);
  if (filters.search !== appliedSearch) {
    setAppliedSearch(filters.search);
    setSearch(filters.search);
  }
  const applySearch = useDebouncedCallback((value: string) => {
    onChange({ search: value.trim() }, { replace: true });
  }, 300);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative sm:max-w-xs sm:flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          maxLength={100}
          placeholder="Search by code or name"
          aria-label="Search outlets by code or name"
          className="pl-8"
          onChange={(event) => {
            setSearch(event.target.value);
            applySearch(event.target.value);
          }}
        />
      </div>
      <div className="flex gap-2">
        <Select
          value={filters.status}
          onValueChange={(value) => onChange({ status: statusSchema.parse(value) })}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
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
          value={filters.sort}
          onValueChange={(value) => onChange({ sort: sortSchema.parse(value) })}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Sort outlets">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(OUTLET_SORT_OPTIONS).map(([value, option]) => (
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
