/* eslint-disable no-empty */
import { getReconstructionMorphology } from '@/api/entitycore/queries';
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

export async function* getReconstructionMorphologyFiles(
  entityIds: string[],
  ctx?: WorkspaceContext
) {
  const metadata = new Metadata<JsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeEnum.ReconstructionMorphology);
  } catch {}

  for (const entityId of entityIds) {
    const morphology = await getReconstructionMorphology({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSET_BASE_PATH}/${idx}`;
    const idxExtra = { idx, data_path: dataPath };

    metadata.add({
      csv: { ...idxExtra, ...getMetadataCsvEntryBase(morphology) },
      json: { ...idxExtra, ...morphology },
    });

    for await (const asset of morphology.assets) {
      const path = `${dataPath}/${asset.path}`;
      try {
        yield await createAssetFileEntry({ entity: morphology, asset, path, ctx });
      } catch (error) {}
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}
