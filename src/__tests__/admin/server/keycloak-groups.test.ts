import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BoundedCache } from '@/features/admin/server/keycloak-groups';

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

let getKeycloakGroups: typeof import('@/features/admin/server/keycloak-groups').getKeycloakGroups;

beforeEach(async () => {
  vi.resetModules();
  ({ getKeycloakGroups } = await import('@/features/admin/server/keycloak-groups'));
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('getKeycloakGroups', () => {
  it('fetches fresh from /userinfo on a cold cache', async () => {
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/entitycore/admin']));

    const groups = await getKeycloakGroups(SESSION);

    expect(groups).toEqual(['/service/entitycore/admin']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://keycloak.test/realms/obp/protocol/openid-connect/userinfo'
    );
  });

  it('serves the cached value on a second call within the TTL (no refetch)', async () => {
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/accounting/admin']));
    await getKeycloakGroups(SESSION);

    vi.setSystemTime(T0 + 4 * MINUTE); // still inside the 5-min TTL
    const groups = await getKeycloakGroups(SESSION);

    expect(groups).toEqual(['/service/accounting/admin']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refetches once the TTL has elapsed', async () => {
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/accounting/admin']));
    await getKeycloakGroups(SESSION);

    vi.setSystemTime(T0 + 6 * MINUTE); // past the 5-min TTL
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/small-scale-simulator/admin']));
    const groups = await getKeycloakGroups(SESSION);

    expect(groups).toEqual(['/service/small-scale-simulator/admin']);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('serves stale groups on a /userinfo error within the 15-min stale cap', async () => {
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/entitycore/admin']));
    await getKeycloakGroups(SESSION);

    vi.setSystemTime(T0 + 10 * MINUTE); // past TTL, inside 15-min stale cap
    fetchMock.mockResolvedValueOnce(userinfoError());
    const groups = await getKeycloakGroups(SESSION);

    expect(groups).toEqual(['/service/entitycore/admin']);
  });

  it('throws instead of reporting no groups beyond the 15-min stale cap', async () => {
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/entitycore/admin']));
    await getKeycloakGroups(SESSION);

    vi.setSystemTime(T0 + 16 * MINUTE); // past the 15-min stale cap
    fetchMock.mockResolvedValueOnce(userinfoError());

    await expect(getKeycloakGroups(SESSION)).rejects.toThrow('503');
  });

  it('throws on an outage with nothing cached', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'));

    await expect(getKeycloakGroups(SESSION)).rejects.toThrow('timeout');
  });

  it.each([401, 403])('drops the cached groups when /userinfo answers %i', async (status) => {
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/entitycore/admin']));
    await getKeycloakGroups(SESSION);

    vi.setSystemTime(T0 + 6 * MINUTE); // past TTL, inside the stale cap
    fetchMock.mockResolvedValueOnce({ ok: false, status, json: async () => ({}) });

    await expect(getKeycloakGroups(SESSION)).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(userinfoError());
    await expect(getKeycloakGroups(SESSION)).rejects.toThrow('503');
  });

  it('answers null without calling Keycloak when there is no access token', async () => {
    const noToken = { user: { id: 'sub-2' } } as unknown as Session;

    await expect(getKeycloakGroups(noToken)).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shares one /userinfo call between parallel requests with the same token', async () => {
    fetchMock.mockResolvedValueOnce(userinfoOk(['/service/entitycore/admin']));

    const [first, second] = await Promise.all([
      getKeycloakGroups(SESSION),
      getKeycloakGroups(SESSION),
    ]);

    expect(first).toEqual(['/service/entitycore/admin']);
    expect(second).toEqual(['/service/entitycore/admin']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('starts a new call once a failed one has settled', async () => {
    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    await expect(getKeycloakGroups(SESSION)).rejects.toThrow('timeout');

    fetchMock.mockResolvedValueOnce(userinfoOk([]));
    await expect(getKeycloakGroups(SESSION)).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('BoundedCache', () => {
  it('evicts the entry written longest ago when full', () => {
    const cache = new BoundedCache<number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.set('a', 4);

    cache.set('d', 5);

    expect(cache.get('b')).toBeUndefined();
    expect([cache.get('a'), cache.get('c'), cache.get('d')]).toEqual([4, 3, 5]);
  });
});
