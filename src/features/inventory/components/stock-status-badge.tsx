import { cn } from 'cn';
import { Badge } from '@/components/ui/badge';
import type { InventoryItem } from '@/features/inventory/types/inventory.types';

const STYLES = {
  IN_STOCK: { label: 'In stock', dot: 'bg-emerald-500', variant: 'secondary' },
  LOW: { label: 'Low stock', dot: 'bg-amber-500', variant: 'outline' },
  OUT_OF_STOCK: { label: 'Out of stock', dot: 'bg-destructive', variant: 'outline' },
} as const;

export function StockStatusBadge({ status }: { status: InventoryItem['stockStatus'] }) {
  const style = STYLES[status];
  return (
    <Badge variant={style.variant} className="gap-1.5">
      <span className={cn('size-1.5 rounded-full', style.dot)} aria-hidden />
      {style.label}
    </Badge>
  );
}
