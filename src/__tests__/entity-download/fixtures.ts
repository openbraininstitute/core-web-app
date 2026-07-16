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
