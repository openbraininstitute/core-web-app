import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock('@/config', () => ({ isServer: false }));
vi.mock('@/features/auth/client/auth-client', () => ({
  authClient: { getSession: mocks.getSession },
}));

import { getSession } from '@/features/auth/auth-fetch';

const session = { user: { id: 'u1' }, accessToken: 'a', idToken: 'i' };

describe('getSession (browser)', () => {
  beforeEach(() => mocks.getSession.mockReset());

  it('shares one request between overlapping calls, then fetches again', async () => {
    mocks.getSession.mockResolvedValue({ data: session, error: null });

    const [a, b] = await Promise.all([getSession(), getSession()]);
    expect(a).toBe(session);
    expect(b).toBe(session);
    expect(mocks.getSession).toHaveBeenCalledTimes(1);

    await getSession();
    expect(mocks.getSession).toHaveBeenCalledTimes(2);
  });

  it('rejects on an endpoint error and does not pin the failure', async () => {
    mocks.getSession.mockResolvedValueOnce({ data: null, error: { status: 500 } });
    await expect(getSession()).rejects.toEqual({ status: 500 });

    mocks.getSession.mockResolvedValueOnce({ data: null, error: null });
    await expect(getSession()).resolves.toBeNull();
  });
});
