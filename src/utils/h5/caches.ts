import { bucket } from '@/utils/asset-cache';
import { ProjectDataCache, type TProjectDataCache } from '@/utils/project-data-caches';

/** Room for two files of the largest size `fetchToFS` takes, kept 30 days. */
const h5Bucket = (name: TProjectDataCache) => ({ ...bucket(name), maxBytes: 4 * 2 ** 30 });

export const CIRCUIT_H5_CACHE = h5Bucket(ProjectDataCache.CircuitH5);
export const CONNECTIVITY_H5_CACHE = h5Bucket(ProjectDataCache.ConnectivityH5);
/**
 * NWB files streamed by the ephys viewer's worker. Not `NWB_ASSET_CACHE_CONFIG`'s bucket: that one is written by the
 * `ApiClient` cache layer, under its own headers and expiry, and neither could read the other's entries.
 */
export const NWB_H5_CACHE = h5Bucket(ProjectDataCache.EphysNwb);
