import { pipeline, Readable } from 'node:stream';
import { promisify } from 'node:util';
import { createGzip } from 'node:zlib';

import tar from 'tar-stream';

import { getEntityFilesHandlerMap } from '@/features/entity-download/file-handlers';
import { getAssetFolderFiles } from '@/features/entity-download/file-handlers/asset-folder';
import { logError } from '@/utils/logger';

import type {
  AssetFolderDownloadTicket,
  EntityBatchDownloadTicket,
} from '@/features/entity-download/ticket-store';
import type { FileEntry } from '@/features/entity-download/types';

/** Archive member listing every asset that could not be opened, one path per line. */
const ERRORS_FILE = 'download-errors.txt';

type CreateDownloadStreamParams =
  | Omit<EntityBatchDownloadTicket, 'createdAt'>
  | Omit<AssetFolderDownloadTicket, 'createdAt'>;

/**
 * Creates a tar.gz download stream for either an entity-batch or an asset-folder ticket.
 * Entries are opened one at a time as they are written; a failure or a client disconnect ends the
 * archive without an unhandled rejection.
 *
 * @param params - Ticket to serve.
 * @param signal - Request signal; aborting it stops opening entries and releases the in-flight one.
 *
 * @throws {Error} If an entity-batch ticket has no handler for its entity type.
 */
export async function createDownloadStream(
  params: CreateDownloadStreamParams,
  signal?: AbortSignal
) {
  const tarPack = tar.pack();
  const gzip = createGzip({ level: 3 });

  tarPack.pipe(gzip);
  tarPack.on('error', (err) => logError('entity-download: archive aborted', err));

  const controller = new AbortController();
  signal?.addEventListener('abort', () => controller.abort());
  // Next destroys the response stream when the client goes away, which closes gzip
  gzip.once('close', () => controller.abort());

  // handlers append the path of any asset they could not open; the archive ends with the list
  const failed: string[] = [];
  const fileEntries = getFileEntriesGenerator(params, controller.signal, failed);

  (async () => {
    try {
      for await (const { path: name, stream, size } of fileEntries) {
        if (controller.signal.aborted) {
          stream.destroy();
          tarPack.destroy();
          return;
        }
        await streamPipeline(stream, tarPack.entry({ name, size }));
      }

      if (failed.length > 0) {
        const notice = Buffer.from(`${failed.join('\n')}\n`);
        await streamPipeline(
          Readable.from(notice),
          tarPack.entry({ name: ERRORS_FILE, size: notice.length })
        );
      }

      tarPack.finalize();
    } catch (err) {
      controller.abort();
      tarPack.destroy(err as Error);
    }
  })();

  return Readable.toWeb(gzip) as ReadableStream<Uint8Array>;
}

function getFileEntriesGenerator(
  params: CreateDownloadStreamParams,
  signal: AbortSignal,
  failed: string[]
): AsyncGenerator<FileEntry> {
  const ctx =
    params.virtualLabId && params.projectId
      ? { virtualLabId: params.virtualLabId, projectId: params.projectId }
      : undefined;

  if (params.kind === 'asset-folder') {
    return getAssetFolderFiles({
      entityType: params.entityType,
      entityId: params.entityId,
      assetId: params.assetId,
      prefix: params.prefix,
      ctx,
      signal,
      failed,
    });
  }

  const getFilesGenerator = getEntityFilesHandlerMap[params.entityType];
  if (!getFilesGenerator) {
    throw new Error(`No handler found for entity type ${params.entityType}`);
  }

  return getFilesGenerator(params.entityIds, ctx, signal, failed);
}

const streamPipeline = promisify(pipeline);
