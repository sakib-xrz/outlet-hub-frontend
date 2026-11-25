import type { InventoryItem } from '@/features/inventory/types/inventory.types';
import { getDisabledReason } from '@/features/outlet-menu-items/utils';

export function SalesAvailability({ item }: { item: InventoryItem }) {
  const reason = getDisabledReason(item);
  return reason ? (
    <span className="text-sm text-muted-foreground">{reason}</span>
  ) : (
    <span className="text-sm">Enabled</span>
  );
}
