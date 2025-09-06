/* eslint-disable no-empty */
import { getCellMorphology } from '@/api/entitycore/queries';
import { EntityTypeEnum } from '@/api/entitycore/types';
import { ASSET_BASE_PATH } from '@/features/entity-download/constants';
import { Metadata } from '@/features/entity-download/metadata';
import { CellMorphologyJsonMetadata } from '@/features/entity-download/types';
import {
  createAssetFileEntry,
  createTemplateFileEntry,
  getMetadataCsvEntryBase,
} from '@/features/entity-download/utils';
import { WorkspaceContext } from '@/types/common';

export async function* getCellMorphologyFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata<CellMorphologyJsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeEnum.CellMorphology);
  } catch {}

  for (const entityId of entityIds) {
    const morphology = await getCellMorphology({
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
