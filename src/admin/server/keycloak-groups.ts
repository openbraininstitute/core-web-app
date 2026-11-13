import 'server-only';

import { serverConfig as config } from '@/config/server';
import { log } from '@/utils/logger';

import type { Session } from 'next-auth';

const GROUPS_CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_MAX_AGE_MS = 15 * 60 * 1000;
const USERINFO_TIMEOUT_MS = 5_000;
const FAILURE_BACKOFF_MS = 30_000;
const CACHE_MAX_ENTRIES = 10_000;

type CacheEntry = { groups: string[]; fetchedAt: number };

export class BoundedCache<V> {
  private readonly entries = new Map<string, V>();

  constructor(private readonly maxEntries: number) {}

  get(key: string) {
    return this.entries.get(key);
  }

  delete(key: string) {
    this.entries.delete(key);
  }

  // Deleting first keeps the Map in write order, so its first key is always the oldest entry.
  set(key: string, value: V) {
    this.entries.delete(key);
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, value);
  }
}

const groupsCache = new BoundedCache<CacheEntry>(CACHE_MAX_ENTRIES);
const lastFailure = new BoundedCache<{ at: number; error: unknown }>(CACHE_MAX_ENTRIES);
const inFlight = new Map<string, Promise<string[] | null>>();

async function fetchKeycloakGroups(accessToken: string): Promise<string[] | null> {
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

function staleGroups(cached: CacheEntry | undefined, now: number) {
  return cached && now - cached.fetchedAt < STALE_MAX_AGE_MS ? cached.groups : undefined;
}

async function refreshGroups(
  key: string,
  accessToken: string,
  cached: CacheEntry | undefined
): Promise<string[] | null> {
  const now = Date.now();
  try {
    const groups = await fetchKeycloakGroups(accessToken);
    lastFailure.delete(key);
    if (!groups) {
      groupsCache.delete(key);
      return null;
    }
    groupsCache.set(key, { groups, fetchedAt: now });
    return groups;
  } catch (error) {
    log('error', 'failed to resolve keycloak groups from userinfo', error);
    lastFailure.set(key, { at: Date.now(), error });
    const stale = staleGroups(cached, now);
    if (stale) return stale;
    throw error;
  }
}

// `null` means the session has no token Keycloak accepts, so the user is logged out. A
// /userinfo outage serves the cached value up to the stale cap, retrying at most every 30 s,
// then throws, so it never reads as "this user has no groups". Parallel requests with the same
// token share one call.
export async function getKeycloakGroups(session: Session): Promise<string[] | null> {
  const { accessToken } = session;
  if (!accessToken) return null;

  const key = session.user.id || accessToken;
  const cached = groupsCache.get(key);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < GROUPS_CACHE_TTL_MS) return cached.groups;

  const failure = lastFailure.get(key);
  if (failure && now - failure.at < FAILURE_BACKOFF_MS) {
    const stale = staleGroups(cached, now);
    if (stale) return stale;
    throw failure.error;
  }

  const pending = inFlight.get(accessToken);
  if (pending) return pending;

  const request = refreshGroups(key, accessToken, cached).finally(() =>
    inFlight.delete(accessToken)
  );
  inFlight.set(accessToken, request);
  return request;
}
