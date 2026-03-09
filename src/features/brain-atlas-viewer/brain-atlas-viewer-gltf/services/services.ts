import { tableFromIPC } from '@apache-arrow/es2015-esm';

import { getBrainAtlasRegions } from '@/api/entitycore/queries/general/brain-atlas';
import { entityCoreApi } from '@/api/entitycore/utils';
import { config } from '@/config';
import { fetchPointCloud } from '@/features/brain-atlas-viewer/api';
import { assertType } from '@/util/type-guards';
import { log } from '@/utils/logger';

const cacheMeshes = new Map<string, Promise<ArrayBuffer>>();

export async function getCachedBrainRegionMeshArrayBuffer({
  atlasId,
  regionId,
}: {
  regionId: string;
  atlasId: string;
}): Promise<ArrayBuffer> {
  const cacheKey = `${atlasId}:${regionId}`;
  const fromCache = cacheMeshes.get(cacheKey);
  if (fromCache) return fromCache;

  const promise = getBrainRegionMeshArrayBufferQuery({ atlasId, regionId });
  cacheMeshes.set(cacheKey, promise);
  return promise;
}

async function getBrainRegionMeshArrayBufferQuery({
  atlasId,
  regionId,
}: {
  atlasId: string;
  regionId: string;
}): Promise<ArrayBuffer> {
  log('info', '[GetBrainRegionMeshArrayBufferQuery]', {
    atlasId,
    regionId,
  });
  const atlas = await getAtlas(atlasId);
  const entity = atlas.data.find((elem) => elem.brain_region_id === regionId);
  if (!entity) {
    throw new Error(`Unable to find region "${regionId}" in current Atlas ${atlasId}!`);
  }

  const contentType = 'model/gltf-binary';
  const asset = entity.assets.find(
    (elem) => elem.label === 'brain_atlas_region_mesh' && elem.content_type === contentType
  );
  if (!asset) {
    throw new Error(
      `Unable to find entity "brain_atlas_region_mesh" of type "${contentType}" for entity "${entity.id}" (region "${regionId}")!`
    );
  }

  const time = performance.now();
  const api = await entityCoreApi();
  const data = await api.get(`/brain-atlas-region/${entity.id}/assets/${asset.id}/download`);

  log('debug', 'GLTF', `${performance.now() - time} msec`, data);
  const mesh = data instanceof ArrayBuffer ? data : null;
  if (!mesh) {
    throw new Error(`Unable to download asset "${asset.id}" for entity "${entity.id}"!`);
  }
  return mesh;
}

interface PartialAtlas {
  data: Array<{
    id: string;
    brain_region_id: string;
    assets: Array<{
      id: string;
      content_type: string;
      label: string;
      full_path: string;
    }>;
  }>;
}

const cacheAtlas = new Map<string, Promise<PartialAtlas>>();

async function getAtlas(atlasId: string) {
  const fromCache = cacheAtlas.get(atlasId);
  if (fromCache) return fromCache;

  const promise = actualGetAtlas(atlasId);
  cacheAtlas.set(atlasId, promise);
  return promise;
}

async function actualGetAtlas(atlasId: string) {
  const atlas = await getBrainAtlasRegions({
    atlasId,
    filters: {
      page: 1,
      page_size: 2000,
    },
  });
  assertType<PartialAtlas>(atlas, {
    data: [
      'array',
      {
        id: 'string',
        brain_region_id: 'string',
        assets: [
          'array',
          {
            content_type: 'string',
            label: 'string',
            full_path: 'string',
          },
        ],
      },
    ],
  });
  return atlas;
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
  const url = `${config.CELL_API_URL}/circuit?circuit_id=${encodeURIComponent(
    config.LEGACY_DEFAULT_CIRCUIT_ID || ''
  )}&region=${annotationValue}&how=arrow`;
  const rawData = await fetchPointCloud(url, accessToken);
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
