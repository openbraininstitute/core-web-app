import { tableFromIPC } from '@apache-arrow/es2015-esm';
import { getBrainAtlasRegions } from '@/api/entitycore/queries/general/brain-atlas';
import { entityCoreApi } from '@/api/entitycore/utils';
import { config } from '@/config';
import { logError } from '@/util/logger';
import { assertType } from '@/util/type-guards';
import { createHeaders } from '@/util/utils';
import { log } from '@/utils/logger';
import { fetchPointCloud } from '../../api';

let cacheAtlasId: string | null = null;

export async function getAtlasId(accessToken: string | undefined): Promise<string> {
  if (!cacheAtlasId) {
    try {
      const resp = await fetch(`${config.ENTITY_CORE_URL}/brain-atlas`, {
        method: 'GET',
        redirect: 'follow',
        headers: createHeaders(accessToken ?? 'token-is-missing', {
          'Content-Type': 'application/json',
        }),
      });
      if (!accessToken) return config.DEFAULT_BRAIN_ATLAS_ID;

      const data = await resp.json();
      assertType<{ data: Array<{ id: string }> }>(data, {
        data: ['array', { id: 'string' }],
      });
      cacheAtlasId = data.data[0]?.id ?? config.DEFAULT_BRAIN_ATLAS_ID;
    } catch (ex) {
      logError('Unable to retrieve current Atlas ID!', ex);
      return config.DEFAULT_BRAIN_ATLAS_ID;
    }
  }
  return cacheAtlasId;
}

const cacheMeshes = new Map<string, Promise<ArrayBuffer>>();

export async function getBrainRegionMeshArrayBuffer(
  accessToken: string,
  regionId: string,
): Promise<ArrayBuffer> {
  const fromCache = cacheMeshes.get(regionId);
  if (fromCache) return fromCache;

  const promise = actualGetBrainRegionMeshArrayBuffer(accessToken, regionId);
  cacheMeshes.set(regionId, promise);
  return promise;
}

async function actualGetBrainRegionMeshArrayBuffer(
  accessToken: string,
  regionId: string,
): Promise<ArrayBuffer> {
  const atlasId = await getAtlasId(accessToken);
  const atlas = await getAtlas(atlasId);
  const entity = atlas.data.find((elem) => elem.brain_region_id === regionId);
  if (!entity) {
    throw new Error(`Unable to find region "${regionId}" in current Atlas!`);
  }

  const contentType = 'model/gltf-binary';
  // const contentType = 'application/obj';
  const asset = entity.assets.find(
    (elem) => elem.label === 'brain_atlas_region_mesh' && elem.content_type === contentType,
  );
  if (!asset) {
    throw new Error(
      `Unable to find entity "brain_atlas_region_mesh" of type "${contentType}" for entity "${entity.id}" (region "${regionId}")!`,
    );
  }

  const time = performance.now();
  const api = await entityCoreApi();
  const data = await api.get(`/brain-atlas-region/${entity.id}/assets/${asset.id}/download`);
  // eslint-disable-next-line no-console
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

let cacheAtlas: Promise<PartialAtlas> | null = null;

async function getAtlas(atlasId: string) {
  if (cacheAtlas) return cacheAtlas;

  cacheAtlas = actualGetAtlas(atlasId);
  return cacheAtlas;
}

async function actualGetAtlas(atlasId: string) {
  const time = performance.now();
  const atlas = await getBrainAtlasRegions({
    atlasId: atlasId ?? config.DEFAULT_BRAIN_ATLAS_ID,
    filters: {
      page: 1,
      page_size: 2000,
    },
  });

  log('debug', '🚀 [services] atlas =', atlas, `${performance.now() - time} msec`);
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
  return promise;
}

async function actualGetPointCouldData(annotationValue: number, accessToken: string) {
  const _time = performance.now();
  const url = `${config.CELL_API_URL}/circuit?circuit_id=${encodeURIComponent(
    config.LEGACY_DEFAULT_CIRCUIT_ID || '',
  )}&region=${annotationValue}&how=arrow`;
  const rawData = await fetchPointCloud(url, accessToken);
  // eslint-disable-next-line no-console
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
