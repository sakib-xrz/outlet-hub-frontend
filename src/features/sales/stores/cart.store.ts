import { create } from 'zustand';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { MAX_SALE_QUANTITY } from '@/features/sales/schemas/sale.schemas';

export type CartLine = {
  menuItemId: string;
  sku: string;
  name: string;
  unitPrice: string;
  quantity: number;
  availableStock: number;
  changedPrice?: string;
  stockLimit?: number;
  unavailable?: boolean;
};

export type CartProduct = Pick<
  CartLine,
  'menuItemId' | 'sku' | 'name' | 'unitPrice' | 'availableStock'
>;

export type CartConflict =
  | { kind: 'price'; menuItemId: string; currentUnitPrice: string }
  | { kind: 'stock'; menuItemId: string; availableQuantity: number }
  | { kind: 'unavailable'; menuItemId: string };

type CartState = {
  carts: Record<string, CartLine[]>;
  add: (key: string, product: CartProduct) => void;
  setQuantity: (key: string, menuItemId: string, quantity: number) => void;
  remove: (key: string, menuItemId: string) => void;
  clear: (key: string) => void;
  applyConflicts: (key: string, conflicts: CartConflict[]) => void;
  acceptPrice: (key: string, menuItemId: string) => void;
};

export const cartKey = (userId: string, outletId: string): string => `${userId}:${outletId}`;

function update(
  lines: CartLine[] | undefined,
  menuItemId: string,
  change: (line: CartLine) => CartLine,
): CartLine[] {
  return (lines ?? []).map((line) => (line.menuItemId === menuItemId ? change(line) : line));
}

function clampQuantity(quantity: number, line: CartLine): number {
  const limit = Math.min(
    line.stockLimit ?? line.availableStock,
    line.availableStock,
    MAX_SALE_QUANTITY,
  );
  return Math.max(1, Math.min(Math.trunc(quantity), limit));
}

export const useCartStore = create<CartState>()((set) => ({
  carts: {},

  add: (key, product) =>
    set(({ carts }) => {
      const lines = carts[key] ?? [];
      const existing = lines.find((line) => line.menuItemId === product.menuItemId);
      if (existing) {
        return {
          carts: {
            ...carts,
            [key]: update(lines, product.menuItemId, (line) => {
              const next = { ...line, availableStock: product.availableStock };
              return { ...next, quantity: clampQuantity(line.quantity + 1, next) };
            }),
          },
        };
      }
      if (product.availableStock < 1) return { carts };
      return { carts: { ...carts, [key]: [...lines, { ...product, quantity: 1 }] } };
    }),

  setQuantity: (key, menuItemId, quantity) =>
    set(({ carts }) => ({
      carts: {
        ...carts,
        [key]: update(carts[key], menuItemId, (line) => {
          const next = { ...line, quantity: clampQuantity(quantity, line) };
          if (next.stockLimit !== undefined && next.quantity <= next.stockLimit) {
            delete next.stockLimit;
          }
          return next;
        }),
      },
    })),

  remove: (key, menuItemId) =>
    set(({ carts }) => ({
      carts: {
        ...carts,
        [key]: (carts[key] ?? []).filter((line) => line.menuItemId !== menuItemId),
      },
    })),

  clear: (key) =>
    set(({ carts }) => ({
      carts: Object.fromEntries(Object.entries(carts).filter(([cart]) => cart !== key)),
    })),

  applyConflicts: (key, conflicts) =>
    set(({ carts }) => {
      let lines = carts[key] ?? [];
      for (const conflict of conflicts) {
        lines = update(lines, conflict.menuItemId, (line) => {
          if (conflict.kind === 'price')
            return { ...line, changedPrice: conflict.currentUnitPrice };
          if (conflict.kind === 'unavailable') return { ...line, unavailable: true };
          return {
            ...line,
            availableStock: conflict.availableQuantity,
            stockLimit: conflict.availableQuantity,
          };
        });
      }
      return { carts: { ...carts, [key]: lines } };
    }),

  acceptPrice: (key, menuItemId) =>
    set(({ carts }) => ({
      carts: {
        ...carts,
        [key]: update(carts[key], menuItemId, (line) => {
          const next = { ...line, unitPrice: line.changedPrice ?? line.unitPrice };
          delete next.changedPrice;
          return next;
        }),
      },
    })),
}));

export function lineNeedsReview(line: CartLine): boolean {
  return (
    line.changedPrice !== undefined ||
    line.unavailable === true ||
    (line.stockLimit !== undefined && line.quantity > line.stockLimit)
  );
}

useAuthStore.subscribe((state, previous) => {
  if (state.epoch !== previous.epoch) useCartStore.setState({ carts: {} });
});
