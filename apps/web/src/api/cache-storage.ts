import { log } from '@/utils/logger';

export type CacheConfiguration = {
  enabled: boolean;
  ttlInSeconds: number;
  cacheName: string;
  excludeUrls?: RegExp[];
  // When set, a cached entry whose age is between ttlInSeconds and
  // (ttlInSeconds + staleWhileRevalidateSeconds) is returned immediately while a
  // background fetch refreshes the cache. Past that window, treat as a miss.
  staleWhileRevalidateSeconds?: number;
};

export type CacheState = 'fresh' | 'stale' | 'expired' | 'miss';

// Defaults: 1 day fresh, 6 days stale-while-revalidate. Tuned for slow-changing
// reference data (meshes, point clouds, composition summary).
// Override per call site when a different cadence makes sense.
export function swrCacheConfig(
  cacheName: string,
  ttlInSeconds: number = 24 * 60 * 60,
  staleWhileRevalidateSeconds: number = 6 * 24 * 60 * 60
): CacheConfiguration {
  return {
    enabled: true,
    cacheName,
    ttlInSeconds,
    staleWhileRevalidateSeconds,
  };
}

// Module-level dedupe map so concurrent stale reads coalesce into a single
// background fetch per URL across all callers.
const inflightRevalidations = new Map<string, Promise<void>>();

export function shouldUseCache(url: string, cacheConfig?: CacheConfiguration): boolean {
  if (!cacheConfig?.enabled) return false;

  if (cacheConfig.excludeUrls) {
    for (const pattern of cacheConfig.excludeUrls) {
      if (pattern.test(url)) return false;
    }
  }

  return true;
}

export async function checkCache(
  url: string,
  cacheConfig: CacheConfiguration
): Promise<{ state: CacheState; response: Response | null }> {
  if (typeof caches === 'undefined') {
    return { state: 'miss', response: null };
  }

  try {
    const cache = await caches.open(cacheConfig.cacheName);
    const cachedResponse = await cache.match(url);

    if (!cachedResponse) {
      return { state: 'miss', response: null };
    }

    const cacheDate = cachedResponse.headers.get('x-cache-timestamp');

    if (!cacheDate) {
      return { state: 'expired', response: cachedResponse };
    }

    const cacheTimestamp = parseInt(cacheDate, 10);
    const ageInSeconds = (Date.now() - cacheTimestamp) / 1000;

    if (ageInSeconds < cacheConfig.ttlInSeconds) {
      return { state: 'fresh', response: cachedResponse };
    }

    const swrWindow = cacheConfig.staleWhileRevalidateSeconds ?? 0;
    if (ageInSeconds < cacheConfig.ttlInSeconds + swrWindow) {
      return { state: 'stale', response: cachedResponse };
    }

    return { state: 'expired', response: cachedResponse };
  } catch (e) {
    log('warn', 'Cache API access failed:', e);
    return { state: 'miss', response: null };
  }
}

export async function storeInCache(
  url: string,
  response: Response,
  cacheConfig: CacheConfiguration
): Promise<void> {
  if (typeof caches === 'undefined') return;

  try {
    const cache = await caches.open(cacheConfig.cacheName);

    const responseToCache = response.clone();

    // Only keep the Content-Type (needed for decode) and our timestamp.
    // Dropping the rest avoids inheriting headers from a redirected origin
    // (e.g. S3's `Vary: Origin`) that would poison cache.match() lookups.
    const headers = new Headers();
    const sourceContentType = responseToCache.headers.get('Content-Type');
    if (sourceContentType) headers.set('Content-Type', sourceContentType);
    headers.set('x-cache-timestamp', Date.now().toString());

    const body = await responseToCache.blob();
    headers.set('Content-Length', body.size.toString());

    const cachedResponseToStore = new Response(body, {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers,
    });

    await cache.put(url, cachedResponseToStore);
  } catch (e) {
    log('warn', 'Failed to store in cache:', e);
  }
}

// Fire-and-forget background revalidation. Coalesces concurrent calls for the
// same URL via inflightRevalidations. A non-ok Response and a thrown error
// both leave the stale entry untouched; throwing makes the failure visible in
// logs, returning a non-ok Response is silent. Fetchers do not get retry
// semantics here — transient failures wait until the next user read.
export function scheduleRevalidation(
  url: string,
  cacheConfig: CacheConfiguration,
  fetcher: () => Promise<Response>
): void {
  if (inflightRevalidations.has(url)) return;

  const task = (async () => {
    try {
      const response = await fetcher();
      if (response.ok) {
        await storeInCache(url, response, cacheConfig);
      }
    } catch (e) {
      log('warn', `Background revalidation failed for ${url}`, e);
    } finally {
      inflightRevalidations.delete(url);
    }
  })();

  inflightRevalidations.set(url, task);
}

export async function clearCache(cacheConfig: CacheConfiguration, url?: string): Promise<boolean> {
  if (!cacheConfig.enabled || typeof caches === 'undefined') {
    return false;
  }

  try {
    if (url) {
      const cache = await caches.open(cacheConfig.cacheName);
      await cache.delete(url);
    } else {
      await caches.delete(cacheConfig.cacheName);
    }
    return true;
  } catch (e) {
    log('error', 'Failed to clear cache:', e);
    return false;
  }
}
