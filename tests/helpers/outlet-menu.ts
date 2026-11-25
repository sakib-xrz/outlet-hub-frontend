import type { InternalAxiosRequestConfig } from 'axios';
import type { OutletMenuItem } from '@/features/outlet-menu-items/types/outlet-menu-item.types';
import { menuItem, menuPageBody } from './menu-items';
import { ok, outlet, outletBody } from './outlets';

export const OUTLET = outlet();
export const MENU_PATH = `/outlets/${OUTLET.id}/menu-items`;

export function assignment(overrides: Partial<OutletMenuItem> = {}): OutletMenuItem {
  return {
    outletId: OUTLET.id,
    menuItemId: '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
    sku: 'BURGER-001',
    name: 'Classic Burger',
    description: null,
    basePrice: '250.00',
    overridePrice: null,
    effectivePrice: '250.00',
    priceSource: 'BASE',
    stockQuantity: 12,
    isActive: true,
    outletIsActive: true,
    menuItemIsActive: true,
    isEnabled: true,
    isSellable: true,
    createdAt: '2026-11-26T10:00:00.000Z',
    updatedAt: '2026-11-26T10:00:00.000Z',
    ...overrides,
  };
}

export function menuBody(items: OutletMenuItem[], total = items.length, page = 1) {
  return {
    success: true,
    message: 'ok',
    data: { items, pagination: { page, limit: 20, total, totalPages: Math.ceil(total / 20) } },
  };
}

export const assignmentBody = (item: OutletMenuItem) => ({
  success: true,
  message: 'ok',
  data: { outletMenuItem: item },
});

export const masterItems = [
  menuItem({
    id: '0b7e3c1a-2d4f-4a6b-8c9d-1e2f3a4b5c6d',
    sku: 'TEA-01',
    name: 'Masala Tea',
    basePrice: '40.00',
  }),
  menuItem({
    id: '5f5f5f5f-5f5f-4f5f-8f5f-5f5f5f5f5f5f',
    sku: 'COFFEE-001',
    name: 'Cappuccino',
    basePrice: '180.00',
  }),
];

export function routeOutletMenu(
  handlers: { menu?: (config: InternalAxiosRequestConfig) => Promise<unknown> } = {},
) {
  return (config: InternalAxiosRequestConfig): Promise<unknown> => {
    const url = config.url ?? '';
    if (url === `/outlets/${OUTLET.id}`) return ok(config, outletBody(OUTLET));
    if (url === '/menu-items') return ok(config, menuPageBody(masterItems));
    if (url.startsWith(MENU_PATH) && handlers.menu) return handlers.menu(config);
    return ok(config, menuBody([assignment()]));
  };
}
