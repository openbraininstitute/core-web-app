import { tableFromIPC } from '@apache-arrow/es2015-esm';

import { swrCacheConfig } from '@/api/cache-storage';
import { AssetContentType } from '@/api/entitycore/types/shared/global';
import { entityCoreApi } from '@/api/entitycore/utils';
import { config } from '@/config';
import { fetchPointCloud } from '@/features/brain-atlas-viewer/api';
import { ensureBrainRegionAtlasData } from '@/features/brain-atlas-viewer/queries';
import { log } from '@/utils/logger';

import { RegionMeshNotAvailableError } from './errors';

import type { QueryClient } from '@tanstack/react-query';

const cacheMeshes = new Map<string, Promise<ArrayBuffer>>();

export async function getCachedBrainRegionMeshArrayBuffer({
  atlasId,
  regionId,
  queryClient,
}: {
  regionId: string;
  atlasId: string;
  queryClient: QueryClient;
}): Promise<ArrayBuffer> {
  const cacheKey = `${atlasId}:${regionId}`;
  const fromCache = cacheMeshes.get(cacheKey);
  if (fromCache) return fromCache;

  const promise = getBrainRegionMeshArrayBufferQuery({ atlasId, regionId, queryClient });
  cacheMeshes.set(cacheKey, promise);

  promise.catch(() => {
    cacheMeshes.delete(cacheKey);
  });

  return promise;
}

async function getBrainRegionMeshArrayBufferQuery({
  atlasId,
  regionId,
  queryClient,
}: {
  atlasId: string;
  regionId: string;
  queryClient: QueryClient;
}): Promise<ArrayBuffer> {
  log('info', '[GetBrainRegionMeshArrayBufferQuery]', {
    atlasId,
    regionId,
  });
  const atlas = await getAtlas({ atlasId, queryClient });
  const entity = atlas.data.find((elem) => elem.brain_region_id === regionId);
  if (!entity) {
    throw new RegionMeshNotAvailableError(
      regionId,
      atlasId,
      `Unable to find region "${regionId}" in current Atlas ${atlasId}!`
    );
  }

  const contentType = AssetContentType.gltf_binary;
  // const contentType = 'application/obj';
  const asset = entity.assets.find(
    (elem) => elem.label === 'brain_atlas_region_mesh' && elem.content_type === contentType
  );
  if (!asset) {
    throw new RegionMeshNotAvailableError(
      regionId,
      atlasId,
      `Unable to find entity "brain_atlas_region_mesh" of type "${contentType}" for entity "${entity.id}" (region "${regionId}")!`
    );
  }

  const time = performance.now();
  const api = await entityCoreApi();
  const data = await api.get(
    `/brain-atlas-region/${entity.id}/assets/${asset.id}/download`,
    undefined,
    { cache: swrCacheConfig('brain-atlas-meshes') }
  );

  log('debug', 'GLTF', `${performance.now() - time} msec`, data);
  const mesh = data instanceof ArrayBuffer ? data : null;
  if (!mesh) {
    throw new Error(`Unable to download asset "${asset.id}" for entity "${entity.id}"!`);
  }
  return mesh;
}

async function getAtlas({ atlasId, queryClient }: { atlasId: string; queryClient: QueryClient }) {
  return ensureBrainRegionAtlasData(queryClient, atlasId);
}

const cachePointClouds = new Map<number, Promise<Float32Array>>();

export async function getPointCouldData(annotationValue: number, accessToken: string) {
  const fromCache = cachePointClouds.get(annotationValue);
  if (fromCache) return fromCache;

  const promise = actualGetPointCouldData(annotationValue, accessToken);
  cachePointClouds.set(annotationValue, promise);

  // Evict from cache on failure so retries can succeed
  promise.catch(() => {
    cachePointClouds.delete(annotationValue);
  });

  return promise;
}

async function actualGetPointCouldData(annotationValue: number, accessToken: string) {
  const rawData = await fetchPointCloud(
    { circuitId: config.LEGACY_DEFAULT_CIRCUIT_ID || '', annotationValue },
    accessToken
  );
  const table = tableFromIPC(rawData);
  const array = table.toArray();
  const dataPoint = new Float32Array(array.length * 4);
  let index = 0;
  for (const dataStr of array) {
    const data = JSON.parse(dataStr);
    dataPoint[index++] = data.x;
    dataPoint[index++] = data.y;
    dataPoint[index++] = data.z;
    dataPoint[index++] = 100;
  }
  return dataPoint;
}
