import { apiClient } from '@/lib/api/client';
import { parseResponse, successResponseSchema } from '@/lib/api/contracts';
import {
  STAFF_PAGE_SIZE,
  STAFF_SORT_OPTIONS,
  staffPageSchema,
  staffPayloadSchema,
} from '@/features/staff/schemas/staff.schemas';
import type {
  CreateStaffInput,
  StaffDetail,
  StaffFilters,
  StaffPage,
} from '@/features/staff/types/staff.types';

const pageResponse = successResponseSchema(staffPageSchema);
const staffResponse = successResponseSchema(staffPayloadSchema);

const staffPath = (staffId: string, suffix = ''): string =>
  `/staff/${encodeURIComponent(staffId)}${suffix}`;

export const staffService = {
  async list(filters: StaffFilters, signal?: AbortSignal): Promise<StaffPage> {
    const { sortBy, sortOrder } = STAFF_SORT_OPTIONS[filters.sort];
    const response = await apiClient.get('/staff', {
      params: {
        page: filters.page,
        limit: STAFF_PAGE_SIZE,
        status: filters.status,
        sortBy,
        sortOrder,
        ...(filters.search && { search: filters.search }),
        ...(filters.outletId && { outletId: filters.outletId }),
      },
      ...(signal && { signal }),
    });
    return parseResponse(pageResponse, response.data).data;
  },

  async get(staffId: string, signal?: AbortSignal): Promise<StaffDetail> {
    const response = await apiClient.get(staffPath(staffId), { ...(signal && { signal }) });
    return parseResponse(staffResponse, response.data).data.staff;
  },

  async create(input: CreateStaffInput): Promise<StaffDetail> {
    const response = await apiClient.post('/staff', input);
    return parseResponse(staffResponse, response.data).data.staff;
  },

  async updateEmail(staffId: string, email: string): Promise<StaffDetail> {
    const response = await apiClient.patch(staffPath(staffId), { email });
    return parseResponse(staffResponse, response.data).data.staff;
  },

  async setStatus(staffId: string, isActive: boolean): Promise<StaffDetail> {
    const response = await apiClient.patch(staffPath(staffId, '/status'), { isActive });
    return parseResponse(staffResponse, response.data).data.staff;
  },

  async replaceOutlets(staffId: string, outletIds: string[]): Promise<StaffDetail> {
    const response = await apiClient.put(staffPath(staffId, '/outlets'), { outletIds });
    return parseResponse(staffResponse, response.data).data.staff;
  },

  async resetPassword(staffId: string, newPassword: string): Promise<void> {
    await apiClient.patch(staffPath(staffId, '/password'), { newPassword });
  },
};
