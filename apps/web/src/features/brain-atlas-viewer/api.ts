import {
  checkCache,
  scheduleRevalidation,
  shouldUseCache,
  storeInCache,
  swrCacheConfig,
} from '@/api/cache-storage';
import { config } from '@/config';
import { BRAIN_REGION_DOES_NOT_EXIST } from '@/constants/errors';

const pointCloudCacheConfig = swrCacheConfig('brain-atlas-point-clouds');

/**
 * Fetches the point cloud data (Apache Arrow ArrayBuffer) from the Cells API
 * with Cache Storage SWR persistence across page reloads.
 */
export async function fetchPointCloud(
  params: { circuitId: string; annotationValue: number },
  token: string
): Promise<ArrayBuffer> {
  const url = new URL(`${config.CELL_API_URL ?? ''}/circuit`);
  url.searchParams.set('circuit_id', params.circuitId);
  url.searchParams.set('region', String(params.annotationValue));
  url.searchParams.set('how', 'arrow');
  const urlString = url.toString();

  const fetcher = () =>
    fetch(urlString, {
      method: 'get',
      headers: new Headers({ Accept: '*/*', 'nexus-token': token }),
    });

  if (shouldUseCache(urlString, pointCloudCacheConfig)) {
    const { state, response: cachedResponse } = await checkCache(urlString, pointCloudCacheConfig);
    if (cachedResponse && (state === 'fresh' || state === 'stale')) {
      if (state === 'stale') {
        scheduleRevalidation(urlString, pointCloudCacheConfig, async () => {
          const r = await fetcher();
          if (!r.ok) throw new Error(`Point cloud revalidation failed: ${r.status}`);
          return r;
        });
      }
      return cachedResponse.arrayBuffer();
    }
  }

  const response = await fetcher();
  if (!response.ok) {
    const errorData = await response.json();
    if (errorData.message?.includes('No region ids found with region')) {
      throw new Error(BRAIN_REGION_DOES_NOT_EXIST);
    }
    throw new Error(errorData.message);
  }
  await storeInCache(urlString, response, pointCloudCacheConfig);
  return response.arrayBuffer();
}
