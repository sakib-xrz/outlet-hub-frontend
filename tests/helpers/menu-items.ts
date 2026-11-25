import type { MenuItem } from '@/features/menu-items/types/menu-item.types';

export const ITEM_ID = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

export function menuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: ITEM_ID,
    sku: 'COFFEE-001',
    name: 'Cappuccino',
    description: 'Espresso with steamed milk',
    basePrice: '1250.50',
    isActive: true,
    createdAt: '2026-03-01T09:00:00.000Z',
    updatedAt: '2026-03-02T09:00:00.000Z',
    ...overrides,
  };
}

export function menuPageBody(items: MenuItem[], total = items.length, page = 1) {
  return {
    success: true,
    message: 'ok',
    data: { items, pagination: { page, limit: 20, total, totalPages: Math.ceil(total / 20) } },
  };
}

export const menuItemBody = (item: MenuItem) => ({
  success: true,
  message: 'ok',
  data: { menuItem: item },
});
