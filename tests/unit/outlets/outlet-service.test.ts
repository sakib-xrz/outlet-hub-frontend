import { describe, expect, it } from 'vitest';
import { outletService } from '@/features/outlets/services/outlet.service';
import { outletKeys } from '@/features/outlets/hooks/outlet-query-keys';
import { mockApi, ok, pageBody } from '../../helpers/outlets';

describe('outletService', () => {
  it('maps URL filters to the backend query contract', async () => {
    const requests = mockApi((config) => ok(config, pageBody([])));
    await outletService.list({ page: 2, search: 'mir', status: 'active', sort: 'name-asc' });
    expect(requests[0]?.params).toEqual({
      page: 2,
      limit: 20,
      status: 'active',
      sortBy: 'name',
      sortOrder: 'asc',
      search: 'mir',
    });
  });

  it('rejects responses that do not match the contract', async () => {
    mockApi((config) => ok(config, { success: true, message: 'ok', data: { items: 'nope' } }));
    await expect(
      outletService.list({ page: 1, search: '', status: 'all', sort: 'newest' }),
    ).rejects.toMatchObject({ message: 'Received an unexpected response from the server.' });
  });

  it('builds hierarchical query keys for targeted invalidation', () => {
    const filters = { page: 1, search: '', status: 'all', sort: 'newest' } as const;
    expect(outletKeys.list(filters).slice(0, 2)).toEqual(outletKeys.lists());
    expect(outletKeys.detail('id').slice(0, 2)).toEqual(outletKeys.details());
  });
});
