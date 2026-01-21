import { getCircuit } from '@/api/entitycore/queries/model/circuit';

import { EntityTypeDict } from '@/api/entitycore/types';
import { ASSET_BASE_PATH } from '@/features/entity-download/constants';
import { Metadata } from '@/features/entity-download/metadata';
import {
  createAssetFileEntry,
  createTemplateFileEntry,
  getMetadataCsvEntryBase,
} from '@/features/entity-download/utils';
import type { WorkspaceContext } from '@/types/common';

export async function* getCircuitFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata<Record<string, any>>();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.Circuit);
  } catch {}

  for (const entityId of entityIds) {
    const circuit = await getCircuit({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSET_BASE_PATH}/${idx}`;
    const idxExtra = { idx, data_path: dataPath };

    metadata.add({
      csv: { ...idxExtra, ...getMetadataCsvEntryBase(circuit) },
      json: { ...idxExtra, ...circuit },
    });

    const neededAssetsLabel = ['compressed_sonata_circuit', 'circuit_visualization'];

    for (const assLabel of neededAssetsLabel) {
      const configAsset = circuit.assets.find((asset) => asset.label === assLabel)!;

      if (configAsset) {
        try {
          const path = `${dataPath}/${configAsset.path}`;
          yield await createAssetFileEntry({
            entity: circuit,
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
}
