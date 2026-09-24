import fs from 'node:fs/promises';
import fsPath from 'node:path';
import { Readable } from 'node:stream';

import { format } from 'date-fns';
import { delay } from 'es-toolkit';
import get from 'es-toolkit/compat/get';
import kebabCase from 'es-toolkit/compat/kebabCase';
import template from 'es-toolkit/compat/template';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import ApiError from '@/api/error';
import { getSession } from '@/auth-fetch';
import { logError } from '@/utils/logger';

import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { IEntity } from '@/api/entitycore/types/entities/entity';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type {
  CsvEntryBase,
  CsvSimulationEntryBase,
  FileEntry,
} from '@/features/entity-download/types';
import type { WorkspaceContext } from '@/types/common';

const README_TEMPLATE_DIR = './src/features/entity-download/readme-templates';

/** Extension of every entity archive: a tar stream piped through gzip. */
const ARCHIVE_EXTENSION = 'tar.gz';

/** Longest name segment kept in an archive file name. */
const MAX_ARCHIVE_NAME_LENGTH = 100;

/**
 * Makes an entity name safe to use inside a file name and a `Content-Disposition` header.
 *
 * @param name - Entity name as registered.
 * @returns The name with unsupported characters replaced by `-`, or `''` when nothing is left.
 *
 * @remarks
 * Deliberately not `kebabCase`: that splits on case and digit boundaries, turning
 * `EFeature … op3` into `e-feature … op-3`. Only characters that would break a header (quotes,
 * newlines, `;`) or read as a path (`/`, `\`) are replaced, so the name stays recognisable.
 */
function sanitizeArchiveName(name: string): string {
  return name
    .replace(/[^\w.-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, MAX_ARCHIVE_NAME_LENGTH);
}

/**
 * Names the archive of an entity batch.
 *
 * @param params - Naming inputs.
 * @param params.entityType - Entitycore type of the downloaded entities.
 * @param params.name - Name of the single selected entity, when there is exactly one.
 * @returns `<type>__<name>.tar.gz`, or `<type>.tar.gz` when no usable name was given.
 *
 * @example
 * getEntityArchiveFilename({ entityType: 'task_result', name: 'EFeature Result — op3' });
 * // 'task-result__EFeature-Result-op3.tar.gz'
 */
export function getEntityArchiveFilename({
  entityType,
  name,
}: {
  entityType: TEntityTypeDict;
  name?: string | null;
}): string {
  const type = kebabCase(entityType);
  const safeName = name ? sanitizeArchiveName(name) : '';

  return safeName ? `${type}__${safeName}.${ARCHIVE_EXTENSION}` : `${type}.${ARCHIVE_EXTENSION}`;
}

/**
 * Generates headers for a file download stream.
 *
 * @param {Object} params - The parameters for generating download headers.
 * @param {string} params.filename - The name of the file to be downloaded.
 * @returns {Object} An object containing Content-Type and Content-Disposition headers for file download.
 */
export function getDownloadStreamHeaders({ filename }: { filename: string }) {
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
export async function bufferStream(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

/** Open attempts for an asset before it is reported as failed; the tar receives nothing until one succeeds. */
const OPEN_ATTEMPTS = 3;

/** First backoff step between open attempts; doubled per attempt, with jitter. */
const OPEN_RETRY_BASE_DELAY_MS = 500;

/** Resumes allowed for one body after its socket dies mid-transfer. */
const MAX_RANGE_RESUMES = 5;

/**
 * Whether another attempt could plausibly succeed: a network drop, or a status the server itself
 * calls temporary. A 4xx is the asset's own answer, so retrying it only adds dead air to the tar.
 */
function isTransient(error: unknown): boolean {
  if (error instanceof TypeError) return true; // fetch rejects with TypeError on network failure
  const status = error instanceof ApiError ? error.cause?.status : undefined;
  return status !== undefined && (status >= 500 || status === 429);
}

/**
 * Reads a presigned-URL body to the end, re-fetching from the last byte written when the socket dies.
 *
 * The tar entry's header already declared this file's length, so a dead body cannot be retried as a
 * whole — the only repair is to keep filling the same entry from where it stopped.
 *
 * @param response - Asset download response, already redirected to its presigned URL.
 * @param size - Byte length the tar entry was declared with.
 * @param signal - Aborts the read and any resume.
 */
export async function* readWithRangeResume(
  response: Response,
  size: number,
  signal?: AbortSignal
): AsyncGenerator<Buffer> {
  let body = response.body as NodeReadableStream;
  let written = 0;

  for (let resumes = 0; ; resumes += 1) {
    try {
      for await (const chunk of Readable.fromWeb(body)) {
        written += chunk.byteLength;
        yield chunk;
      }
      return;
    } catch (err) {
      // every declared byte already reached the tar, so the entry is whole whatever just failed
      if (written >= size) return;
      if (signal?.aborted || resumes >= MAX_RANGE_RESUMES) throw err;

      const resumed = await fetch(response.url, {
        headers: { Range: `bytes=${written}-` },
        signal,
      });
      if (resumed.status !== 206 || !resumed.body) {
        logError(
          `entity-download: cannot resume ${response.url} at byte ${written}`,
          `(status ${resumed.status})`
        );
        throw err;
      }
      body = resumed.body as NodeReadableStream;
    }
  }
}

/**
 * Opens an asset download, retrying a transient failure; nothing is written until an attempt succeeds.
 *
 * @remarks Mirrors `uploadPartWithRetry` in `api/entitycore/queries/assets/multipart`, the other half
 * of the same transfer path.
 */
export async function openAsset({
  ctx,
  entityType,
  entityId,
  assetId,
  assetPath,
  signal,
}: {
  entityType: TEntityTypeDict;
  entityId: string;
  assetId: string;
  assetPath?: string;
  ctx?: WorkspaceContext;
  signal?: AbortSignal;
}): Promise<Response> {
  for (let attempt = 1; ; attempt += 1) {
    signal?.throwIfAborted();
    try {
      const response = await downloadAsset({
        ctx,
        entityType,
        entityId,
        id: assetId,
        assetPath,
        asRawResponse: true,
        retryOnError: false,
        signal,
      });
      if (!response.body) throw new Error('Response body is null');
      return response;
    } catch (error) {
      if (attempt >= OPEN_ATTEMPTS || !isTransient(error)) throw error;
      await delay(
        OPEN_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * OPEN_RETRY_BASE_DELAY_MS,
        { signal }
      );
    }
  }
}

/**
 * Creates a file entry for downloading an entity asset.
 *
 * @param params - The parameters for creating an asset file entry.
 * @param params.entity - The entity containing the asset to download.
 * @param params.asset - The asset to download.
 * @param params.path - The file path for the downloaded asset.
 * @param params.ctx - Optional workspace context for the download request.
 * @param params.signal - Aborts the open and the body read.
 * @returns A file entry whose stream retries the open and resumes a dead body.
 */
export async function createAssetFileEntry({
  ctx,
  entity,
  asset,
  path,
  signal,
}: {
  entity: IEntity;
  asset: IAsset;
  path: string;
  ctx?: WorkspaceContext;
  signal?: AbortSignal;
}): Promise<FileEntry> {
  const response = await openAsset({
    ctx,
    entityType: entity.type,
    entityId: entity.id,
    assetId: asset.id,
    signal,
  });
  const size = Number(response.headers.get('content-length')) || asset.size;

  return {
    path,
    stream: Readable.from(readWithRangeResume(response, size, signal)),
    size,
  };
}

/**
 * Yields one asset entry, recording its path in `failed` instead of ending the archive when it
 * cannot be opened. Every handler collecting failures uses this, so `download-errors.txt` stays
 * one format written in one place.
 */
export async function* tryAssetEntry(
  params: Parameters<typeof createAssetFileEntry>[0],
  failed: string[]
): AsyncGenerator<FileEntry> {
  try {
    yield await createAssetFileEntry(params);
  } catch {
    if (params.signal?.aborted) return;
    failed.push(params.path);
  }
}

type TemplateRenderParams = {
  date: string;
  year: string;
  username: string;
};

/**
 * Gets template render parameters for README file generation.
 *
 * @returns {Promise<TemplateRenderParams>} A promise that resolves to template parameters containing date, year, and username.
 *
 * @description
 * - Retrieves the current user session to extract username
 * - Formats the current date in ISO format (yyyy-MM-dd)
 * - Extracts the current year
 * - Returns structured parameters for template rendering
 */
export async function getReadmeTemplateRenderParams(): Promise<TemplateRenderParams> {
  const session = await getSession();

  const username = session?.user.username!;

  const now = new Date();

  // Current date in ISO format
  const date = format(now, 'yyyy-MM-dd');

  const year = format(now, 'yyyy');

  return {
    date,
    year,
    username,
  };
}

/**
 * Creates a file entry for a README template based on entity type.
 *
 * @param {TEntityTypeDict} entityType - The entity type to determine which template to use.
 * @returns {Promise<FileEntry>} A promise that resolves to a file entry with README content stream, path, and size information.
 *
 * @description
 * - Retrieves template render parameters (date, year, username)
 * - Reads the appropriate template file based on entity type using kebab-case naming
 * - Renders the template by replacing placeholders with actual values
 * - Converts the rendered content to a readable stream
 * - Returns a structured file entry ready for download processing
 */
export async function createTemplateFileEntry(entityType: TEntityTypeDict): Promise<FileEntry> {
  const renderParams = await getReadmeTemplateRenderParams();

  // Read template file based on entity type
  const templatePath = fsPath.join(
    process.cwd(),
    README_TEMPLATE_DIR,
    `${kebabCase(entityType)}.md`
  );
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  // Render template by replacing placeholders
  const compiled = template(templateContent);
  const renderedContent = compiled(renderParams);

  // Convert to buffer and then to readable stream
  const buffer = Buffer.from(renderedContent, 'utf-8');
  const stream = Readable.from(buffer);

  return {
    path: 'README.md',
    stream,
    size: buffer.length,
  };
}

export function getMetadataCsvEntryBase(entity: IEntity): CsvEntryBase {
  return {
    name: get(entity, 'name', ''),
    description: get(entity, 'description', ''),
    subject_name: get(entity, 'subject.name', ''),
    // TODO: remove fallback below when the species migration into the subject table is done.
    species_name: get(entity, 'subject.species.name') ?? get(entity, 'species.name', ''),
    brain_region: get(entity, 'brain_region.name', ''),
    contributors: get(entity, 'contributions', [])
      .map((c) => get(c, 'agent.pref_label'))
      .filter(Boolean)
      .sort()
      .join(';'),
  };
}
export function getMetadataSimulationCsvEntryBase(entity: IEntity): CsvSimulationEntryBase {
  return {
    name: get(entity, 'name', ''),
    description: get(entity, 'description', ''),
  };
}
