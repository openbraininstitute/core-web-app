'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getSession } from '@/auth-fetch';
import { compactRecord } from '@/utils/dictionary';
import { log } from '@/utils/logger';

import type { WorkspaceContext } from '@/types/common';

export const AllowedTypes = ['application/pdf', 'image/png', 'image/jpeg'] as const;
export type TAllowedTypes = (typeof AllowedTypes)[number];

const DEFAULT_CACHE_NAME = 'analysis-pdf-cache-v1';
const DEFAULT_CACHE_EXPIRE_AFTER = 1 * 60 * 60 * 1000; // 1 Hour

// TODO: allow the hook to be used for other types of resources, not just Blobs (PDFs)
/**
 * A hook to manage client side caching for a given url.
 * It returns the URL to a local blob if cached, or the original URL while fetching.
 * @param {string} url - The URL of the resource to cache.
 * @param {string} urlKey - A unique key to identify the cached resource.
 * @param {string} cacheKey - The name of the cache to use.
 * @param {number} expireAfter - The duration in milliseconds to cache the resource.
 * @returns {{ cachedUrl: string | null, loading: boolean, error: Error | null }}
 */
export const useClientCachedUrl = ({
  urlKey,
  url,
  expireAfter = DEFAULT_CACHE_EXPIRE_AFTER,
  cacheKey = DEFAULT_CACHE_NAME,
}: {
  urlKey: string;
  url: string;
  expireAfter?: number;
  cacheKey?: string;
}) => {
  const { projectId, virtualLabId } = useParams<WorkspaceContext>();

  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const getAndCacheResource = async () => {
      setLoading(true);
      setError(null);

      try {
        const cache = await caches.open(cacheKey);
        const cachedResponse = await cache.match(urlKey);
        const session = await getSession();
        let isCacheValid = false;
        if (cachedResponse) {
          const cachedDateHeader = cachedResponse.headers.get('x-cache-date');
          if (cachedDateHeader) {
            const cachedTimestamp = new Date(cachedDateHeader).getTime();
            if (Date.now() - cachedTimestamp < expireAfter) {
              isCacheValid = true;
            }
          }
        }

        if (cachedResponse && isCacheValid) {
          const blob = await cachedResponse.blob();
          const objectURL = URL.createObjectURL(blob);
          if (isMounted) {
            setCachedUrl(objectURL);
          }
        } else {
          if (cachedResponse) {
            await cache.delete(urlKey);
          }

          const networkResponse = await fetch(url, {
            headers: compactRecord({
              Authorization: `Bearer ${session?.accessToken}`,
              'virtual-lab-id': virtualLabId,
              'project-id': projectId,
            }),
          });

          if (!networkResponse.ok) {
            throw new Error(`HTTP error! status: ${networkResponse.status}`);
          }

          const headers = new Headers(networkResponse.headers);
          headers.set('x-cache-date', new Date().toUTCString());

          const responseToCache = new Response(networkResponse.clone().body, {
            status: networkResponse.status,
            statusText: networkResponse.statusText,
            headers,
          });

          await cache.put(urlKey, responseToCache);

          const blob = await networkResponse.blob();
          const objectURL = URL.createObjectURL(blob);
          if (isMounted) {
            setCachedUrl(objectURL);
          }
        }
      } catch (err) {
        log('error', 'Failed to fetch or cache resource:', err);
        if (isMounted) {
          setError(err as Error);
          setCachedUrl(url);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    getAndCacheResource();

    return () => {
      isMounted = false;
      if (cachedUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(cachedUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, expireAfter, cacheKey, urlKey, virtualLabId, projectId, cachedUrl]);

  return { cachedUrl, loading, error };
};

/**
 * Clear all PDF cache entries
 * @returns {Promise<boolean>} - True if the cache was cleared successfully
 */
const clearAllCache = async (cacheKey: string = DEFAULT_CACHE_NAME): Promise<boolean> => {
  try {
    return await caches.delete(cacheKey);
  } catch (error) {
    log('error', 'Failed to clear all cache:', error);
    return false;
  }
};

/**
 * Clear all cache when the component unmounts
 */
export function useClearClientStorageCacheByKey(cacheKey: string = DEFAULT_CACHE_NAME) {
  useEffect(() => {
    return () => {
      clearAllCache(cacheKey);
    };
  }, [cacheKey]);
}
