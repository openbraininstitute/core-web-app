import { swrCacheConfig } from '@/api/cache-storage';

export const CHART_LINE_COLOR = '#0050b3';

// NWB assets are immutable per asset id, so use a long fresh window. Large binaries may still be
// evicted by the browser under storage pressure. Tune as needed.
export const NWB_ASSET_CACHE_CONFIG = swrCacheConfig(
  'ephys-nwb-assets',
  7 * 24 * 60 * 60, //  7 days fresh
  30 * 24 * 60 * 60 // 30 days stale-while-revalidate
);
