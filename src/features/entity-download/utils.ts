import { format } from 'date-fns';
import get from 'es-toolkit/compat/get';
import kebabCase from 'es-toolkit/compat/kebabCase';
import template from 'es-toolkit/compat/template';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getSession } from '@/auth-fetch';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { IEntity } from '@/api/entitycore/types/entities/entity';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type {
  CsvEntryBase,
  CsvSimulationEntryBase,
  FileEntry,
} from '@/features/entity-download/types';
import type { WorkspaceContext } from '@/types/common';

import fs from 'node:fs/promises';
import fsPath from 'node:path';
import { Readable } from 'node:stream';

const README_TEMPLATE_DIR = './src/features/entity-download/readme-templates';

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

/**
 * Creates a file entry for downloading an entity asset.
 *
 * @param {Object} params - The parameters for creating an asset file entry.
 * @param {IEntity} params.entity - The entity containing the asset to download.
 * @param {IAsset} params.asset - The asset to download.
 * @param {string} params.path - The file path for the downloaded asset.
 * @param {WorkspaceContext} [params.ctx] - Optional workspace context for the download request.
 * @returns {Promise<FileEntry>} A promise that resolves to a file entry with stream, path, and size information.
 *
 * @description
 * - Downloads the asset using the entity type and ID
 * - Converts the response body to a readable stream
 * - Extracts content length from response headers for file size
 * - Returns a structured file entry ready for download processing
 */
export async function createAssetFileEntry({
  ctx,
  entity,
  asset,
  path,
}: {
  entity: IEntity;
  asset: IAsset;
  path: string;
  ctx?: WorkspaceContext;
}): Promise<FileEntry> {
  const response = await downloadAsset({
    ctx,
    entityType: entity.type,
    entityId: entity.id,
    id: asset.id,
    asRawResponse: true,
    retryOnError: false,
  });

  if (!response.body) {
    throw new Error('Response body is null');
  }
  return {
    path,
    // FIXME: @pavlo, please remove type casting
    stream: Readable.fromWeb(response.body as any),
    size: Number(response.headers.get('content-length')),
  };
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
