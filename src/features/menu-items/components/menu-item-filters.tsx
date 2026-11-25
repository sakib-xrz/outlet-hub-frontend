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
  MENU_ITEM_SORT_OPTIONS,
  menuItemFiltersSchema,
} from '@/features/menu-items/schemas/menu-item.schemas';
import type { MenuItemFilters as Filters } from '@/features/menu-items/types/menu-item.types';

const STATUS_LABELS = { all: 'All statuses', active: 'Active', inactive: 'Inactive' } as const;

export function MenuItemFilters({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (changes: Partial<Filters>, options?: { replace?: boolean }) => void;
}) {
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
          placeholder="Search by SKU or name"
          aria-label="Search menu items by SKU or name"
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
          onValueChange={(value) =>
            onChange({ status: menuItemFiltersSchema.shape.status.parse(value) })
          }
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
          onValueChange={(value) =>
            onChange({ sort: menuItemFiltersSchema.shape.sort.parse(value) })
          }
        >
          <SelectTrigger className="w-full sm:w-48" aria-label="Sort menu items">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MENU_ITEM_SORT_OPTIONS).map(([value, option]) => (
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
