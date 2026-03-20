import tar from 'tar-stream';

import { getEntityFilesHandlerMap } from '@/features/entity-download/file-handlers';

import type { TEntityTypeDict } from '@/api/entitycore/types';

import { pipeline, Readable } from 'node:stream';
import { promisify } from 'node:util';
import { createGzip } from 'node:zlib';

type CreateDownloadStreamParams = {
  entityIds: string[];
  entityType: TEntityTypeDict;
  projectId?: string | null;
  virtualLabId?: string | null;
};

/**
 * Creates a download stream for a specific entity type with associated files.
 *
 * @param {CreateDownloadStreamParams} params - Parameters for creating the download stream
 * @param {TEntityTypeDict} params.entityType - The type of entity being downloaded
 * @param {string} params.virtualLabId - The ID of the virtual lab
 * @param {string} params.projectId - The ID of the project
 * @param {string[]} params.entityIds - The IDs of the entities to download
 * @returns {ReadableStream} A web-compatible readable stream of compressed tar files
 * @throws {Error} If no handler is found for the specified entity type
 */

export async function createDownloadStream({
  entityIds,
  entityType,
  projectId,
  virtualLabId,
}: CreateDownloadStreamParams) {
  const tarPack = tar.pack();
  const gzip = createGzip({ level: 3 });

  tarPack.pipe(gzip);

  // FIX: @pavlo, please remove type casting
  const downloadStream = Readable.toWeb(gzip) as unknown as ReadableStream<Uint8Array>;

  const controller = new AbortController();
  // TODO: pass abort signal to getFilesGenerator
  // const { signal } = controller;

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
const streamPipeline = promisify(pipeline);
