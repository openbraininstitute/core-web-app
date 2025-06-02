import { atomFamily } from 'jotai/utils';
import { atom } from 'jotai';

import isNil from 'lodash/isNil';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import {
  getBrainAtlasRegion,
  getBrainAtlasRegions,
} from '@/api/entitycore/queries/general/brain-atlas';
import { arrayBufferToString } from '@/utils/buffer';
import { tryCatch } from '@/api/utils';
import { env } from '@/env';

export async function resolveBrainRegionAtlasMesh({
  atlasRegionId,
  atlasId = env.NEXT_PUBLIC_DEFAULT_BRAIN_ATLAS_ID,
}: {
  atlasRegionId: string;
  atlasId?: string;
}) {
  const { data: atlas, error: atlasError } = await tryCatch(
    getBrainAtlasRegion({ atlasId, atlasRegionId })
  );
  if (atlasError)
    throw Error(
      `Unable to retrieve data for brain region id "${atlasRegionId}" in atlas "${atlasId}`
    );
  const atlasAssetId = atlas.assets.at(0)?.id;
  if (isNil(atlasAssetId))
    throw Error(`No mesh data available for brain region ID "${atlasRegionId}`);
  const { data: asset, error: assetError } = await tryCatch(
    downloadAsset<ArrayBuffer>({
      // @ts-expect-error
      entityType: 'brain-atlas-region',
      entityId: atlas.id,
      asRawResponse: false,
      id: atlasAssetId,
    })
  );

  if (assetError)
    throw Error(
      `Failed to download mesh asset (ID: "${atlasAssetId}") for brain region ID "${atlasRegionId}`
    );
  const data = arrayBufferToString(asset);
  return data;
}

export const brainRegionAtlasAtom = atom(async () => {
  return await tryCatch(
    getBrainAtlasRegions({
      atlasId: env.NEXT_PUBLIC_DEFAULT_BRAIN_ATLAS_ID,
      filters: { page: 1, page_size: 1500 },
    })
  );
});

export const getAtlasMeshAsset = atomFamily((brainRegionId: string) => {
  const childAtom = atom(async (get) => {
    const fullAtlas = await get(brainRegionAtlasAtom);
    const atlasItem = fullAtlas.data?.data.find((o) => o.brain_region_id === brainRegionId);
    if (!atlasItem) throw new Error(`Atlas details for brain region ${brainRegionId} not found`);
    const { data, error } = await tryCatch(
      resolveBrainRegionAtlasMesh({ atlasRegionId: atlasItem.id })
    );
    if (error || !data) throw error ?? new Error('Mesh is empty');
    return { data, error };
  });

  childAtom.debugLabel = `atlas-mesh/${brainRegionId}`;
  return childAtom;
});

brainRegionAtlasAtom.debugLabel = 'full-brain-atlas';
