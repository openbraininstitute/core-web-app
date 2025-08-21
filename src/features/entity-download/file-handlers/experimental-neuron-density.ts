/* eslint-disable no-empty */
import { getExperimentalNeuronDensity } from '@/api/entitycore/queries';
import { EntityTypeEnum } from '@/api/entitycore/types';
import { Metadata } from '@/features/entity-download/metadata';
import { createTemplateFileEntry, getMetadataCsvEntryBase } from '@/features/entity-download/utils';
import { WorkspaceContext } from '@/types/common';

type JsonMetadata = {
  [key: string]: any;
};

export async function* getExperimentalNeuronDensityFiles(
  entityIds: string[],
  ctx?: WorkspaceContext
) {
  const metadata = new Metadata<JsonMetadata>();

  try {
    yield await createTemplateFileEntry(EntityTypeEnum.ExperimentalNeuronDensity);
  } catch {}

  for (const entityId of entityIds) {
    const neuronDensity = await getExperimentalNeuronDensity({ id: entityId, context: ctx });

    const idx = metadata.entriesCount;

    metadata.add({
      csv: { ...getMetadataCsvEntryBase(neuronDensity), idx },
      json: { ...neuronDensity, idx },
    });
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}
