import type { InternalAxiosRequestConfig } from 'axios';
import type { InventoryItem } from '@/features/inventory/types/inventory.types';
import { ok, outlet, outletBody } from './outlets';

export const OUTLET = outlet();
export const INVENTORY_PATH = `/outlets/${OUTLET.id}/inventory`;
export const ITEM_ID = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

export function inventoryItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    outletId: OUTLET.id,
    menuItemId: ITEM_ID,
    sku: 'BURGER-001',
    name: 'Classic Burger',
    stockQuantity: 50,
    stockStatus: 'IN_STOCK',
    isActive: true,
    outletIsActive: true,
    menuItemIsActive: true,
    isEnabled: true,
    isSellable: true,
    updatedAt: '2026-11-26T10:00:00.000Z',
    ...overrides,
  };
}

export function inventoryBody(items: InventoryItem[], total = items.length, page = 1) {
  return {
    success: true,
    message: 'ok',
    data: { items, pagination: { page, limit: 20, total, totalPages: Math.ceil(total / 20) } },
  };
}

export const itemBody = (item: InventoryItem) => ({
  success: true,
  message: 'ok',
  data: { inventoryItem: item },
});

export const adjustBody = (previous: number, next: number, operation = 'INCREASE') => ({
  success: true,
  message: 'Stock adjusted successfully',
  data: {
    inventoryItem: inventoryItem({ stockQuantity: next }),
    operation,
    previousStockQuantity: previous,
    newStockQuantity: next,
    changed: previous !== next,
  },
});

export function routeInventory(
  handlers: {
    list?: (config: InternalAxiosRequestConfig) => Promise<unknown>;
    item?: (config: InternalAxiosRequestConfig) => Promise<unknown>;
    adjust?: (config: InternalAxiosRequestConfig) => Promise<unknown>;
    outletActive?: boolean;
  } = {},
) {
  return (config: InternalAxiosRequestConfig): Promise<unknown> => {
    const url = config.url ?? '';
    if (url === `/outlets/${OUTLET.id}`) {
      return ok(config, outletBody({ ...OUTLET, isActive: handlers.outletActive ?? true }));
    }
    if (url.endsWith('/adjust') && handlers.adjust) return handlers.adjust(config);
    if (url === `${INVENTORY_PATH}/${ITEM_ID}` && handlers.item) return handlers.item(config);
    if (url === INVENTORY_PATH && handlers.list) return handlers.list(config);
    return ok(config, inventoryBody([inventoryItem()]));
  };
}
