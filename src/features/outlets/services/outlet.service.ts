import { apiClient } from '@/lib/api/client';
import { parseResponse, successResponseSchema } from '@/lib/api/contracts';
import {
  OUTLET_PAGE_SIZE,
  OUTLET_SORT_OPTIONS,
  outletPageSchema,
  outletPayloadSchema,
} from '@/features/outlets/schemas/outlet.schemas';
import type {
  CreateOutletInput,
  Outlet,
  OutletFilters,
  OutletPage,
  UpdateOutletInput,
} from '@/features/outlets/types/outlet.types';

const pageResponse = successResponseSchema(outletPageSchema);
const outletResponse = successResponseSchema(outletPayloadSchema);

function toQueryParams(filters: OutletFilters): Record<string, string | number> {
  const { sortBy, sortOrder } = OUTLET_SORT_OPTIONS[filters.sort];
  return {
    page: filters.page,
    limit: OUTLET_PAGE_SIZE,
    status: filters.status,
    sortBy,
    sortOrder,
    ...(filters.search && { search: filters.search }),
  };
}

export const outletService = {
  async list(filters: OutletFilters, signal?: AbortSignal): Promise<OutletPage> {
    const response = await apiClient.get('/outlets', {
      params: toQueryParams(filters),
      ...(signal && { signal }),
    });
    return parseResponse(pageResponse, response.data).data;
  },

  async get(outletId: string, signal?: AbortSignal): Promise<Outlet> {
    const response = await apiClient.get(`/outlets/${encodeURIComponent(outletId)}`, {
      ...(signal && { signal }),
    });
    return parseResponse(outletResponse, response.data).data.outlet;
  },

  async create(input: CreateOutletInput): Promise<Outlet> {
    const response = await apiClient.post('/outlets', input);
    return parseResponse(outletResponse, response.data).data.outlet;
  },

  async update(outletId: string, input: UpdateOutletInput): Promise<Outlet> {
    const response = await apiClient.patch(`/outlets/${encodeURIComponent(outletId)}`, input);
    return parseResponse(outletResponse, response.data).data.outlet;
  },

  async setStatus(outletId: string, isActive: boolean): Promise<Outlet> {
    const response = await apiClient.patch(`/outlets/${encodeURIComponent(outletId)}/status`, {
      isActive,
    });
    return parseResponse(outletResponse, response.data).data.outlet;
  },
};
