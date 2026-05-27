import { Readable } from 'node:stream';

import { downloadAsset, listDirectoryOfAssets } from '@/api/entitycore/queries/assets';

import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
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
}: {
  entityType: TEntityTypeDict;
  entityId: string;
  assetId: string;
  prefix: string;
  ctx?: WorkspaceContext;
}): AsyncGenerator<FileEntry> {
  const listing = await listDirectoryOfAssets({ entityType, entityId, id: assetId, ctx });
  const normalized = normalizePrefix(prefix);

  const matchingPaths = Object.keys(listing.files).filter((p) =>
    normalized === '' ? true : p.startsWith(normalized)
  );

  for (const filePath of matchingPaths) {
    const response = await downloadAsset({
      ctx,
      entityType,
      entityId,
      id: assetId,
      assetPath: filePath,
      asRawResponse: true,
      retryOnError: false,
    });

    if (!response.body) continue;

    const relativePath = normalized === '' ? filePath : filePath.slice(normalized.length);
    const sizeHeader = Number(response.headers.get('content-length'));
    const size =
      Number.isFinite(sizeHeader) && sizeHeader > 0
        ? sizeHeader
        : (listing.files[filePath]?.size ?? 0);

    yield {
      path: relativePath,
      stream: Readable.fromWeb(response.body as NodeReadableStream),
      size,
    };
  }
}
