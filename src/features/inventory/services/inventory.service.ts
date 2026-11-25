import { apiClient } from '@/lib/api/client';
import { parseResponse, successResponseSchema } from '@/lib/api/contracts';
import {
  INVENTORY_PAGE_SIZE,
  INVENTORY_SORT_OPTIONS,
  adjustmentResultSchema,
  inventoryItemPayloadSchema,
  inventoryPageSchema,
} from '@/features/inventory/schemas/inventory.schemas';
import type {
  AdjustmentResult,
  InventoryFilters,
  InventoryItem,
  InventoryPage,
  StockAdjustment,
} from '@/features/inventory/types/inventory.types';

const pageResponse = successResponseSchema(inventoryPageSchema);
const itemResponse = successResponseSchema(inventoryItemPayloadSchema);
const adjustResponse = successResponseSchema(adjustmentResultSchema);

const inventoryPath = (outletId: string, suffix = ''): string =>
  `/outlets/${encodeURIComponent(outletId)}/inventory${suffix}`;

export const inventoryService = {
  async list(
    outletId: string,
    filters: InventoryFilters,
    signal?: AbortSignal,
  ): Promise<InventoryPage> {
    const { sortBy, sortOrder } = INVENTORY_SORT_OPTIONS[filters.sort];
    const response = await apiClient.get(inventoryPath(outletId), {
      params: {
        page: filters.page,
        limit: INVENTORY_PAGE_SIZE,
        status: filters.status,
        stockStatus: filters.stockStatus,
        sortBy,
        sortOrder,
        ...(filters.search && { search: filters.search }),
      },
      ...(signal && { signal }),
    });
    return parseResponse(pageResponse, response.data).data;
  },

  async get(outletId: string, menuItemId: string, signal?: AbortSignal): Promise<InventoryItem> {
    const response = await apiClient.get(
      inventoryPath(outletId, `/${encodeURIComponent(menuItemId)}`),
      { ...(signal && { signal }) },
    );
    return parseResponse(itemResponse, response.data).data.inventoryItem;
  },

  async adjust(
    outletId: string,
    menuItemId: string,
    adjustment: StockAdjustment,
  ): Promise<AdjustmentResult> {
    const response = await apiClient.patch(
      inventoryPath(outletId, `/${encodeURIComponent(menuItemId)}/adjust`),
      adjustment,
    );
    return parseResponse(adjustResponse, response.data).data;
  },
};
