import type { InternalAxiosRequestConfig } from 'axios';
import type { StaffDetail, StaffSummary } from '@/features/staff/types/staff.types';
import type { Outlet } from '@/features/outlets/types/outlet.types';
import { errorBody, respond } from './http';
import { outlet, pageBody } from './outlets';

export const STAFF_ID = '2e7fbfc0-d36b-4129-bd85-27e5e04a63a5';

export const outlets = {
  assignedActive: outlet({
    id: '11111111-1111-4111-8111-111111111111',
    code: 'AAA-01',
    name: 'Alpha',
  }),
  assignedInactive: outlet({
    id: '22222222-2222-4222-8222-222222222222',
    code: 'BBB-01',
    name: 'Bravo',
    isActive: false,
  }),
  freeActive: outlet({
    id: '33333333-3333-4333-8333-333333333333',
    code: 'CCC-01',
    name: 'Charlie',
  }),
  freeInactive: outlet({
    id: '44444444-4444-4444-8444-444444444444',
    code: 'DDD-01',
    name: 'Delta',
    isActive: false,
  }),
} satisfies Record<string, Outlet>;

const summarize = ({ id, code, name, isActive }: Outlet) => ({ id, code, name, isActive });

export function staffDetail(overrides: Partial<StaffDetail> = {}): StaffDetail {
  return {
    id: STAFF_ID,
    email: 'staff@example.com',
    role: 'OUTLET_STAFF',
    isActive: true,
    createdAt: '2026-02-01T09:00:00.000Z',
    updatedAt: '2026-02-02T09:00:00.000Z',
    outlets: [summarize(outlets.assignedActive), summarize(outlets.assignedInactive)],
    ...overrides,
  };
}

export function staffSummary(overrides: Partial<StaffSummary> = {}): StaffSummary {
  const { outlets: assigned, ...identity } = staffDetail();
  return { ...identity, outletCount: assigned.length, ...overrides };
}

export function staffPageBody(items: StaffSummary[], total = items.length, page = 1) {
  return {
    success: true,
    message: 'ok',
    data: { items, pagination: { page, limit: 20, total, totalPages: Math.ceil(total / 20) } },
  };
}

export const staffBody = (staff: StaffDetail) => ({
  success: true,
  message: 'ok',
  data: { staff },
});

export function outletOptions(config: InternalAxiosRequestConfig) {
  const params = config.params as { search?: string; page: number };
  const all = Object.values(outlets).filter(
    (item) =>
      !params.search ||
      `${item.code} ${item.name}`.toLowerCase().includes(params.search.toLowerCase()),
  );
  return respond(config, 200, pageBody(all, all.length, params.page));
}

export const notFound = (config: InternalAxiosRequestConfig) =>
  respond(config, 404, errorBody('NOT_FOUND'));
