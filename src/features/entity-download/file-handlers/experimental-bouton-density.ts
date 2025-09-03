/* eslint-disable no-empty */

import { getExperimentalBoutonDensity } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { Metadata } from '@/features/entity-download/metadata';
import { ExperimentalBoutonDensityJsonMetadata } from '@/features/entity-download/types';
import { createTemplateFileEntry, getMetadataCsvEntryBase } from '@/features/entity-download/utils';
import { WorkspaceContext } from '@/types/common';

export async function* getExperimentalBoutonDensityFiles(
  entityIds: string[],
  ctx?: WorkspaceContext
) {
  const metadata = new Metadata<ExperimentalBoutonDensityJsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.ExperimentalBoutonDensity);
  } catch {}

  for (const entityId of entityIds) {
    const boutonDensity = await getExperimentalBoutonDensity({ id: entityId, context: ctx });

    const idx = metadata.entriesCount;

    const idxExtra = { idx };

    metadata.add({
      csv: { ...idxExtra, ...getMetadataCsvEntryBase(boutonDensity) },
      json: { ...idxExtra, ...boutonDensity },
    });
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}
