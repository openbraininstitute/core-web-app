import { getTaskResult } from '@/api/entitycore/queries/task';
import { EntityTypeDict } from '@/api/entitycore/types';
import { ASSET_BASE_PATH } from '@/features/entity-download/constants';
import { getAssetFolderFiles } from '@/features/entity-download/file-handlers/asset-folder';
import { Metadata } from '@/features/entity-download/metadata';
import {
  createAssetFileEntry,
  createTemplateFileEntry,
  getMetadataCsvEntryBase,
} from '@/features/entity-download/utils';

import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { FileEntry, TaskResultJsonMetadata } from '@/features/entity-download/types';
import type { WorkspaceContext } from '@/types/common';

/**
 * Streams one directory asset as the files it contains.
 *
 * @param params.entityId - Task result the asset belongs to.
 * @param params.asset - The directory asset to expand.
 * @param params.dataPath - Archive folder of the entity this asset belongs to.
 * @param params.ctx - Workspace the entity is read from.
 * @yields One entry per file inside the directory, nested under the asset's own name.
 *
 * @remarks
 * A directory asset has no body of its own — downloading its id returns nothing — so its contents
 * have to be listed and fetched one path at a time.
 */
async function* getDirectoryAssetFiles({
  entityId,
  asset,
  dataPath,
  ctx,
}: {
  entityId: string;
  asset: IAsset;
  dataPath: string;
  ctx?: WorkspaceContext;
}): AsyncGenerator<FileEntry> {
  const files = getAssetFolderFiles({
    entityType: EntityTypeDict.TaskResult,
    entityId,
    assetId: asset.id,
    prefix: '',
    ctx,
  });

  for await (const file of files) {
    yield { ...file, path: `${dataPath}/${asset.path}/${file.path}` };
  }
}

/**
 * Collects the archive entries for a selection of task results.
 *
 * @param entityIds - Task result ids, in the order the user selected them.
 * @param ctx - Workspace the entities are read from.
 * @yields A README, every asset of every entity under `data/<idx>/`, then the metadata files.
 *
 * @remarks
 * Registered for the `task_result` entitycore type, which every workflow result shares — the
 * archive is built from the record's assets rather than from its `task_result_type`, so a new
 * result kind is downloadable without changing this handler.
 */
export async function* getTaskResultFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata<TaskResultJsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.TaskResult);
  } catch {}

  for (const entityId of entityIds) {
    const result = await getTaskResult({ id: entityId, context: ctx });

    const idx = metadata.entriesCount;
    const dataPath = `${ASSET_BASE_PATH}/${idx}`;
    const idxExtra = { idx, data_path: dataPath };

    metadata.add({
      csv: { ...idxExtra, ...getMetadataCsvEntryBase(result) },
      json: { ...idxExtra, ...result },
    });

    for (const asset of result.assets ?? []) {
      try {
        if (asset.is_directory) {
          yield* getDirectoryAssetFiles({ entityId, asset, dataPath, ctx });
          continue;
        }

        yield await createAssetFileEntry({
          entity: result,
          asset,
          path: `${dataPath}/${asset.path}`,
          ctx,
        });
      } catch {}
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}
