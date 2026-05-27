import { pipeline, Readable } from 'node:stream';
import { promisify } from 'node:util';
import { createGzip } from 'node:zlib';

import tar from 'tar-stream';

import { getEntityFilesHandlerMap } from '@/features/entity-download/file-handlers';
import { getAssetFolderFiles } from '@/features/entity-download/file-handlers/asset-folder';

import type {
  AssetFolderDownloadTicket,
  EntityBatchDownloadTicket,
} from '@/features/entity-download/ticket-store';
import type { FileEntry } from '@/features/entity-download/types';

type CreateDownloadStreamParams =
  | Omit<EntityBatchDownloadTicket, 'createdAt'>
  | Omit<AssetFolderDownloadTicket, 'createdAt'>;

/**
 * Creates a tar.gz download stream for either an entity-batch or an asset-folder ticket.
 *
 * @throws {Error} If an entity-batch ticket has no handler for its entity type.
 */
export async function createDownloadStream(params: CreateDownloadStreamParams) {
  const tarPack = tar.pack();
  const gzip = createGzip({ level: 3 });

  tarPack.pipe(gzip);

  const downloadStream = Readable.toWeb(gzip) as ReadableStream<Uint8Array>;

  const controller = new AbortController();
  // TODO: pass abort signal to getFilesGenerator
  // const { signal } = controller;

  const fileEntries = getFileEntriesGenerator(params);

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

function getFileEntriesGenerator(params: CreateDownloadStreamParams): AsyncGenerator<FileEntry> {
  if (params.kind === 'asset-folder') {
    const ctx =
      params.virtualLabId && params.projectId
        ? { virtualLabId: params.virtualLabId, projectId: params.projectId }
        : undefined;
    return getAssetFolderFiles({
      entityType: params.entityType,
      entityId: params.entityId,
      assetId: params.assetId,
      prefix: params.prefix,
      ctx,
    });
  }

  const getFilesGenerator = getEntityFilesHandlerMap[params.entityType];
  if (!getFilesGenerator) {
    throw new Error(`No handler found for entity type ${params.entityType}`);
  }

  const ctx =
    params.virtualLabId && params.projectId
      ? { virtualLabId: params.virtualLabId, projectId: params.projectId }
      : undefined;
  return getFilesGenerator(params.entityIds, ctx);
}

const streamPipeline = promisify(pipeline);
