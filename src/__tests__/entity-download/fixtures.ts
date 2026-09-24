import { pipeline, Readable } from 'node:stream';
import { promisify } from 'node:util';
import { createGunzip } from 'node:zlib';

import tar from 'tar-stream';

import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type { FileEntry } from '@/features/entity-download/types';

export const TEST_USERNAME = 'test-user';

export function makeAsset(
  overrides: Partial<IAsset> & Pick<IAsset, 'id' | 'path' | 'label'>
): IAsset {
  return {
    content_type: 'application/octet-stream',
    size: 11,
    status: 'has_raw',
    is_directory: false,
    full_path: `/full/${overrides.path}`,
    bucket_name: 'test-bucket',
    meta: {},
    ...overrides,
  } as IAsset;
}

export function makeEntityBase(overrides: {
  id: string;
  type: string;
  name?: string;
  description?: string;
  assets?: IAsset[];
  [key: string]: unknown;
}) {
  const {
    id,
    type,
    name = 'Entity name',
    description = 'Entity description',
    assets = [],
    ...rest
  } = overrides;

  return {
    id,
    type,
    name,
    description,
    assets,
    subject: {
      name: 'subject-1',
      species: { name: 'Mus musculus' },
    },
    brain_region: { name: 'Somatosensory' },
    contributions: [{ agent: { pref_label: 'Alice' } }, { agent: { pref_label: 'Bob' } }],
    ...rest,
  };
}

export async function collectFileEntries(
  generator: AsyncGenerator<FileEntry>
): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];
  for await (const entry of generator) {
    entries.push(entry);
  }
  return entries;
}

export async function readEntryText(entry: FileEntry): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of entry.stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

export function mockSuccessfulDownload(body = 'asset-bytes') {
  return async () => {
    const buffer = Buffer.from(body);
    return new Response(buffer, {
      headers: { 'content-length': String(buffer.length) },
    });
  };
}

export function pathsOf(entries: FileEntry[]) {
  return entries.map((e) => e.path);
}

/** Signature of an entry handler as `createDownloadStream` calls it. */
export type StubHandler = (
  entityIds: string[],
  ctx?: unknown,
  signal?: AbortSignal,
  failed?: string[]
) => AsyncGenerator<FileEntry>;

/** A file entry backed by an in-memory body, sized to match. */
export function textEntry(path: string, body: string): FileEntry {
  const buffer = Buffer.from(body);
  return { path, size: buffer.length, stream: Readable.from(buffer) };
}

/** Reads a download stream to the end, discarding the bytes. */
export async function drainDownloadStream(stream: ReadableStream<Uint8Array>): Promise<void> {
  const reader = stream.getReader();
  let result = await reader.read();
  while (!result.done) result = await reader.read();
}

/** Reads a download stream and returns the entry paths the resulting tar.gz holds. */
export async function readArchivePaths(stream: ReadableStream<Uint8Array>): Promise<string[]> {
  const paths: string[] = [];
  const extract = tar.extract();

  extract.on('entry', (header, entryStream, next) => {
    paths.push(header.name);
    entryStream.on('end', next);
    entryStream.resume();
  });

  await promisify(pipeline)(
    Readable.fromWeb(stream as NodeReadableStream),
    createGunzip(),
    extract
  );

  return paths;
}
