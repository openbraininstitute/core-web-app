/* eslint-disable no-empty */
import { getExperimentalSynapsesPerConnection } from '@/api/entitycore/queries';
import { EntityTypeEnum } from '@/api/entitycore/types';
import { Metadata } from '@/features/entity-download/metadata';
import { createTemplateFileEntry, getMetadataCsvEntryBase } from '@/features/entity-download/utils';
import { WorkspaceContext } from '@/types/common';

type JsonMetadata = {
  [key: string]: any;
};

export async function* getExperimentalSynapsesPerConnectionFiles(
  entityIds: string[],
  ctx?: WorkspaceContext
) {
  const metadata = new Metadata<JsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeEnum.ExperimentalSynapsesPerConnection);
  } catch {}

  for (const entityId of entityIds) {
    const expSynapsesPerConnection = await getExperimentalSynapsesPerConnection({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const idxExtra = { idx };

    metadata.add({
      csv: { ...idxExtra, ...getMetadataCsvEntryBase(expSynapsesPerConnection) },
      json: { ...idxExtra, ...expSynapsesPerConnection },
    });
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}
