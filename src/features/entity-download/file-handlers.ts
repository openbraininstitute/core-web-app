import { Readable } from 'stream';
import kebabCase from 'lodash/kebabCase';

import { Metadata } from './metadata';
import {
  getReconstructionMorphology,
  getElectricalCellRecording,
  getExperimentalNeuronDensity,
  getExperimentalBoutonDensity,
  getExperimentalSynapsesPerConnection,
  getEModel,
  getMEModel,
} from '@/api/entitycore/queries';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';
import { EntityTypeEnum, EntityTypeValue } from '@/api/entitycore/types';
import { WorkspaceContext } from '@/types/common';

export const ASSETS_BASE_PATH = 'data';

type FileEntry = {
  path: string;
  stream: Readable;
  size: number;
};

type GetEntityFilesHandler = (
  entityIds: string[],
  ctx?: WorkspaceContext,
  abortSignal?: AbortSignal
) => AsyncGenerator<FileEntry>;

async function* getReconstructionMorphologyFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata();

  for (const entityId of entityIds) {
    const morphology = await getReconstructionMorphology({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSETS_BASE_PATH}/${idx}`;
    metadata.add({ idx, data_path: dataPath, ...morphology });

    for await (const asset of morphology.assets ?? []) {
      const fileName = asset.full_path.split('/').at(-1);
      try {
        const response = await downloadAsset<Response>({
          ctx,
          entityType: kebabCase(EntityTypeEnum.ReconstructionMorphology) as EntityTypeValue,
          entityId,
          id: asset.id,
          asRawResponse: true,
          retryOnError: false,
        });
        yield {
          path: `${ASSETS_BASE_PATH}/${idx}/${fileName}`,
          stream: Readable.fromWeb(response.body),
          size: Number(response.headers.get('content-length')),
        };
      } catch (error) {
        /*
          TODO: report to Sentry once we have data in S3.
          ? Create an error.log in the root of the tar file listing the errors to notify the user.
        */
      }
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

async function* getElectricalCellRecordingFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata();

  for (const entityId of entityIds) {
    const trace = await getElectricalCellRecording({
      id: entityId,
      context: ctx,
    });

    const idx = metadata.entriesCount;

    const dataPath = `${ASSETS_BASE_PATH}/${idx}`;
    metadata.add({ idx, data_path: dataPath, ...trace });

    for await (const asset of trace.assets ?? []) {
      const fileName = asset.full_path.split('/').at(-1);
      try {
        const response = await downloadAsset<Response>({
          ctx,
          entityType: kebabCase(EntityTypeEnum.ElectricalCellRecording) as EntityTypeValue,
          entityId,
          id: asset.id,
          asRawResponse: true,
          retryOnError: false,
        });
        yield {
          path: `${ASSETS_BASE_PATH}/${idx}/${fileName}`,
          stream: Readable.fromWeb(response.body),
          size: Number(response.headers.get('content-length')),
        };
      } catch (error) {
        /*
          TODO: report to Sentry once we have data in S3.
          ? Create an error.log in the root of the tar file listing the errors to notify the user.
        */
      }
    }
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

async function* getExperimentalNeuronDensityFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata();

  for (const entityId of entityIds) {
    const idx = metadata.entriesCount;
    const neuronDensity = await getExperimentalNeuronDensity({ id: entityId, context: ctx });
    metadata.add({ idx, ...neuronDensity });
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

async function* getExperimentalBoutonDensityFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata();

  for (const entityId of entityIds) {
    const idx = metadata.entriesCount;
    const boutonDensity = await getExperimentalBoutonDensity({ id: entityId, context: ctx });
    metadata.add({ idx, ...boutonDensity });
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

async function* getExperimentalSynapsesPerConnectionFiles(
  entityIds: string[],
  ctx?: WorkspaceContext
) {
  const metadata = new Metadata();

  for (const entityId of entityIds) {
    const idx = metadata.entriesCount;
    const expSynapsesPerConnection = await getExperimentalSynapsesPerConnection({
      id: entityId,
      context: ctx,
    });

    metadata.add({ idx, ...expSynapsesPerConnection });
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

async function* getEmodelFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata();

  // TODO: add emodel assets when supported by the API
  for (const entityId of entityIds) {
    const idx = metadata.entriesCount;
    const emodel = await getEModel({
      id: entityId,
      context: ctx,
    });

    metadata.add({ idx, ...emodel });
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

async function* getMEmodelFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata();

  // TODO: add emodel assets when supported by the API
  for (const entityId of entityIds) {
    const idx = metadata.entriesCount;
    const emodel = await getMEModel({
      id: entityId,
      context: ctx,
    });

    metadata.add({ idx, ...emodel });
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

async function* getSingleNeuronSynaptomeFiles(entityIds: string[], ctx?: WorkspaceContext) {
  const metadata = new Metadata();

  // TODO: add emodel assets when supported by the API
  for (const entityId of entityIds) {
    const idx = metadata.entriesCount;
    const emodel = await getSingleNeuronSynaptome({
      id: entityId,
      context: ctx,
    });

    metadata.add({ idx, ...emodel });
  }

  for await (const metadataFileEntry of metadata.getFileEntries()) {
    yield metadataFileEntry;
  }
}

export const getEntityFilesHandlerMap: Partial<Record<EntityTypeValue, GetEntityFilesHandler>> = {
  // Experimental data
  [EntityTypeEnum.ReconstructionMorphology]: getReconstructionMorphologyFiles,
  [EntityTypeEnum.ElectricalCellRecording]: getElectricalCellRecordingFiles,
  [EntityTypeEnum.ExperimentalNeuronDensity]: getExperimentalNeuronDensityFiles,
  [EntityTypeEnum.ExperimentalBoutonDensity]: getExperimentalBoutonDensityFiles,
  [EntityTypeEnum.ExperimentalSynapsesPerConnection]: getExperimentalSynapsesPerConnectionFiles,
  // Model data
  [EntityTypeEnum.Emodel]: getEmodelFiles,
  [EntityTypeEnum.Memodel]: getMEmodelFiles,
  [EntityTypeEnum.SingleNeuronSynaptome]: getSingleNeuronSynaptomeFiles,
};
