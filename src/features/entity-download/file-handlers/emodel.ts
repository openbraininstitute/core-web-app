/* eslint-disable no-empty */
import { getEModel, getReconstructionMorphology } from '@/api/entitycore/queries';
import { EntityTypeEnum } from '@/api/entitycore/types';
import { ASSET_BASE_PATH } from '@/features/entity-download/constants';
import { Metadata } from '@/features/entity-download/metadata';
import {
  createAssetFileEntry,
  createTemplateFileEntry,
  getMetadataCsvEntryBase,
} from '@/features/entity-download/utils';
import { WorkspaceContext } from '@/types/common';

type JsonMetadata = {
  [key: string]: any;
};

export async function* getEmodelFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata<JsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeEnum.Emodel);
  } catch {}

  for (const entityId of entityIds) {
    const emodel = await getEModel({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSET_BASE_PATH}/${idx}`;
    const extra = { idx, data_path: dataPath };

    metadata.add({
      csv: { ...getMetadataCsvEntryBase(emodel), ...extra },
      json: { ...emodel, ...extra },
    });

    // HOC file
    const hocFileAsset = emodel.assets.find((asset) => asset.label === 'neuron_hoc')!;

    try {
      const path = `${dataPath}/hoc/${hocFileAsset.path}`;
      yield await createAssetFileEntry({ entity: emodel, asset: hocFileAsset, path, ctx });
    } catch {}

    // Morphologies
    const exemplarMorphology = await getReconstructionMorphology({
      id: emodel.exemplar_morphology.id,
      context: ctx,
    });

    const morphAssets = exemplarMorphology.assets.filter((asset) => asset.label === 'morphology');

    for await (const asset of morphAssets) {
      const path = `${dataPath}/morphology/${asset.path}`;
      try {
        yield await createAssetFileEntry({ entity: exemplarMorphology, asset, path, ctx });
      } catch {}
    }

    // MOD files
    for await (const icEntity of emodel.ion_channel_models) {
      const modAsset = icEntity.assets.find((asset) => asset.label === 'neuron_mechanisms')!;
      const path = `${dataPath}/mechanisms/${modAsset.path}`;
      try {
        yield await createAssetFileEntry({ entity: icEntity, asset: modAsset, path, ctx });
      } catch {}
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}
