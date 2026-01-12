import isNil from "es-toolkit/compat/isNil";
import { atom } from "jotai";
import { atomFamily } from "jotai-family";

import { downloadAsset } from "@/api/entitycore/queries/assets";
import {
  getBrainAtlases,
  getBrainAtlasRegion,
  getBrainAtlasRegions,
} from "@/api/entitycore/queries/general/brain-atlas";
import { EntityTypeDict } from "@/api/entitycore/types";
import { tryCatch } from "@/api/utils";
import { config } from "@/config";
import { arrayBufferToString } from "@/utils/buffer";
import { useQuery } from "@tanstack/react-query";
import { keyBuilderAtlas } from "@/ui/use-query-keys/atlas";

const defaultAtlasName = "BlueBrain Atlas";

export const brainAtlasAtom = atom(async () => {
  const { data, error } = await tryCatch(
    getBrainAtlases({
      filters: { name: defaultAtlasName },
    }),
  );
  if (error)
    throw Error(`Unable to retrieve brain atlas data for ${defaultAtlasName}`);
  return data.data.at(0);
});

export const useBrainAtlasQuery = (name: string = defaultAtlasName) => {
  const { data, isError, isLoading } = useQuery({
    queryKey: keyBuilderAtlas.defaultBrainAtlas(),
    queryFn: () =>
      getBrainAtlases({
        filters: { name },
      }),
  });
  return { atlas: data?.data.at(0), error: isError, loadingAtlas: isLoading };
};

async function resolveBrainRegionAtlasMesh({
  atlasRegionId,
  atlasId = config.DEFAULT_BRAIN_ATLAS_ID,
}: {
  atlasRegionId: string;
  atlasId?: string;
}) {
  const { data: atlasRegions, error: atlasError } = await tryCatch(
    getBrainAtlasRegion({ atlasId, atlasRegionId }),
  );
  if (atlasError)
    throw Error(
      `Unable to retrieve data for brain region id "${atlasRegionId}" in atlas "${atlasId}`,
    );
  const atlasAssetId = atlasRegions.assets.at(0)?.id;
  if (isNil(atlasAssetId))
    throw Error(`No mesh data available for brain region ID "${atlasRegionId}`);

  const { data: asset, error: assetError } = await tryCatch(
    downloadAsset<ArrayBuffer>({
      asRawResponse: false,
      entityType: EntityTypeDict.BrainAtlasRegion,
      entityId: atlasRegions.id,
      id: atlasAssetId,
    } as const),
  );

  if (assetError)
    throw Error(
      `Failed to download mesh asset (ID: "${atlasAssetId}") for brain region ID "${atlasRegionId}`,
    );

  return arrayBufferToString(asset);
}

export const useBrainRegionAtlasQuery = () => {
  const { atlas } = useBrainAtlasQuery();
  const { data, isLoading, error } = useQuery({
    queryKey: keyBuilderAtlas.atlas({
      atlasId: atlas?.id ?? config.DEFAULT_BRAIN_ATLAS_ID,
      page: 1,
      page_size: 1500,
    }),
    queryFn: () =>
      getBrainAtlasRegions({
        atlasId: atlas?.id ?? config.DEFAULT_BRAIN_ATLAS_ID,
        filters: { page: 1, page_size: 1500 },
      }),
    enabled: !!atlas?.id,
  });

  return {
    atlas: data?.data,
    loadingAtlas: isLoading,
    error,
  };
};

export const brainRegionAtlasAtom = atom(async (get) => {
  const brainAtlas = await get(brainAtlasAtom);
  return await tryCatch(
    getBrainAtlasRegions({
      atlasId: brainAtlas?.id ?? config.DEFAULT_BRAIN_ATLAS_ID,
      filters: { page: 1, page_size: 1500 },
    }),
  );
});

export const getAtlasMeshAsset = atomFamily((brainRegionId: string) => {
  const childAtom = atom(async (get) => {
    const fullAtlas = await get(brainRegionAtlasAtom);
    const brainAtlas = await get(brainAtlasAtom);
    const atlasItem = fullAtlas.data?.data.find(
      (o) => o.brain_region_id === brainRegionId,
    );
    if (!atlasItem)
      throw new Error(
        `Atlas details for brain region ${brainRegionId} not found`,
      );
    const { data, error } = await tryCatch(
      resolveBrainRegionAtlasMesh({
        atlasId: brainAtlas?.id,
        atlasRegionId: atlasItem.id,
      }),
    );
    if (error || !data) throw error ?? new Error("Mesh is empty");
    return { data, error };
  });

  childAtom.debugLabel = `atlas-mesh/${brainRegionId}`;
  return childAtom;
});

brainRegionAtlasAtom.debugLabel = "full-brain-atlas";
