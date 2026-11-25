import { PackagePlus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdjustStockDialog } from '@/features/inventory/components/adjust-stock-dialog';
import { SalesAvailability } from '@/features/inventory/components/sales-availability';
import { StockStatusBadge } from '@/features/inventory/components/stock-status-badge';
import type { InventoryItem } from '@/features/inventory/types/inventory.types';
import { formatDateTime } from '@/lib/utils/format';

function AdjustAction({ item, disabled }: { item: InventoryItem; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label={`Adjust stock for ${item.name}`}
      >
        <PackagePlus aria-hidden />
        Adjust
      </Button>
      {open && <AdjustStockDialog item={item} open={open} onOpenChange={setOpen} />}
    </>
  );
}

export function InventoryTable({
  items,
  canManage,
  outletIsActive,
}: {
  items: InventoryItem[];
  canManage: boolean;
  outletIsActive: boolean;
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-32 sm:table-cell">SKU</TableHead>
            <TableHead>Item</TableHead>
            <TableHead className="w-24 text-right">Stock</TableHead>
            <TableHead className="w-32">Stock level</TableHead>
            <TableHead className="hidden w-44 md:table-cell">Sales availability</TableHead>
            <TableHead className="hidden w-44 lg:table-cell">Last updated</TableHead>
            {canManage && (
              <TableHead className="w-28 text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.menuItemId}>
              <TableCell className="hidden font-mono text-xs font-medium sm:table-cell">
                {item.sku}
              </TableCell>
              <TableCell className="max-w-56 truncate font-medium">{item.name}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {item.stockQuantity}
              </TableCell>
              <TableCell>
                <StockStatusBadge status={item.stockStatus} />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <SalesAvailability item={item} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {formatDateTime(item.updatedAt)}
              </TableCell>
              {canManage && (
                <TableCell className="text-right">
                  <AdjustAction item={item} disabled={!outletIsActive} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function InventoryTableSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border p-4" role="status" aria-label="Loading inventory">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-6 w-full" />
      ))}
    </div>
  );
}
