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

    await expect(getUserGroups(SESSION)).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(userinfoError());
    await expect(getUserGroups(SESSION)).rejects.toThrow('503');
  });

  it('answers null without calling Keycloak when there is no access token', async () => {
    const noToken = { user: { id: 'sub-2' } } as unknown as Session;

    await expect(getUserGroups(noToken)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('evicts the entry fetched longest ago when the cache is full', async () => {
    const sessionFor = (id: string) => ({ user: { id }, accessToken: id }) as unknown as Session;
    fetchMock.mockResolvedValue(userinfoOk([]));

    await getUserGroups(sessionFor('first'));
    await getUserGroups(sessionFor('second'));
    for (let i = 0; i < 9_998; i += 1) {
      await getUserGroups(sessionFor(`user-${i}`));
    }

    vi.setSystemTime(T0 + 6 * MINUTE); // past the TTL, so 'first' refetches and is newest again
    await getUserGroups(sessionFor('first'));
    expect(fetchMock).toHaveBeenCalledTimes(10_001);

    await getUserGroups(sessionFor('overflow'));

    vi.setSystemTime(T0 + 7 * MINUTE); // 'overflow' and 'first' now sit inside their TTL
    fetchMock.mockRejectedValue(new Error('outage'));
    await expect(getUserGroups(sessionFor('first'))).resolves.toEqual([]);
    await expect(getUserGroups(sessionFor('second'))).rejects.toThrow('outage');
  });
});
