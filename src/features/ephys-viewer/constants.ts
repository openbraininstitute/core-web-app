import { swrCacheConfig } from '@/api/cache-storage';
import { ProjectDataCache } from '@/utils/project-data-caches';

export const CHART_LINE_COLOR = '#0050b3';

// NWB assets are immutable per asset id, so use a long fresh window. Large binaries may still be
// evicted by the browser under storage pressure. Tune as needed.
//
// Used by the main-thread download path, which the ion channel recording viewer still goes
// through. The ephys viewer streams its file inside a worker and caches under `NWB_H5_CACHE`
// (`src/utils/h5/caches.ts`).
export const NWB_ASSET_CACHE_CONFIG = swrCacheConfig(
  ProjectDataCache.EphysNwbAssets,
  7 * 24 * 60 * 60, //  7 days fresh
  30 * 24 * 60 * 60 // 30 days stale-while-revalidate
);

/**
 * Downloads smaller than this show no progress card. They finish fast enough that it would just
 * flash — the same reasoning that hides progress on a cache hit.
 */
export const PROGRESS_MIN_BYTES = 40 * 1024 * 1024;

/**
 * Points per thumbnail in the overview grid.
 *
 * A repetition is only ever read at `DETAIL_PLOT_POINTS` and the thumbnails are reduced from
 * that, which is exact only where the bucket counts divide — so keep half of this a factor of
 * half of `DETAIL_PLOT_POINTS`. At 50 and 500 each thumbnail bucket is ten detail buckets.
 */
export const OVERVIEW_PLOT_POINTS = 100;

/** Points per trace in the interactive detail plots, and the resolution every read is taken at. */
export const DETAIL_PLOT_POINTS = 1000;
