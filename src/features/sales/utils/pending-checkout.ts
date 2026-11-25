import { pendingCheckoutSchema } from '@/features/sales/schemas/sale.schemas';
import type { CreateSalePayload, PendingCheckout } from '@/features/sales/types/sale.types';

const storageKey = (userId: string, outletId: string): string =>
  `outlethub:pending-sale:${userId}:${outletId}`;

export function loadPendingCheckout(userId: string, outletId: string): PendingCheckout | null {
  try {
    const raw = sessionStorage.getItem(storageKey(userId, outletId));
    if (!raw) return null;
    const parsed = pendingCheckoutSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function savePendingCheckout(
  userId: string,
  outletId: string,
  pending: PendingCheckout,
): boolean {
  try {
    sessionStorage.setItem(storageKey(userId, outletId), JSON.stringify(pending));
    return true;
  } catch {
    return false;
  }
}

export function clearPendingCheckout(userId: string, outletId: string): void {
  try {
    sessionStorage.removeItem(storageKey(userId, outletId));
  } catch {
    // Storage may be unavailable; the in-memory pending state is still cleared by the caller.
  }
}

export function toSalePayload(pending: PendingCheckout): CreateSalePayload {
  return {
    requestId: pending.requestId,
    items: pending.lines.map((line) => ({
      menuItemId: line.menuItemId,
      quantity: line.quantity,
      expectedUnitPrice: line.unitPrice,
    })),
  };
}
