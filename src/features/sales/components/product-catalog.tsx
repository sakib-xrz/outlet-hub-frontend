import { useInfiniteQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { outletMenuKeys } from '@/features/outlet-menu-items/hooks/outlet-menu-query-keys';
import { outletMenuItemService } from '@/features/outlet-menu-items/services/outlet-menu-item.service';
import type { CartProduct } from '@/features/sales/stores/cart.store';
import { formatMoney } from '@/lib/utils/money';

const CATALOG_LIMIT = 100;

function useCatalog(outletId: string) {
  return useInfiniteQuery({
    queryKey: [...outletMenuKeys.lists(outletId), 'pos'] as const,
    queryFn: ({ pageParam, signal }) =>
      outletMenuItemService.list(
        outletId,
        { page: pageParam, search: '', status: 'active', sort: 'name-asc' },
        signal,
        CATALOG_LIMIT,
      ),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined,
  });
}

export function ProductCatalog({
  outletId,
  quantities,
  disabled,
  onAdd,
}: {
  outletId: string;
  quantities: ReadonlyMap<string, number>;
  disabled: boolean;
  onAdd: (product: CartProduct) => void;
}) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const catalog = useCatalog(outletId);
  const { hasNextPage, isFetchingNextPage, fetchNextPage, isFetchNextPageError } = catalog;

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const allProducts = useMemo(
    () =>
      (catalog.data?.pages.flatMap((page) => page.items) ?? []).filter(
        (item) => item.outletId === outletId && item.isEnabled,
      ),
    [catalog.data, outletId],
  );

  const products = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allProducts;
    return allProducts.filter(
      (item) => item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q),
    );
  }, [allProducts, search]);

  const focusSearch = useCallback(() => inputRef.current?.focus(), []);
  const clearSearch = useCallback(() => {
    setSearch('');
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const isDialog = !!document.querySelector('[role="dialog"]');
      const target = event.target as HTMLElement;
      const inField =
        target !== inputRef.current &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.getAttribute('contenteditable') === 'true');

      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        focusSearch();
        return;
      }

      if (event.key === '/' && !inField && !isDialog) {
        event.preventDefault();
        focusSearch();
        return;
      }

      if (event.key === 'Escape' && document.activeElement === inputRef.current) {
        if (search) {
          setSearch('');
        } else {
          inputRef.current?.blur();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [search, focusSearch]);

  return (
    <section aria-labelledby="catalog-heading" className="flex flex-col gap-3" data-print-hide>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="catalog-heading" className="text-base font-semibold">
          Products
        </h2>
        <p className="text-xs text-muted-foreground">
          Stock shown is provisional and re-checked at checkout.
        </p>
      </div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={inputRef}
          role="searchbox"
          type="text"
          value={search}
          maxLength={100}
          placeholder="Search by name or SKU"
          aria-label="Search products by name or SKU"
          className="flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 pr-16 pl-8 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute top-1/2 right-8 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            onClick={clearSearch}
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
        <kbd className="@media(hover:none){hidden} pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground select-none not-[&:hover]:opacity-70 sm:flex md:flex">
          /
        </kbd>
      </div>

      {catalog.isPending ? (
        <div
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
          role="status"
          aria-label="Loading products"
        >
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : catalog.isError && !catalog.isFetchNextPageError ? (
        <ErrorState
          title="Products could not be loaded"
          description={catalog.error.message}
          onRetry={() => void catalog.refetch()}
        />
      ) : products.length === 0 ? (
        <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          {search ? 'No products match your search.' : 'No products are available in this outlet.'}
        </p>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Products">
            {products.map((product) => {
              const inCart = quantities.get(product.menuItemId) ?? 0;
              const outOfStock = product.stockQuantity < 1;
              const atLimit = inCart >= product.stockQuantity;
              const isDisabled = disabled || outOfStock || atLimit;
              return (
                <li key={product.menuItemId}>
                  <button
                    type="button"
                    aria-label={`Add ${product.name}, ${formatMoney(product.effectivePrice)}`}
                    aria-disabled={isDisabled}
                    className={[
                      'relative flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors',
                      'min-h-11',
                      isDisabled
                        ? 'cursor-not-allowed opacity-60'
                        : 'cursor-pointer hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:bg-accent',
                    ].join(' ')}
                    onClick={() => {
                      if (!isDisabled)
                        onAdd({
                          menuItemId: product.menuItemId,
                          sku: product.sku,
                          name: product.name,
                          unitPrice: product.effectivePrice,
                          availableStock: product.stockQuantity,
                        });
                    }}
                  >
                    {inCart > 0 && (
                      <span
                        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground"
                        aria-hidden
                      >
                        {inCart}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">{product.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <p className="font-semibold tabular-nums">
                          {formatMoney(product.effectivePrice)}
                        </p>
                        {outOfStock ? (
                          <p className="text-xs text-muted-foreground">Out of stock</p>
                        ) : (
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {product.stockQuantity} in stock
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {isFetchNextPageError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-lg border border-destructive/50 p-3 text-sm"
            >
              <p className="text-muted-foreground">Some products could not be loaded.</p>
              <button
                type="button"
                className="shrink-0 font-medium underline-offset-2 hover:underline"
                onClick={() => void fetchNextPage()}
              >
                Retry loading products
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
