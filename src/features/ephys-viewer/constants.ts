import { swrCacheConfig } from '@/api/cache-storage';

export const CHART_LINE_COLOR = '#0050b3';

// NWB assets are immutable per asset id, so use a long fresh window. Large binaries may still be
// evicted by the browser under storage pressure. Tune as needed.
//
// Used by the main-thread download path, which the ion channel recording viewer still goes
// through. The ephys viewer streams its file inside a worker and caches under `NWB_H5_CACHE`.
export const NWB_ASSET_CACHE_CONFIG = swrCacheConfig(
  'ephys-nwb-assets',
  7 * 24 * 60 * 60, //  7 days fresh
  30 * 24 * 60 * 60 // 30 days stale-while-revalidate
);

/**
 * `CacheStorage` bucket for NWB files streamed by the worker.
 *
 * Deliberately not `NWB_ASSET_CACHE_CONFIG`'s bucket: that one is written by the `ApiClient`
 * cache layer, which strips headers and stamps `x-cache-timestamp` for its own expiry checks.
 * The worker writes the response as it came off the wire, so letting the two read each other's
 * entries would mean each seeing records it can not reason about.
 */
export const NWB_H5_CACHE = 'obi-ephys-nwb-v1';

/**
 * Downloads smaller than this show no progress card. They finish fast enough that it would just
 * flash — the same reasoning that hides progress on a cache hit.
 */
export const PROGRESS_MIN_BYTES = 40 * 1024 * 1024;

/** Points per thumbnail in the overview grid. */
export const OVERVIEW_PLOT_POINTS = 100;

/** Points per trace in the interactive detail plots. */
export const DETAIL_PLOT_POINTS = 1000;
