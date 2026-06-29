import { getAnalysisNotebookResult } from '@/api/entitycore/queries/analysis-notebook-result';
import { EntityTypeDict } from '@/api/entitycore/types';
import { ASSET_BASE_PATH } from '@/features/entity-download/constants';
import { Metadata } from '@/features/entity-download/metadata';
import {
  createAssetFileEntry,
  createTemplateFileEntry,
  getMetadataCsvEntryBase,
} from '@/features/entity-download/utils';

import type { NotebookJsonMetadata } from '@/features/entity-download/types';
import type { WorkspaceContext } from '@/types/common';

export async function* getNotebookResultFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata<NotebookJsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.AnalysisNotebookResult);
  } catch {}

  for (const entityId of entityIds) {
    const result = await getAnalysisNotebookResult({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSET_BASE_PATH}/${idx}`;
    const idxExtra = { idx, data_path: dataPath };

    metadata.add({
      csv: { ...idxExtra, ...getMetadataCsvEntryBase(result) },
      json: { ...idxExtra, ...result },
    });

    for await (const asset of result.assets) {
      const path = `${dataPath}/${asset.path}`;
      try {
        yield await createAssetFileEntry({
          entity: result,
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
