import { bucket } from '@/utils/asset-cache';
import { ProjectDataCache } from '@/utils/project-data-caches';

export const GLB_CACHE = bucket(ProjectDataCache.EmCellMeshGlb);
export const STAND_IN_CACHE = bucket(ProjectDataCache.EmCellMeshStandIn);
export const FULL_CACHE = bucket(ProjectDataCache.EmCellMeshFull);
