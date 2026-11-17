import { bucket } from '@/utils/asset-cache';
import { PROJECT_DATA_CACHES } from '@/utils/project-data-caches';

export const GLB_CACHE = bucket(PROJECT_DATA_CACHES.emCellMeshGlb);
export const STAND_IN_CACHE = bucket(PROJECT_DATA_CACHES.emCellMeshStandIn);
export const FULL_CACHE = bucket(PROJECT_DATA_CACHES.emCellMeshFull);
