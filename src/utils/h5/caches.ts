import { bucket } from '@/utils/asset-cache';
import { PROJECT_DATA_CACHES } from '@/utils/project-data-caches';

/** Room for two files of the largest size `fetchToFS` takes, kept 30 days. */
const h5Bucket = (name: string) => ({ ...bucket(name), maxBytes: 4 * 2 ** 30 });

export const CIRCUIT_H5_CACHE = h5Bucket(PROJECT_DATA_CACHES.circuitH5);
export const CONNECTIVITY_H5_CACHE = h5Bucket(PROJECT_DATA_CACHES.connectivityH5);
/**
 * NWB files streamed by the ephys viewer's worker. Not `NWB_ASSET_CACHE_CONFIG`'s bucket: that one is written by the
 * `ApiClient` cache layer, under its own headers and expiry, and neither could read the other's entries.
 */
export const NWB_H5_CACHE = h5Bucket(PROJECT_DATA_CACHES.ephysNwb);
