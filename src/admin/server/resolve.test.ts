import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireCapability } from './resolve';

const { authMock, getUserGroupsMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getUserGroupsMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('./groups', () => ({ getUserGroups: getUserGroupsMock }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

beforeEach(() => {
  authMock.mockReset();
  getUserGroupsMock.mockReset();
});

describe('requireCapability', () => {
  it('sends a signed-out visitor to log in', async () => {
    authMock.mockResolvedValueOnce(null);

    await expect(requireCapability('ops.view')).rejects.toThrow('redirect:/app/log-in');
    expect(getUserGroupsMock).not.toHaveBeenCalled();
  });

  it('sends a user without the capability to the forbidden page', async () => {
    authMock.mockResolvedValueOnce({ accessToken: 'tok' });
    getUserGroupsMock.mockResolvedValueOnce(['/service/entitycore/admin']);

    await expect(requireCapability('virtualLab.read')).rejects.toThrow(
      'redirect:/app/admin/forbidden'
    );
  });

  it('forbids a user with no groups, even on ops.view', async () => {
    authMock.mockResolvedValueOnce({ accessToken: 'tok' });
    getUserGroupsMock.mockResolvedValueOnce([]);

    await expect(requireCapability('ops.view')).rejects.toThrow('redirect:/app/admin/forbidden');
  });

  it('returns the capabilities when held', async () => {
    authMock.mockResolvedValueOnce({ accessToken: 'tok' });
    getUserGroupsMock.mockResolvedValueOnce(['/service/entitycore/admin']);

    await expect(requireCapability('ops.view')).resolves.toMatchObject({
      entitycore: { admin: true },
      ops: { view: true },
    });
  });
});
