/* eslint-disable no-empty */
import { getEModel, getMEModel, getReconstructionMorphology } from '@/api/entitycore/queries';
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

export async function* getMEmodelFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata<JsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeEnum.Memodel);
  } catch {}

  for (const entityId of entityIds) {
    const memodel = await getMEModel({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSET_BASE_PATH}/${idx}`;
    const extra = { idx, data_path: dataPath };

    metadata.add({
      csv: { ...getMetadataCsvEntryBase(memodel), ...extra },
      json: { ...memodel, ...extra },
    });

    const emodel = await getEModel({
      id: memodel.emodel.id,
      context: ctx,
    });

    // HOC file
    const hocFileAsset = emodel.assets.find((asset) => asset.label === 'neuron_hoc')!;
    try {
      const path = `${dataPath}/hoc/${hocFileAsset.path}`;
      yield await createAssetFileEntry({ entity: emodel, asset: hocFileAsset, path, ctx });
    } catch (error) {}

    // Morphologies
    const morphology = await getReconstructionMorphology({
      id: memodel.morphology.id,
      context: ctx,
    });

    const morphAssets = morphology.assets.filter((asset) => asset.label === 'morphology');

    for await (const asset of morphAssets) {
      const path = `${dataPath}/morphology/${asset.path}`;
      try {
        yield await createAssetFileEntry({ entity: morphology, asset, path, ctx });
      } catch (error) {}
    }

    // MOD files
    for await (const icEntity of emodel.ion_channel_models) {
      const asset = icEntity.assets.find((a) => a.label === 'neuron_mechanisms')!;
      const path = `${dataPath}/mechanisms/${asset.path}`;
      try {
        yield await createAssetFileEntry({ entity: icEntity, asset, path, ctx });
      } catch (error) {}
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}
