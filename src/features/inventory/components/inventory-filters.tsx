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
  INVENTORY_SORT_OPTIONS,
  LOW_STOCK_THRESHOLD,
  inventoryFiltersSchema,
} from '@/features/inventory/schemas/inventory.schemas';
import type { InventoryFilters as Filters } from '@/features/inventory/types/inventory.types';

const STOCK_LABELS = {
  all: 'All stock levels',
  out_of_stock: 'Out of stock (0)',
  low: `Low stock (1–${LOW_STOCK_THRESHOLD})`,
  in_stock: `In stock (>${LOW_STOCK_THRESHOLD})`,
} as const;
const STATUS_LABELS = {
  all: 'All assignments',
  active: 'Active assignments',
  inactive: 'Inactive assignments',
} as const;

export function InventoryFilters({
  filters,
  onChange,
  showStatus,
}: {
  filters: Filters;
  onChange: (changes: Partial<Filters>, options?: { replace?: boolean }) => void;
  showStatus: boolean;
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
          placeholder="Search by SKU or name"
          aria-label="Search inventory by SKU or name"
          className="pl-8"
          onChange={(event) => {
            setSearch(event.target.value);
            applySearch(event.target.value);
          }}
        />
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex">
        <Select
          value={filters.stockStatus}
          onValueChange={(value) =>
            onChange({ stockStatus: inventoryFiltersSchema.shape.stockStatus.parse(value) })
          }
        >
          <SelectTrigger className="w-full lg:w-48" aria-label="Filter by stock level">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STOCK_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showStatus && (
          <Select
            value={filters.status}
            onValueChange={(value) =>
              onChange({ status: inventoryFiltersSchema.shape.status.parse(value) })
            }
          >
            <SelectTrigger className="w-full lg:w-48" aria-label="Filter by assignment status">
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
        )}
        <Select
          value={filters.sort}
          onValueChange={(value) =>
            onChange({ sort: inventoryFiltersSchema.shape.sort.parse(value) })
          }
        >
          <SelectTrigger className="w-full lg:w-48" aria-label="Sort inventory">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(INVENTORY_SORT_OPTIONS).map(([value, option]) => (
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
