import { apiClient } from '@/lib/api/client';
import { parseResponse, successResponseSchema } from '@/lib/api/contracts';
import {
  REVENUE_PAGE_SIZE,
  businessSummarySchema,
  revenueByOutletPageSchema,
  topSellingSchema,
} from '@/features/reports/schemas/report.schemas';
import type {
  BusinessSummary,
  ReportRange,
  RevenueByOutletPage,
  TopSelling,
} from '@/features/reports/types/report.types';

const summaryResponse = successResponseSchema(businessSummarySchema);
const revenueResponse = successResponseSchema(revenueByOutletPageSchema);
const topSellingResponse = successResponseSchema(topSellingSchema);

const rangeParams = (range: ReportRange): Record<string, string> => (range ? { ...range } : {});

export const reportService = {
  async summary(range: ReportRange, signal?: AbortSignal): Promise<BusinessSummary> {
    const response = await apiClient.get('/reports/summary', {
      params: rangeParams(range),
      ...(signal && { signal }),
    });
    return parseResponse(summaryResponse, response.data).data;
  },

  async revenueByOutlet(
    range: ReportRange,
    page: number,
    signal?: AbortSignal,
  ): Promise<RevenueByOutletPage> {
    const response = await apiClient.get('/reports/revenue-by-outlet', {
      params: { ...rangeParams(range), page, limit: REVENUE_PAGE_SIZE },
      ...(signal && { signal }),
    });
    return parseResponse(revenueResponse, response.data).data;
  },

  async topSelling(
    outletId: string,
    range: ReportRange,
    signal?: AbortSignal,
  ): Promise<TopSelling> {
    const response = await apiClient.get(
      `/reports/outlets/${encodeURIComponent(outletId)}/top-selling-items`,
      { params: rangeParams(range), ...(signal && { signal }) },
    );
    return parseResponse(topSellingResponse, response.data).data;
  },
};
