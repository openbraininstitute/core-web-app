import { serverConfig as config } from '@/config/server';
import { log } from '@/utils/logger';

import type { Session } from 'next-auth';

// The group list is never put in the token or the session cookie: it can be large, so it
// comes from Keycloak's /userinfo and is cached here per user.

const GROUPS_CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_MAX_AGE_MS = 15 * 60 * 1000;
const USERINFO_TIMEOUT_MS = 5_000;
const CACHE_MAX_ENTRIES = 10_000;

type CacheEntry = { groups: string[]; fetchedAt: number };

const groupsCache = new Map<string, CacheEntry>();

function makeRoom(now: number) {
  if (groupsCache.size < CACHE_MAX_ENTRIES) return;
  for (const [key, entry] of groupsCache) {
    if (now - entry.fetchedAt >= STALE_MAX_AGE_MS) groupsCache.delete(key);
  }
  if (groupsCache.size >= CACHE_MAX_ENTRIES) {
    const oldest = groupsCache.keys().next().value;
    if (oldest) groupsCache.delete(oldest);
  }
}

// `null` means Keycloak rejected the token, which is an answer and not an outage.
async function fetchUserGroups(accessToken: string): Promise<string[] | null> {
  const response = await fetch(`${config.KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(USERINFO_TIMEOUT_MS),
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) {
    throw new Error(`keycloak userinfo returned ${response.status}`);
  }
  const userinfo = await response.json();
  return Array.isArray(userinfo?.groups)
    ? userinfo.groups.filter((g: unknown): g is string => typeof g === 'string')
    : [];
}

// A /userinfo outage serves the cached value up to the stale cap, then throws, so it never
// reads as "this user has no groups". `allowStale: false` is for writes: it throws at once,
// so an outage can't preserve a revoked operator's access.
export async function getUserGroups(
  session: Session | null | undefined,
  { allowStale = true }: { allowStale?: boolean } = {}
): Promise<string[]> {
  const accessToken = session?.accessToken;
  const sub = session?.user?.id;

  if (!accessToken) {
    if (!allowStale) {
      throw new Error('cannot resolve operator groups: no access token on session');
    }
    return [];
  }

  const key = sub || accessToken;
  const now = Date.now();

  const cached = groupsCache.get(key);
  if (cached && now - cached.fetchedAt < GROUPS_CACHE_TTL_MS) return cached.groups;

  try {
    const groups = await fetchUserGroups(accessToken);
    if (!groups) {
      groupsCache.delete(key);
      return [];
    }
    makeRoom(now);
    groupsCache.set(key, { groups, fetchedAt: now });
    return groups;
  } catch (error) {
    log('error', 'failed to resolve keycloak groups from userinfo', error);
    if (allowStale && cached && now - cached.fetchedAt < STALE_MAX_AGE_MS) return cached.groups;
    throw error instanceof Error ? error : new Error('failed to resolve operator groups');
  }
}

export function __resetGroupsCacheForTests() {
  groupsCache.clear();
}
