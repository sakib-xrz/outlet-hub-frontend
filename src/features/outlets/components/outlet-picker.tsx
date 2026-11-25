import { Search, X } from 'lucide-react';
import { useId, useState } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { Spinner } from '@/components/shared/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { useOutletOptionsQuery } from '@/features/outlets/hooks/use-outlet-options-query';

export type OutletOption = { id: string; code: string; name: string; isActive: boolean };

type OutletPickerProps = {
  value: OutletOption[];
  onChange: (value: OutletOption[]) => void;
  retainableIds?: ReadonlySet<string>;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export function OutletPicker({
  value,
  onChange,
  retainableIds,
  disabled = false,
  invalid = false,
  describedBy,
}: OutletPickerProps) {
  const listId = useId();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const applySearch = useDebouncedCallback((next: string) => setSearch(next.trim()), 300);
  const options = useOutletOptionsQuery(search);
  const selectedIds = new Set(value.map((outlet) => outlet.id));
  const outlets = options.data?.pages.flatMap((page) => page.items) ?? [];

  const toggle = (outlet: OutletOption, checked: boolean) => {
    if (checked) {
      if (!selectedIds.has(outlet.id)) onChange([...value, outlet]);
    } else {
      onChange(value.filter((item) => item.id !== outlet.id));
    }
  };

  return (
    <div className="flex flex-col gap-3" aria-describedby={describedBy}>
      <div className="flex flex-wrap items-center gap-1.5" aria-live="polite">
        <span className="text-sm text-muted-foreground">
          {value.length === 0 ? 'No outlets selected' : `${value.length} selected`}
        </span>
        {value.map((outlet) => (
          <Badge key={outlet.id} variant="secondary" className="gap-1 pr-1">
            <span className="font-mono">{outlet.code}</span>
            {!outlet.isActive && <span className="text-muted-foreground">(inactive)</span>}
            <button
              type="button"
              className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
              aria-label={`Remove ${outlet.code}`}
              disabled={disabled}
              onClick={() => toggle(outlet, false)}
            >
              <X className="size-3" aria-hidden />
            </button>
          </Badge>
        ))}
        {value.length > 0 && (
          <Button
            type="button"
            variant="link"
            size="xs"
            disabled={disabled}
            onClick={() => onChange([])}
          >
            Remove all
          </Button>
        )}
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={input}
          maxLength={100}
          placeholder="Search outlets by code or name"
          aria-label="Search outlets to assign"
          aria-controls={listId}
          aria-invalid={invalid}
          className="pl-8"
          disabled={disabled}
          onChange={(event) => {
            setInput(event.target.value);
            applySearch(event.target.value);
          }}
        />
      </div>

      <div id={listId} className="max-h-60 overflow-y-auto rounded-md border">
        {options.isPending ? (
          <div className="space-y-2 p-3" role="status" aria-label="Loading outlets">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-5 w-full" />
            ))}
          </div>
        ) : options.isError ? (
          <ErrorState
            className="py-4"
            title="Outlets could not be loaded"
            description={options.error.message}
            onRetry={() => void options.refetch()}
          />
        ) : outlets.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {search ? 'No outlets match your search.' : 'No outlets exist yet.'}
          </p>
        ) : (
          <ul role="group" aria-label="Outlets" className="divide-y">
            {outlets.map((outlet) => {
              const checked = selectedIds.has(outlet.id);
              const blocked = !outlet.isActive && !checked && !retainableIds?.has(outlet.id);
              const checkboxId = `${listId}-${outlet.id}`;
              return (
                <li key={outlet.id} className="flex items-center gap-3 px-3 py-2">
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    disabled={disabled || blocked}
                    onCheckedChange={(state) => toggle(outlet, state === true)}
                  />
                  <label
                    htmlFor={checkboxId}
                    className="flex min-w-0 flex-1 items-center gap-2 text-sm peer-disabled:cursor-not-allowed peer-disabled:opacity-60"
                  >
                    <span className="font-mono text-xs font-medium">{outlet.code}</span>
                    <span className="truncate">{outlet.name}</span>
                    {!outlet.isActive && (
                      <Badge variant="outline" className="ml-auto shrink-0">
                        Inactive{blocked ? ' · cannot assign' : ''}
                      </Badge>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {options.hasNextPage && (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={options.isFetchingNextPage}
              onClick={() => void options.fetchNextPage()}
            >
              {options.isFetchingNextPage && <Spinner />}
              Load more outlets
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
