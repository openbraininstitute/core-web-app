import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  changeProjectMemberRole,
  getLab,
  getLabMembers,
  getProjectMembers,
  listLabs,
  restoreProject,
} from './admin';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
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
});
