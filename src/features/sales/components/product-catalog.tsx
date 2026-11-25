import { useInfiniteQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { ErrorState } from '@/components/shared/error-state';
import { Spinner } from '@/components/shared/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { outletMenuKeys } from '@/features/outlet-menu-items/hooks/outlet-menu-query-keys';
import { outletMenuItemService } from '@/features/outlet-menu-items/services/outlet-menu-item.service';
import type { CartProduct } from '@/features/sales/stores/cart.store';
import { formatMoney } from '@/lib/utils/money';

function useCatalog(outletId: string, search: string) {
  return useInfiniteQuery({
    queryKey: [...outletMenuKeys.lists(outletId), 'pos', search] as const,
    queryFn: ({ pageParam, signal }) =>
      outletMenuItemService.list(
        outletId,
        { page: pageParam, search, status: 'active', sort: 'name-asc' },
        signal,
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
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const applySearch = useDebouncedCallback((value: string) => setSearch(value.trim()), 300);
  const catalog = useCatalog(outletId, search);
  const products = (catalog.data?.pages.flatMap((page) => page.items) ?? []).filter(
    (item) => item.outletId === outletId && item.isEnabled,
  );

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
        <Input
          type="search"
          value={input}
          maxLength={100}
          placeholder="Search by name or SKU"
          aria-label="Search products by name or SKU"
          className="pl-8"
          onChange={(event) => {
            setInput(event.target.value);
            applySearch(event.target.value);
          }}
        />
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
      ) : catalog.isError ? (
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
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Products">
          {products.map((product) => {
            const inCart = quantities.get(product.menuItemId) ?? 0;
            const outOfStock = product.stockQuantity < 1;
            const atLimit = inCart >= product.stockQuantity;
            return (
              <li key={product.menuItemId} className="flex flex-col gap-2 rounded-lg border p-3">
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
                      <Badge variant="outline">Out of stock</Badge>
                    ) : (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {product.stockQuantity} in stock
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={disabled || outOfStock || atLimit}
                    aria-label={`Add ${product.name} to cart`}
                    onClick={() =>
                      onAdd({
                        menuItemId: product.menuItemId,
                        sku: product.sku,
                        name: product.name,
                        unitPrice: product.effectivePrice,
                        availableStock: product.stockQuantity,
                      })
                    }
                  >
                    <Plus aria-hidden />
                    Add
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {catalog.hasNextPage && (
        <Button
          variant="outline"
          disabled={catalog.isFetchingNextPage}
          onClick={() => void catalog.fetchNextPage()}
        >
          {catalog.isFetchingNextPage && <Spinner />}
          Load more products
        </Button>
      )}
    </section>
  );
}
