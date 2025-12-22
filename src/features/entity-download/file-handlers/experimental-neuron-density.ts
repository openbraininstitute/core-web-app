/* eslint-disable no-empty */

import { getExperimentalNeuronDensity } from '@/api/entitycore/queries';
import { EntityTypeDict } from '@/api/entitycore/types';
import { Metadata } from '@/features/entity-download/metadata';
import { ExperimentalNeuronDensityJsonMetadata } from '@/features/entity-download/types';
import { createTemplateFileEntry, getMetadataCsvEntryBase } from '@/features/entity-download/utils';
import { WorkspaceContext } from '@/types/common';

export async function* getExperimentalNeuronDensityFiles(
  entityIds: string[],
  ctx?: WorkspaceContext
) {
  const metadata = new Metadata<ExperimentalNeuronDensityJsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeDict.ExperimentalNeuronDensity);
  } catch {}

  for (const entityId of entityIds) {
    const neuronDensity = await getExperimentalNeuronDensity({ id: entityId, context: ctx });

    const idx = metadata.entriesCount;

    const idxExtra = { idx };

    metadata.add({
      csv: { ...idxExtra, ...getMetadataCsvEntryBase(neuronDensity) },
      json: { ...idxExtra, ...neuronDensity },
    });
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}
