/* eslint-disable no-empty */

import { getExperimentalSynapsesPerConnection } from '@/api/entitycore/queries';
import { Metadata } from '@/features/entity-download/metadata';
import { EntityTypeDict } from '@/api/entitycore/types';
import { ExperimentalSynapsesPerConnectionJsonMetadata } from '@/features/entity-download/types';
import { createTemplateFileEntry, getMetadataCsvEntryBase } from '@/features/entity-download/utils';
import { WorkspaceContext } from '@/types/common';

export async function* getExperimentalSynapsesPerConnectionFiles(
  entityIds: string[],
  ctx?: WorkspaceContext
) {
  const metadata = new Metadata<ExperimentalSynapsesPerConnectionJsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.ExperimentalSynapsesPerConnection);
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
