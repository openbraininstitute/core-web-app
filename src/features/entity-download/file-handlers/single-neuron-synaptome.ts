import { getCellMorphology, getEModel, getMEModel } from '@/api/entitycore/queries';
import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { EntityTypeDict } from '@/api/entitycore/types';
import { ASSET_BASE_PATH } from '@/features/entity-download/constants';
import { Metadata } from '@/features/entity-download/metadata';
import type { SingleNeuronSynaptomeJsonMetadata } from '@/features/entity-download/types';
import {
  createAssetFileEntry,
  createTemplateFileEntry,
  getMetadataCsvEntryBase,
} from '@/features/entity-download/utils';
import type { WorkspaceContext } from '@/types/common';

export async function* getSingleNeuronSynaptomeFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata<SingleNeuronSynaptomeJsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.SingleNeuronSynaptome);
  } catch {}

  // TODO: add emodel assets when supported by the API
  for (const entityId of entityIds) {
    const singleNeuronSynaptomeModel = await getSingleNeuronSynaptome({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSET_BASE_PATH}/${idx}`;
    const idxExtra = { idx, data_path: dataPath };

    metadata.add({
      csv: {
        ...idxExtra,
        ...getMetadataCsvEntryBase(singleNeuronSynaptomeModel),
      },
      json: { ...idxExtra, ...singleNeuronSynaptomeModel },
    });

    // Synaptome config
    const synaptomeConfigAsset = singleNeuronSynaptomeModel.assets.find(
      (asset) => asset.label === 'single_neuron_synaptome_config'
    )!;
    try {
      const path = `${dataPath}/${synaptomeConfigAsset.path}`;
      yield await createAssetFileEntry({
        entity: singleNeuronSynaptomeModel,
        asset: synaptomeConfigAsset,
        path,
        ctx,
      });
    } catch {}

    const memodel = await getMEModel({
      id: singleNeuronSynaptomeModel.me_model.id,
      context: ctx,
    });

    const emodel = await getEModel({
      id: memodel.emodel.id,
      context: ctx,
    });

    // HOC file
    const hocFileAsset = emodel.assets.find((asset) => asset.label === 'neuron_hoc')!;
    try {
      const fileName = hocFileAsset.full_path.split('/').at(-1);
      const path = `${dataPath}/hoc/${fileName}`;
      yield await createAssetFileEntry({
        entity: emodel,
        asset: hocFileAsset,
        path,
        ctx,
      });
    } catch {}

    // Morphologies
    const morphology = await getCellMorphology({
      id: memodel.morphology.id,
      context: ctx,
    });

    const morphAssets = morphology.assets.filter((asset) => asset.label === 'morphology');

    for await (const asset of morphAssets) {
      const path = `${dataPath}/morphology/${asset.path}`;
      try {
        yield await createAssetFileEntry({
          entity: morphology,
          asset,
          path,
          ctx,
        });
      } catch {}
    }

    // MOD files
    for await (const icEntity of emodel.ion_channel_models) {
      const asset = icEntity.assets.find((a) => a.label === 'neuron_mechanisms')!;
      const path = `${dataPath}/mechanisms/${asset.path}`;
      try {
        yield await createAssetFileEntry({
          entity: icEntity,
          asset,
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
