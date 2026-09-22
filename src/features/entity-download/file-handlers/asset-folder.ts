import { Readable } from 'node:stream';

import { listDirectoryOfAssets } from '@/api/entitycore/queries/assets';
import { openAsset, readWithRangeResume } from '@/features/entity-download/utils';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { FileEntry } from '@/features/entity-download/types';
import type { WorkspaceContext } from '@/types/common';

/**
 * Normalize a folder prefix so it can be used as a directory boundary with
 * `String.prototype.startsWith` against an asset listing.
 *
 * Strips a leading `./` (SONATA manifest-relative form) and any leading `/`,
 * trims trailing `/`, then appends exactly one `/`. An empty or root-only
 * prefix returns `''`, which the caller treats as "match every file".
 *
 * @example
 * normalizePrefix('')           // ''
 * normalizePrefix('/')          // ''
 * normalizePrefix('./')         // ''
 * normalizePrefix('./mod')      // 'mod/'
 * normalizePrefix('/mod/')      // 'mod/'
 * normalizePrefix('mechanisms') // 'mechanisms/'
 */
function normalizePrefix(prefix: string): string {
  let p = prefix.replace(/^\.\//, '');
  p = p.replace(/^\/+/, '');
  p = p.replace(/\/+$/, '');
  return p.length > 0 ? `${p}/` : '';
}

/**
 * Streams every file inside an asset directory whose path starts with `prefix`.
 * Yields one FileEntry per file, with the path made relative to `prefix`.
 */
export async function* getAssetFolderFiles({
  entityType,
  entityId,
  assetId,
  prefix,
  ctx,
  signal,
  failed = [],
}: {
  entityType: TEntityTypeDict;
  entityId: string;
  assetId: string;
  prefix: string;
  ctx?: WorkspaceContext;
  signal?: AbortSignal;
  /** Paths of files that could not be opened; the archive ends with the list. */
  failed?: string[];
}): AsyncGenerator<FileEntry> {
  const listing = await listDirectoryOfAssets({ entityType, entityId, id: assetId, ctx });
  const normalized = normalizePrefix(prefix);

  const matchingPaths = Object.keys(listing.files).filter((p) =>
    normalized === '' ? true : p.startsWith(normalized)
  );

  for (const filePath of matchingPaths) {
    if (signal?.aborted) return;

    let response: Response;
    try {
      response = await openAsset({
        ctx,
        entityType,
        entityId,
        assetId,
        assetPath: filePath,
        signal,
      });
    } catch {
      if (signal?.aborted) return;
      failed.push(filePath);
      continue;
    }

    const relativePath = normalized === '' ? filePath : filePath.slice(normalized.length);
    const sizeHeader = Number(response.headers.get('content-length'));
    const size =
      Number.isFinite(sizeHeader) && sizeHeader > 0
        ? sizeHeader
        : (listing.files[filePath]?.size ?? 0);

    yield {
      path: relativePath,
      stream: Readable.from(readWithRangeResume(response, size, signal)),
      size,
    };
  }
}
