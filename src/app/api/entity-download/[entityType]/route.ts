import { pipeline, Readable } from 'stream';
import { promisify } from 'util';
import { createGzip } from 'zlib';

import z from 'zod';
import tar from 'tar-stream';
import snakeCase from 'lodash/snakeCase';
import kebabCase from 'lodash/kebabCase';
import { format } from 'fast-csv';
import { flatten } from 'flat';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { EntityTypeEnum, EntityTypeValue } from '@/api/entitycore/types';
import { WorkspaceContext } from '@/types/common';
import {
  getElectricalCellRecording,
  getEModel,
  getExperimentalBoutonDensity,
  getExperimentalNeuronDensity,
  getExperimentalSynapsesPerConnection,
  getMEModel,
  getReconstructionMorphology,
} from '@/api/entitycore/queries';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getSingleNeuronSynaptome } from '@/api/entitycore/queries/model/single-neuron-synaptome';

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

const streamPipeline = promisify(pipeline);

const ASSETS_BASE_PATH = 'data';
const METADATA_FLATTEN_DELIMITER = '__';

/* --------------------------------------- Util functions --------------------------------------- */

/**
 * Generates headers for a file download stream.
 *
 * @param {Object} params - The parameters for generating download headers.
 * @param {string} params.filename - The name of the file to be downloaded.
 * @returns {Object} An object containing Content-Type and Content-Disposition headers for file download.
 */
function getDownloadStreamHeaders({ filename }: { filename: string }) {
  return {
    'Content-Type': 'application/gzip',
    'Content-Disposition': `attachment; filename="${filename}"`,
  };
}

/**
 * Converts a readable stream to a buffer by collecting all chunks.
 *
 * @param {Readable} readable - The input readable stream to be buffered
 * @returns {Promise<Buffer>} A promise that resolves to a concatenated buffer containing all stream chunks
 *
 * @description
 * - Handles both string and buffer chunks
 * - Converts string chunks to buffers if necessary
 * - Concatenates all chunks into a single buffer
 */
async function bufferStream(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Manages metadata collection and CSV generation for entity downloads.
 *
 * @class Metadata
 * @description Handles flattening and converting metadata entries into a CSV format
 * for use in entity download processes.
 */
class Metadata {
  private entries: Record<string, any>[] = [];

  public add(entry: Record<string, any>) {
    this.entries.push(flatten(entry, { delimiter: METADATA_FLATTEN_DELIMITER }));
  }

  public async getFileEntry(): Promise<FileEntry> {
    const headers = Array.from(new Set(this.entries.flatMap((entry) => Object.keys(entry))));

    const metadataCsvStream = format({ headers, delimiter: ',' });

    this.entries.forEach((entry) => metadataCsvStream.write(entry));
    metadataCsvStream.end();

    const metadataCsvBuffer = await bufferStream(metadataCsvStream);
    const size = Buffer.byteLength(metadataCsvBuffer);

    const stream = Readable.from(metadataCsvBuffer);

    return {
      path: 'metadata.csv',
      stream,
      size,
    };
  }
}

/* ---------------- Methods and configs to handle downloads per each entity type ---------------- */

async function* getReconstructionMorphologyFiles(entityIds: string[], ctx?: WorkspaceContext) {
  let idx = 0;
  const metadata = new Metadata();

  for (const entityId of entityIds) {
    const morphology = await getReconstructionMorphology({
      id: entityId,
      context: ctx,
    });

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

    idx += 1;
  }

  yield await metadata.getFileEntry();
}

async function* getElectricalCellRecordingFiles(entityIds: string[], ctx?: WorkspaceContext) {
  let idx = 0;
  const metadata = new Metadata();

  for (const entityId of entityIds) {
    const trace = await getElectricalCellRecording({
      id: entityId,
      context: ctx,
    });

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

    idx += 1;
  }

  yield await metadata.getFileEntry();
}

async function* getExperimentalNeuronDensityFiles(entityIds: string[], ctx?: WorkspaceContext) {
  let idx = 0;
  const metadata = new Metadata();

  for (const entityId of entityIds) {
    const neuronDensity = await getExperimentalNeuronDensity({ id: entityId, context: ctx });
    metadata.add({ idx, ...neuronDensity });

    idx += 1;
  }

  yield await metadata.getFileEntry();
}

async function* getExperimentalBoutonDensityFiles(entityIds: string[], ctx?: WorkspaceContext) {
  let idx = 0;
  const metadata = new Metadata();

  for (const entityId of entityIds) {
    const boutonDensity = await getExperimentalBoutonDensity({ id: entityId, context: ctx });
    metadata.add({ idx, ...boutonDensity });

    idx += 1;
  }

  yield await metadata.getFileEntry();
}

async function* getExperimentalSynapsesPerConnectionFiles(
  entityIds: string[],
  ctx?: WorkspaceContext
) {
  let idx = 0;
  const metadata = new Metadata();

  for (const entityId of entityIds) {
    const expSynapsesPerConnection = await getExperimentalSynapsesPerConnection({
      id: entityId,
      context: ctx,
    });

    metadata.add({ idx, ...expSynapsesPerConnection });

    idx += 1;
  }

  yield await metadata.getFileEntry();
}

async function* getEmodelFiles(entityIds: string[], ctx?: WorkspaceContext) {
  let idx = 0;
  const metadata = new Metadata();

  // TODO: add emodel assets when supported by the API
  for (const entityId of entityIds) {
    const emodel = await getEModel({
      id: entityId,
      context: ctx,
    });

    metadata.add({ idx, ...emodel });

    idx += 1;
  }

  yield await metadata.getFileEntry();
}

async function* getMEmodelFiles(entityIds: string[], ctx?: WorkspaceContext) {
  let idx = 0;
  const metadata = new Metadata();

  // TODO: add emodel assets when supported by the API
  for (const entityId of entityIds) {
    const emodel = await getMEModel({
      id: entityId,
      context: ctx,
    });

    metadata.add({ idx, ...emodel });

    idx += 1;
  }

  yield await metadata.getFileEntry();
}

async function* getSingleNeuronSynaptomeFiles(entityIds: string[], ctx?: WorkspaceContext) {
  let idx = 0;
  const metadata = new Metadata();

  // TODO: add emodel assets when supported by the API
  for (const entityId of entityIds) {
    const emodel = await getSingleNeuronSynaptome({
      id: entityId,
      context: ctx,
    });

    metadata.add({ idx, ...emodel });

    idx += 1;
  }

  yield await metadata.getFileEntry();
}

const getEntityFilesHandlerMap: Partial<Record<EntityTypeValue, GetEntityFilesHandler>> = {
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

/* ------------------------------ Generic logic to handle downloads ----------------------------- */

type CreateDownloadStreamParams = DownloadRequest & { entityType: EntityTypeValue };

/**
 * Creates a download stream for a specific entity type with associated files.
 *
 * @param {CreateDownloadStreamParams} params - Parameters for creating the download stream
 * @param {EntityTypeValue} params.entityType - The type of entity being downloaded
 * @param {string} params.virtualLabId - The ID of the virtual lab
 * @param {string} params.projectId - The ID of the project
 * @param {string[]} params.entityIds - The IDs of the entities to download
 * @returns {ReadableStream} A web-compatible readable stream of compressed tar files
 * @throws {Error} If no handler is found for the specified entity type
 */
async function createDownloadStream({
  entityType,
  virtualLabId,
  projectId,
  entityIds,
}: CreateDownloadStreamParams) {
  const tarPack = tar.pack();
  const gzip = createGzip({ level: 3 });

  tarPack.pipe(gzip);

  const downloadStream = Readable.toWeb(gzip);

  const controller = new AbortController();
  // TODO: pass abort singal to getFilesGenerator
  const { signal } = controller;

  const getFilesGenerator = getEntityFilesHandlerMap[entityType];
  if (!getFilesGenerator) {
    throw new Error(`No handler found for entity type ${entityType}`);
  }

  const ctx = virtualLabId && projectId ? { virtualLabId, projectId } : undefined;
  const fileEntries = getFilesGenerator(entityIds, ctx);

  (async () => {
    try {
      for await (const { path: name, stream, size } of fileEntries) {
        const entry = tarPack.entry({ name, size });
        await streamPipeline(stream, entry);
      }
    } catch (err) {
      controller.abort();
      throw err;
    } finally {
      tarPack.finalize();
    }
  })();

  return downloadStream;
}

/* ------------------------------------------- Routes ------------------------------------------- */

const downloadRequestSchema = z.object({
  virtualLabId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  entityIds: z.string().uuid().array().max(100),
});

type DownloadRequest = z.infer<typeof downloadRequestSchema>;

/**
 * Handles POST requests for downloading entities as a compressed tar.gz file
 *
 * @param request - The incoming Next.js request
 * @param params - Route parameters containing the entity type
 * @returns A NextResponse with a downloadable tar.gz stream of entities
 *
 * Expected JSON body:
 * {
 *   virtualLabId?: string | null,  // Optional UUID of virtual lab context
 *   projectId?: string | null,     // Optional UUID of project context
 *   entityIds: string[]            // Array of entity UUIDs to download (max 100)
 * }
 */
export async function POST(request: NextRequest, { params }: { params: { entityType: string } }) {
  const { entityType: entityTypeRaw } = await params;
  const entityType = snakeCase(entityTypeRaw) as EntityTypeValue;

  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  const reqDataRaw = await request.json();
  const reqData = downloadRequestSchema.parse(reqDataRaw);

  const downloadStream = await createDownloadStream({ entityType, ...reqData });

  return new NextResponse(downloadStream, {
    headers: getDownloadStreamHeaders({ filename: `${kebabCase(entityType)}.tar.gz` }),
  });
}

/**
 * Handles GET requests for downloading entities as a compressed tar.gz file
 *
 * @param request - The incoming Next.js request
 * @param params - Route parameters containing the entity type
 * @returns A NextResponse with a downloadable tar.gz stream of entities
 *
 * Expected query parameters:
 * - virtualLabId (optional): UUID of virtual lab
 * - projectId (optional): UUID of project
 * - entityIds: One or more entity UUIDs to download (max 100)
 */
export async function GET(request: NextRequest, { params }: { params: { entityType: string } }) {
  const { entityType: entityTypeRaw } = await params;
  const entityType = snakeCase(entityTypeRaw) as EntityTypeValue;

  const session = await auth();
  if (!session) {
    return new Response('Unauthorized', {
      status: 401,
      statusText: 'The supplied authentication is not authorized for this action',
    });
  }

  const { searchParams } = request.nextUrl;
  const reqData = downloadRequestSchema.parse({
    virtualLabId: searchParams.get('virtualLabId'),
    projectId: searchParams.get('projectId'),
    entityIds: searchParams.getAll('entityIds'),
  });

  const downloadStream = await createDownloadStream({ entityType, ...reqData });

  return new NextResponse(downloadStream, {
    headers: getDownloadStreamHeaders({ filename: `${kebabCase(entityType)}.tar.gz` }),
  });
}
