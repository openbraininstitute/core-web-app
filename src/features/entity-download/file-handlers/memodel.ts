/* eslint-disable no-empty */

import { getCellMorphology, getEModel, getMEModel } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { ASSET_BASE_PATH } from '@/features/entity-download/constants';
import { Metadata } from '@/features/entity-download/metadata';
import type { MemodelJsonMetadata } from '@/features/entity-download/types';
import {
  createAssetFileEntry,
  createTemplateFileEntry,
  getMetadataCsvEntryBase,
} from '@/features/entity-download/utils';
import type { WorkspaceContext } from '@/types/common';

export async function* getMEmodelFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata<MemodelJsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.Memodel);
  } catch {}

  for (const entityId of entityIds) {
    const memodel = await getMEModel({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSET_BASE_PATH}/${idx}`;
    const idxExtra = { idx, data_path: dataPath };

    metadata.add({
      csv: { ...idxExtra, ...getMetadataCsvEntryBase(memodel) },
      json: { ...idxExtra, ...memodel },
    });

    const emodel = await getEModel({
      id: memodel.emodel.id,
      context: ctx,
    });

    // HOC file
    const hocFileAsset = emodel.assets.find((asset) => asset.label === 'neuron_hoc')!;
    try {
      const path = `${dataPath}/${hocFileAsset.label}/${hocFileAsset.path}`;
      yield await createAssetFileEntry({
        entity: emodel,
        asset: hocFileAsset,
        path,
        ctx,
      });
    } catch (_error) {}

    // Morphologies
    const morphology = await getCellMorphology({
      id: memodel.morphology.id,
      context: ctx,
    });

    const morphAssets = morphology.assets.filter((asset) => asset.label === 'morphology');

    for await (const asset of morphAssets) {
      const path = `${dataPath}/${asset.label}/${asset.path}`;
      try {
        yield await createAssetFileEntry({
          entity: morphology,
          asset,
          path,
          ctx,
        });
      } catch (_error) {}
    }

    // MOD files
    for await (const icEntity of emodel.ion_channel_models) {
      const asset = icEntity.assets.find((a) => a.label === 'neuron_mechanisms')!;
      const path = `${dataPath}/${asset.label}/${asset.path}`;
      try {
        yield await createAssetFileEntry({
          entity: icEntity,
          asset,
          path,
          ctx,
        });
      } catch (_error) {}
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}
