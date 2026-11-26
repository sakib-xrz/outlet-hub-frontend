import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AvailabilityBadge } from '@/features/outlet-menu-items/components/availability-badge';
import { OutletMenuActions } from '@/features/outlet-menu-items/components/outlet-menu-actions';
import type { OutletMenuItem } from '@/features/outlet-menu-items/types/outlet-menu-item.types';
import { formatMoney } from '@/lib/utils/money';

function PriceCell({ item }: { item: OutletMenuItem }) {
  return (
    <div className="flex flex-col items-end">
      <span className="font-medium tabular-nums">{formatMoney(item.effectivePrice)}</span>
      <span className="text-xs text-muted-foreground">
        {item.priceSource === 'OVERRIDE' ? 'Outlet price' : 'Master price'}
      </span>
    </div>
  );
}

export function OutletMenuTable({
  items,
  canManage,
}: {
  items: OutletMenuItem[];
  canManage: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={canManage ? 'w-32' : 'hidden w-32 sm:table-cell'}>SKU</TableHead>
            <TableHead>Item</TableHead>
            {canManage && (
              <>
                <TableHead className="hidden w-28 text-right lg:table-cell">Base price</TableHead>
                <TableHead className="hidden w-28 text-right lg:table-cell">Override</TableHead>
              </>
            )}
            <TableHead className="w-32 text-right">Price</TableHead>
            <TableHead className="w-20 text-right">Stock</TableHead>
            <TableHead className="w-40">Availability</TableHead>
            {canManage && (
              <TableHead className="w-16 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.menuItemId}>
              <TableCell
                className={
                  canManage
                    ? 'font-mono text-xs font-medium'
                    : 'hidden font-mono text-xs font-medium sm:table-cell'
                }
              >
                {item.sku}
              </TableCell>
              <TableCell className="max-w-56 truncate font-medium">{item.name}</TableCell>
              {canManage && (
                <>
                  <TableCell className="hidden text-right text-muted-foreground tabular-nums lg:table-cell">
                    {formatMoney(item.basePrice)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">
                    {item.overridePrice === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      formatMoney(item.overridePrice)
                    )}
                  </TableCell>
                </>
              )}
              <TableCell className="text-right">
                <PriceCell item={item} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.stockQuantity}</TableCell>
              <TableCell>
                <AvailabilityBadge item={item} />
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <OutletMenuActions item={item} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function OutletMenuTableSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border p-4" role="status" aria-label="Loading outlet menu">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-6 w-full" />
      ))}
    </div>
  );
}
