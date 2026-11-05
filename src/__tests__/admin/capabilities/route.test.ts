import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Session } from 'next-auth';

const { authMock, getUserGroupsMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getUserGroupsMock: vi.fn(),
}));

// Mock the host auth module (avoids loading NextAuth config) and the groups fetch, so the
// route exercises the real capability derivation over a controlled group list.
vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@/admin/server/groups', () => ({ getUserGroups: getUserGroupsMock }));

import { GET } from '@/app/api/admin/capabilities/route';

const SESSION = { user: { id: 'sub-1' }, accessToken: 'tok' } as unknown as Session;

beforeEach(() => {
  authMock.mockReset();
  getUserGroupsMock.mockReset();
});

describe('GET /api/admin/capabilities', () => {
  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValueOnce(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(getUserGroupsMock).not.toHaveBeenCalled();
  });

  it('returns 401 for a session whose refresh token died', async () => {
    authMock.mockResolvedValueOnce({ ...SESSION, error: 'RefreshAccessTokenError' });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(getUserGroupsMock).not.toHaveBeenCalled();
  });

  it('returns 401 when Keycloak rejects the token', async () => {
    authMock.mockResolvedValueOnce(SESSION);
    getUserGroupsMock.mockResolvedValueOnce(null);

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it('returns the derived capability record for the session groups', async () => {
    authMock.mockResolvedValueOnce(SESSION);
    getUserGroupsMock.mockResolvedValueOnce(['/service/accounting/admin']);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      entitycore: { admin: false, assetWrite: false },
      virtualLab: { read: false, admin: false },
      promotions: { admin: false },
      accounting: { admin: true },
      simulator: { admin: false },
      launchSystem: { admin: false },
      ops: { view: true },
    });
  });

  it('sets a private, no-store Cache-Control header', async () => {
    authMock.mockResolvedValueOnce(SESSION);
    getUserGroupsMock.mockResolvedValueOnce([]);

    const res = await GET();

    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('answers an empty (all-false) record with 200, never 403', async () => {
    authMock.mockResolvedValueOnce(SESSION);
    getUserGroupsMock.mockResolvedValueOnce([]);

    const res = await GET();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ops: { view: false } });
  });
});
