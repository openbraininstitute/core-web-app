import { getSingleNeuronSimulation } from '@/api/entitycore/queries';

import { EntityTypeDict } from '@/api/entitycore/types';
import { ASSET_BASE_PATH } from '@/features/entity-download/constants';
import { Metadata } from '@/features/entity-download/metadata';
import {
  createAssetFileEntry,
  createTemplateFileEntry,
  getMetadataCsvEntryBase,
} from '@/features/entity-download/utils';
import type { WorkspaceContext } from '@/types/common';

export async function* getSingleNeuronSimulationFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata<Record<string, any>>();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.SingleNeuronSimulation);
  } catch {}

  for (const entityId of entityIds) {
    const singleNeuronSimulation = await getSingleNeuronSimulation({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSET_BASE_PATH}/${idx}`;
    const idxExtra = { idx, data_path: dataPath };

    metadata.add({
      csv: { ...idxExtra, ...getMetadataCsvEntryBase(singleNeuronSimulation) },
      json: { ...idxExtra, ...singleNeuronSimulation },
    });

    const configAsset = singleNeuronSimulation.assets.find(
      (asset) => asset.label === 'single_neuron_simulation_data'
    );
    if (configAsset) {
      try {
        const path = `${dataPath}/${configAsset.path}`;
        yield await createAssetFileEntry({
          entity: singleNeuronSimulation,
          asset: configAsset,
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
