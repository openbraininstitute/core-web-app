import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  changeProjectMemberRole,
  getLab,
  getLabMembers,
  getProjectMembers,
  getPromotion,
  listLabs,
  listPromotions,
  restoreProject,
  updateComputeCell,
  updateCreditRate,
  updatePromotion,
} from '@/admin/sections/virtual-lab/api/admin';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/api/virtual-lab-svc/utils', () => ({ virtualLabRootApi: async () => api }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('virtual-lab admin client', () => {
  it('drops blank list params and keeps a meaningful false', async () => {
    api.get.mockResolvedValueOnce({ data: [], pagination: {} });

    await listLabs({ page: 1, query: '', include_deleted: false });

    expect(api.get).toHaveBeenCalledWith(
      '/admin/labs',
      expect.objectContaining({ queryParams: { page: 1, include_deleted: false } })
    );
  });

  it('returns a bare detail as it arrives', async () => {
    api.get.mockResolvedValueOnce({ id: 'lab-1' });
    await expect(getLab('lab-1')).resolves.toEqual({ id: 'lab-1' });
  });

  it.each([
    ['lab', getLabMembers, '/admin/labs/x/users'],
    ['project', getProjectMembers, '/admin/projects/x/users'],
  ] as const)('unwraps %s members from their envelope', async (_name, getMembers, path) => {
    const users = [{ id: 'user-1' }];
    api.get.mockResolvedValueOnce({ message: 'ok', data: { users, total: 1 } });

    await expect(getMembers('x')).resolves.toEqual(users);
    expect(api.get).toHaveBeenCalledWith(path, expect.anything());
  });

  it('keeps an id from the URL inside its own path segment', async () => {
    api.get.mockResolvedValueOnce({});
    await getLab('../users');

    expect(api.get).toHaveBeenCalledWith('/admin/labs/..%2Fusers', expect.anything());
  });

  it('sends a role change as new_role', async () => {
    await changeProjectMemberRole('p', 'u', 'admin');

    expect(api.patch).toHaveBeenCalledWith(
      '/admin/projects/p/users/u/role',
      expect.objectContaining({ body: { new_role: 'admin' } })
    );
  });

  it('restores with no body', async () => {
    await restoreProject('p');

    expect(api.post).toHaveBeenCalledWith(
      '/admin/projects/p/restore',
      expect.not.objectContaining({ body: expect.anything() })
    );
  });

  it('changes the compute cell on the lab route outside /admin', async () => {
    await updateComputeCell('lab/1', 'cell_b');

    expect(api.patch).toHaveBeenCalledWith(
      '/virtual-labs/lab%2F1/compute-cell',
      expect.objectContaining({ body: { compute_cell: 'cell_b' } })
    );
  });

  it('pages promotions by limit and offset and unwraps them', async () => {
    const promotions = [{ id: 'p' }];
    api.get.mockResolvedValueOnce({
      message: 'ok',
      data: { promotions, pagination: { total: 41 } },
    });

    await expect(listPromotions({ page: 3, page_size: 20, active: false })).resolves.toEqual({
      data: promotions,
      pagination: { total: 41 },
    });
    expect(api.get).toHaveBeenCalledWith(
      '/admin/promotions',
      expect.objectContaining({ queryParams: { active: false, limit: 20, offset: 40 } })
    );
  });

  it('unwraps a single promotion', async () => {
    api.get.mockResolvedValueOnce({ message: 'ok', data: { id: 'p' } });
    await expect(getPromotion('p')).resolves.toEqual({ id: 'p' });
  });

  it('updates a promotion with PUT', async () => {
    await updatePromotion('p', { active: true });

    expect(api.put).toHaveBeenCalledWith(
      '/admin/promotions/p',
      expect.objectContaining({ body: { active: true } })
    );
  });

  it('sends a rate as the exact string it was given', async () => {
    await updateCreditRate('rate-1', { rate: '0.050' });

    expect(api.patch).toHaveBeenCalledWith(
      '/admin/credit-rates/rate-1',
      expect.objectContaining({ body: { rate: '0.050' } })
    );
  });
});
