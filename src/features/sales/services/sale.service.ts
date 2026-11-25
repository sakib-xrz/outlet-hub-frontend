import { apiClient } from '@/lib/api/client';
import { parseResponse, successResponseSchema } from '@/lib/api/contracts';
import {
  SALES_PAGE_SIZE,
  SALE_SORT_OPTIONS,
  saleDetailPayloadSchema,
  salePageSchema,
  salePayloadSchema,
} from '@/features/sales/schemas/sale.schemas';
import type {
  CreateSalePayload,
  Sale,
  SaleFilters,
  SalePage,
  SaleResult,
} from '@/features/sales/types/sale.types';

const resultResponse = successResponseSchema(salePayloadSchema);
const detailResponse = successResponseSchema(saleDetailPayloadSchema);
const pageResponse = successResponseSchema(salePageSchema);

const salesPath = (outletId: string, suffix = ''): string =>
  `/outlets/${encodeURIComponent(outletId)}/sales${suffix}`;

export const saleService = {
  async create(outletId: string, payload: CreateSalePayload): Promise<SaleResult> {
    const response = await apiClient.post(salesPath(outletId), payload);
    return parseResponse(resultResponse, response.data).data;
  },

  async getByRequest(outletId: string, requestId: string): Promise<SaleResult> {
    const response = await apiClient.get(
      salesPath(outletId, `/by-request/${encodeURIComponent(requestId)}`),
    );
    return parseResponse(resultResponse, response.data).data;
  },

  async get(outletId: string, saleId: string, signal?: AbortSignal): Promise<Sale> {
    const response = await apiClient.get(salesPath(outletId, `/${encodeURIComponent(saleId)}`), {
      ...(signal && { signal }),
    });
    return parseResponse(detailResponse, response.data).data.sale;
  },

  async list(outletId: string, filters: SaleFilters, signal?: AbortSignal): Promise<SalePage> {
    const { sortBy, sortOrder } = SALE_SORT_OPTIONS[filters.sort];
    const response = await apiClient.get(salesPath(outletId), {
      params: {
        page: filters.page,
        limit: SALES_PAGE_SIZE,
        sortBy,
        sortOrder,
        ...(filters.search && { search: filters.search }),
      },
      ...(signal && { signal }),
    });
    return parseResponse(pageResponse, response.data).data;
  },
};
