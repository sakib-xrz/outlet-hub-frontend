import type { InternalAxiosRequestConfig } from 'axios';
import type { OutletMenuItem } from '@/features/outlet-menu-items/types/outlet-menu-item.types';
import type { Sale } from '@/features/sales/types/sale.types';
import { assignment, menuBody } from './outlet-menu';
import { ok, outlet, outletBody } from './outlets';

export const OUTLET = outlet();
export const SALES_PATH = `/outlets/${OUTLET.id}/sales`;
export const MENU_PATH = `/outlets/${OUTLET.id}/menu-items`;
export const STAFF_ID = '1d6eaebf-c25a-4018-ac74-16d4df395294';
export const BURGER = '11111111-1111-4111-8111-111111111111';
export const TEA = '22222222-2222-4222-8222-222222222222';
export const EMPTY = '33333333-3333-4333-8333-333333333333';

export const products: OutletMenuItem[] = [
  assignment({
    menuItemId: BURGER,
    sku: 'BURGER-001',
    name: 'Classic Burger',
    basePrice: '250.00',
    effectivePrice: '250.00',
    stockQuantity: 5,
  }),
  assignment({
    menuItemId: TEA,
    sku: 'TEA-01',
    name: 'Masala Tea',
    basePrice: '0.10',
    effectivePrice: '0.10',
    stockQuantity: 50,
  }),
  assignment({
    menuItemId: EMPTY,
    sku: 'PIE-01',
    name: 'Apple Pie',
    stockQuantity: 0,
    isSellable: false,
  }),
];

export function sale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    outletId: OUTLET.id,
    outletCode: OUTLET.code,
    outletName: OUTLET.name,
    receiptNumber: 101,
    receiptCode: `${OUTLET.code}-000101`,
    requestId: '550e8400-e29b-41d4-a716-446655440000',
    createdById: STAFF_ID,
    totalAmount: '500.30',
    createdAt: '2026-11-26T10:00:00.000Z',
    items: [
      {
        menuItemId: BURGER,
        itemName: 'Classic Burger',
        quantity: 2,
        unitPrice: '250.00',
        lineTotal: '500.00',
      },
      {
        menuItemId: TEA,
        itemName: 'Masala Tea',
        quantity: 3,
        unitPrice: '0.10',
        lineTotal: '0.30',
      },
    ],
    ...overrides,
  };
}

export const saleResult = (value: Sale, replayed = false) => ({
  success: true,
  message: 'ok',
  data: { sale: value, replayed },
});

export function routeSales(
  handlers: {
    create?: (config: InternalAxiosRequestConfig) => Promise<unknown>;
    byRequest?: (config: InternalAxiosRequestConfig) => Promise<unknown>;
    catalog?: OutletMenuItem[];
    other?: (config: InternalAxiosRequestConfig) => Promise<unknown> | undefined;
  } = {},
) {
  return (config: InternalAxiosRequestConfig): Promise<unknown> => {
    const url = config.url ?? '';
    const custom = handlers.other?.(config);
    if (custom) return custom;
    if (url === `/outlets/${OUTLET.id}`) return ok(config, outletBody(OUTLET));
    if (url === MENU_PATH) {
      const search = ((config.params as { search?: string }).search ?? '').toLowerCase();
      const items = (handlers.catalog ?? products).filter((item) =>
        `${item.sku} ${item.name}`.toLowerCase().includes(search),
      );
      return ok(config, menuBody(items));
    }
    if (url.startsWith(`${SALES_PATH}/by-request/`) && handlers.byRequest)
      return handlers.byRequest(config);
    if (url === SALES_PATH && config.method === 'post' && handlers.create)
      return handlers.create(config);
    return ok(config, saleResult(sale()));
  };
}
