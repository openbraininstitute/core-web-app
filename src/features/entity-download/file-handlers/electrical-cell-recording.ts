/* eslint-disable no-empty */

import { getElectricalCellRecording } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { ASSET_BASE_PATH } from '@/features/entity-download/constants';
import { Metadata } from '@/features/entity-download/metadata';
import type { ElectricalCellRecordingJsonMetadata } from '@/features/entity-download/types';
import {
  createAssetFileEntry,
  createTemplateFileEntry,
  getMetadataCsvEntryBase,
} from '@/features/entity-download/utils';
import type { WorkspaceContext } from '@/types/common';

export async function* getElectricalCellRecordingFiles(
  entityIds: string[],
  ctx?: WorkspaceContext
) {
  const metadata = new Metadata<ElectricalCellRecordingJsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.ElectricalCellRecording);
  } catch {}

  for (const entityId of entityIds) {
    const trace = await getElectricalCellRecording({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSET_BASE_PATH}/${idx}`;
    const idxExtra = { idx, data_path: dataPath };

    metadata.add({
      csv: { ...idxExtra, ...getMetadataCsvEntryBase(trace) },
      json: { ...idxExtra, ...trace },
    });

    for await (const asset of trace.assets) {
      const path = `${dataPath}/${asset.path}`;
      try {
        yield await createAssetFileEntry({ entity: trace, asset, path, ctx });
      } catch {}
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}
