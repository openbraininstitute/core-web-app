import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetGroupsCacheForTests, getUserGroups } from './groups';

import type { Session } from 'next-auth';

vi.mock('@/config/server', () => ({
  serverConfig: { KEYCLOAK_ISSUER: 'https://keycloak.test/realms/obp' },
}));
vi.mock('@/utils/logger', () => ({ log: vi.fn() }));

const SESSION = {
  user: { id: 'sub-1' },
  accessToken: 'access-token-1',
} as unknown as Session;

const fetchMock = vi.fn();

function userinfoOk(groups: string[]) {
  return { ok: true, json: async () => ({ groups }) };
}
function userinfoError() {
  return { ok: false, status: 503, json: async () => ({}) };
}

const T0 = new Date('2026-07-24T00:00:00.000Z').getTime();
const MINUTE = 60_000;

beforeEach(() => {
  __resetGroupsCacheForTests();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('getUserGroups', () => {
  it('fetches fresh from /userinfo on a cold cache', async () => {
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/entitycore/admin']));

    const groups = await getUserGroups(SESSION);

    expect(groups).toEqual(['/service/entitycore/admin']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://keycloak.test/realms/obp/protocol/openid-connect/userinfo'
    );
  });

  it('serves the cached value on a second call within the TTL (no refetch)', async () => {
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/accounting/admin']));
    await getUserGroups(SESSION);

    vi.setSystemTime(T0 + 4 * MINUTE); // still inside the 5-min TTL
    const groups = await getUserGroups(SESSION);

    expect(groups).toEqual(['/service/accounting/admin']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refetches once the TTL has elapsed', async () => {
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/accounting/admin']));
    await getUserGroups(SESSION);

    vi.setSystemTime(T0 + 6 * MINUTE); // past the 5-min TTL
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/small-scale-simulator/admin']));
    const groups = await getUserGroups(SESSION);

    expect(groups).toEqual(['/service/small-scale-simulator/admin']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('serves stale groups on a /userinfo error within the 15-min stale cap', async () => {
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/entitycore/admin']));
    await getUserGroups(SESSION);

    vi.setSystemTime(T0 + 10 * MINUTE); // past TTL, inside 15-min stale cap
    fetchMock.mockResolvedValueOnce(userinfoError());
    const groups = await getUserGroups(SESSION);

    expect(groups).toEqual(['/service/entitycore/admin']);
  });

  it('throws instead of reporting no groups beyond the 15-min stale cap', async () => {
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/entitycore/admin']));
    await getUserGroups(SESSION);

    vi.setSystemTime(T0 + 16 * MINUTE); // past the 15-min stale cap
    fetchMock.mockResolvedValueOnce(userinfoError());

    await expect(getUserGroups(SESSION)).rejects.toThrow('503');
  });

  it('throws on an outage with nothing cached', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'));

    await expect(getUserGroups(SESSION)).rejects.toThrow('timeout');
  });

  it.each([401, 403])('drops the cached groups when /userinfo answers %i', async (status) => {
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/entitycore/admin']));
    await getUserGroups(SESSION);

    vi.setSystemTime(T0 + 6 * MINUTE); // past TTL, inside the stale cap
    fetchMock.mockResolvedValueOnce({ ok: false, status, json: async () => ({}) });

    await expect(getUserGroups(SESSION)).resolves.toEqual([]);

    fetchMock.mockResolvedValueOnce(userinfoError());
    await expect(getUserGroups(SESSION)).rejects.toThrow('503');
  });

  it('throws on a resolution failure when allowStale is false (fail closed)', async () => {
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/entitycore/admin']));
    await getUserGroups(SESSION);

    vi.setSystemTime(T0 + 6 * MINUTE);
    fetchMock.mockResolvedValueOnce(userinfoError());

    await expect(getUserGroups(SESSION, { allowStale: false })).rejects.toThrow();
  });

  it('throws with allowStale false when there is no access token', async () => {
    const noToken = { user: { id: 'sub-2' } } as unknown as Session;
    await expect(getUserGroups(noToken, { allowStale: false })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
