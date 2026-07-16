import { getSimulatableExtracellularRecordingArray } from '@/api/entitycore/queries/model/simulatable-extracellular-recording-array';
import { EntityTypeDict } from '@/api/entitycore/types';
import { ASSET_BASE_PATH } from '@/features/entity-download/constants';
import { Metadata } from '@/features/entity-download/metadata';
import {
  createAssetFileEntry,
  createTemplateFileEntry,
  getMetadataCsvEntryBase,
} from '@/features/entity-download/utils';

import type { WorkspaceContext } from '@/types/common';

export async function* getSimulatableExtracellularRecordingArrayFiles(
  entityIds: string[],
  ctx?: WorkspaceContext
) {
  const metadata = new Metadata<Record<string, unknown>>();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.SimulatableExtracellularRecordingArray);
  } catch {
    // README template is optional
  }

  for (const entityId of entityIds) {
    const recordingArray = await getSimulatableExtracellularRecordingArray({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;
    const dataPath = `${ASSET_BASE_PATH}/${idx}`;
    const idxExtra = { idx, data_path: dataPath };

    metadata.add({
      csv: { ...idxExtra, ...getMetadataCsvEntryBase(recordingArray) },
      json: { ...idxExtra, ...recordingArray },
    });

    for (const asset of recordingArray.assets) {
      try {
        yield await createAssetFileEntry({
          entity: recordingArray,
          asset,
          path: `${dataPath}/${asset.path}`,
          ctx,
        });
      } catch {
        // skip assets that fail to download
      }
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}
