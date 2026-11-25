import { apiClient } from '@/lib/api/client';
import { parseResponse, successResponseSchema } from '@/lib/api/contracts';
import {
  MENU_ITEM_PAGE_SIZE,
  MENU_ITEM_SORT_OPTIONS,
  menuItemPageSchema,
  menuItemPayloadSchema,
} from '@/features/menu-items/schemas/menu-item.schemas';
import type {
  CreateMenuItemInput,
  MenuItem,
  MenuItemFilters,
  MenuItemPage,
  UpdateMenuItemInput,
} from '@/features/menu-items/types/menu-item.types';

const pageResponse = successResponseSchema(menuItemPageSchema);
const itemResponse = successResponseSchema(menuItemPayloadSchema);
const itemPath = (id: string, suffix = ''): string =>
  `/menu-items/${encodeURIComponent(id)}${suffix}`;

export const menuItemService = {
  async list(filters: MenuItemFilters, signal?: AbortSignal): Promise<MenuItemPage> {
    const { sortBy, sortOrder } = MENU_ITEM_SORT_OPTIONS[filters.sort];
    const response = await apiClient.get('/menu-items', {
      params: {
        page: filters.page,
        limit: MENU_ITEM_PAGE_SIZE,
        status: filters.status,
        sortBy,
        sortOrder,
        ...(filters.search && { search: filters.search }),
      },
      ...(signal && { signal }),
    });
    return parseResponse(pageResponse, response.data).data;
  },

  async get(id: string, signal?: AbortSignal): Promise<MenuItem> {
    const response = await apiClient.get(itemPath(id), { ...(signal && { signal }) });
    return parseResponse(itemResponse, response.data).data.menuItem;
  },

  async create(input: CreateMenuItemInput): Promise<MenuItem> {
    const response = await apiClient.post('/menu-items', input);
    return parseResponse(itemResponse, response.data).data.menuItem;
  },

  async update(id: string, input: UpdateMenuItemInput): Promise<MenuItem> {
    const response = await apiClient.patch(itemPath(id), input);
    return parseResponse(itemResponse, response.data).data.menuItem;
  },

  async setStatus(id: string, isActive: boolean): Promise<MenuItem> {
    const response = await apiClient.patch(itemPath(id, '/status'), { isActive });
    return parseResponse(itemResponse, response.data).data.menuItem;
  },
};
