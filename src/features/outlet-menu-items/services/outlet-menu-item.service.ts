import { apiClient } from '@/lib/api/client';
import { parseResponse, successResponseSchema } from '@/lib/api/contracts';
import {
  OUTLET_MENU_PAGE_SIZE,
  OUTLET_MENU_SORT_OPTIONS,
  outletMenuItemPayloadSchema,
  outletMenuPageSchema,
} from '@/features/outlet-menu-items/schemas/outlet-menu-item.schemas';
import type {
  OutletMenuFilters,
  OutletMenuItem,
  OutletMenuPage,
} from '@/features/outlet-menu-items/types/outlet-menu-item.types';

const pageResponse = successResponseSchema(outletMenuPageSchema);
const itemResponse = successResponseSchema(outletMenuItemPayloadSchema);

const menuPath = (outletId: string, suffix = ''): string =>
  `/outlets/${encodeURIComponent(outletId)}/menu-items${suffix}`;
const itemPath = (outletId: string, menuItemId: string, suffix = ''): string =>
  menuPath(outletId, `/${encodeURIComponent(menuItemId)}${suffix}`);

export const outletMenuItemService = {
  async list(
    outletId: string,
    filters: OutletMenuFilters,
    signal?: AbortSignal,
  ): Promise<OutletMenuPage> {
    const { sortBy, sortOrder } = OUTLET_MENU_SORT_OPTIONS[filters.sort];
    const response = await apiClient.get(menuPath(outletId), {
      params: {
        page: filters.page,
        limit: OUTLET_MENU_PAGE_SIZE,
        status: filters.status,
        sortBy,
        sortOrder,
        ...(filters.search && { search: filters.search }),
      },
      ...(signal && { signal }),
    });
    return parseResponse(pageResponse, response.data).data;
  },

  async assign(
    outletId: string,
    input: { menuItemId: string; overridePrice: string | null },
  ): Promise<OutletMenuItem> {
    const response = await apiClient.post(menuPath(outletId), input);
    return parseResponse(itemResponse, response.data).data.outletMenuItem;
  },

  async setOverridePrice(
    outletId: string,
    menuItemId: string,
    overridePrice: string | null,
  ): Promise<OutletMenuItem> {
    const response = await apiClient.patch(itemPath(outletId, menuItemId, '/price'), {
      overridePrice,
    });
    return parseResponse(itemResponse, response.data).data.outletMenuItem;
  },

  async setStatus(
    outletId: string,
    menuItemId: string,
    isActive: boolean,
  ): Promise<OutletMenuItem> {
    const response = await apiClient.patch(itemPath(outletId, menuItemId, '/status'), { isActive });
    return parseResponse(itemResponse, response.data).data.outletMenuItem;
  },
};
