/* eslint-disable no-empty */

import { getCellMorphology, getEModel } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { ASSET_BASE_PATH } from '@/features/entity-download/constants';
import { Metadata } from '@/features/entity-download/metadata';
import type { EmodelJsonMetadata } from '@/features/entity-download/types';
import {
  createAssetFileEntry,
  createTemplateFileEntry,
  getMetadataCsvEntryBase,
} from '@/features/entity-download/utils';
import type { WorkspaceContext } from '@/types/common';

export async function* getEmodelFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata<EmodelJsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.Emodel);
  } catch {}

  for (const entityId of entityIds) {
    const emodel = await getEModel({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSET_BASE_PATH}/${idx}`;
    const idxExtra = { idx, data_path: dataPath };

    metadata.add({
      csv: { ...idxExtra, ...getMetadataCsvEntryBase(emodel) },
      json: { ...idxExtra, ...emodel },
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
    } catch {}

    // Emodel optimization output
    const emodelOptOutputAsset = emodel.assets.find(
      (asset) => asset.label === 'emodel_optimization_output'
    )!;
    try {
      const path = `${dataPath}/${emodelOptOutputAsset.label}/${emodelOptOutputAsset.path}`;
      yield await createAssetFileEntry({
        entity: emodel,
        asset: emodelOptOutputAsset,
        path,
        ctx,
      });
    } catch {}

    // Morphologies
    const exemplarMorphology = await getCellMorphology({
      id: emodel.exemplar_morphology.id,
      context: ctx,
    });

    const morphAssets = exemplarMorphology.assets.filter((asset) => asset.label === 'morphology');

    for await (const asset of morphAssets) {
      const path = `${dataPath}/${asset.label}/${asset.path}`;
      try {
        yield await createAssetFileEntry({
          entity: exemplarMorphology,
          asset,
          path,
          ctx,
        });
      } catch {}
    }

    // MOD files
    for await (const icEntity of emodel.ion_channel_models) {
      const modAsset = icEntity.assets.find((asset) => asset.label === 'neuron_mechanisms')!;
      const path = `${dataPath}/${modAsset.label}/${modAsset.path}`;
      try {
        yield await createAssetFileEntry({
          entity: icEntity,
          asset: modAsset,
          path,
          ctx,
        });
      } catch {}
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}
