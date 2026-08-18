import { AssetContentType } from '@/api/entitycore/types/shared/global';
import { ActivityCustomFileRenderer } from '@/features/scan-config/types';

import type { DirectoryListContent, IAsset } from '@/api/entitycore/types/shared/global';
import type { TActivityCustomFile } from '@/features/scan-config/types';

/** A sub-folder of the level currently being listed. */
export type TDirectoryFolderEntry = {
  name: string;
  /** path prefix to descend into, relative to the asset root */
  prefix: string;
  fileCount: number;
  totalSize: number;
};

/** A file sitting directly at the level currently being listed. */
export type TDirectoryFileEntry = {
  name: string;
  /** path relative to the asset root, i.e. what `asset_path` expects */
  path: string;
  size: number;
  /** undefined when the extension is unknown, which is what makes it a placeholder tile */
  contentType: AssetContentType | undefined;
};

export type TDirectoryLevel = {
  folders: TDirectoryFolderEntry[];
  files: TDirectoryFileEntry[];
};

/**
 * Content type per file extension.
 *
 * A directory listing carries names and sizes only — entitycore types the *asset*, not the files
 * inside it — so the extension is the only signal available for choosing a viewer.
 */
const CONTENT_TYPE_BY_EXTENSION: Record<string, AssetContentType> = {
  abf: AssetContentType.abf,
  asc: AssetContentType.asc,
  gz: AssetContentType.gzip,
  h5: AssetContentType.h5,
  hoc: AssetContentType.hoc,
  ipynb: AssetContentType.ipynb,
  jpeg: AssetContentType.jpeg,
  jpg: AssetContentType.jpeg,
  json: AssetContentType.json,
  mod: AssetContentType.mod,
  nrrd: AssetContentType.nrrd,
  nwb: AssetContentType.nwb,
  obj: AssetContentType.obj,
  pdf: AssetContentType.pdf,
  png: AssetContentType.png,
  swc: AssetContentType.swc,
  txt: AssetContentType.text,
  log: AssetContentType.text,
  webp: AssetContentType.webp,
  zip: AssetContentType.zip,
};

export function fileExtension(path: string): string {
  const name = path.split('/').at(-1) ?? path;
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

export function inferContentType(path: string): AssetContentType | undefined {
  return CONTENT_TYPE_BY_EXTENSION[fileExtension(path)];
}

/** `''` for the asset root, `figures/panels/` for a nested level. */
export function normalizePrefix(prefix: string): string {
  const trimmed = prefix.replace(/^\.?\/+/, '').replace(/\/+$/, '');
  return trimmed.length > 0 ? `${trimmed}/` : '';
}

/** The parent of a prefix: `a/b/` → `a/`, `a/` → `''`. */
export function parentPrefix(prefix: string): string {
  const normalized = normalizePrefix(prefix);
  if (!normalized) return '';
  const segments = normalized.slice(0, -1).split('/');
  return normalizePrefix(segments.slice(0, -1).join('/'));
}

/**
 * One level of a flat directory listing.
 *
 * `listDirectoryOfAssets` returns every file under the asset as a flat map keyed by its full
 * relative path, so folders only exist implicitly: a key containing a `/` below the current prefix
 * names a sub-folder. Collapsing those into folder rows is what makes the listing navigable rather
 * than a wall of deep paths.
 */
export function buildDirectoryLevel(
  files: DirectoryListContent['files'],
  prefix = ''
): TDirectoryLevel {
  const normalized = normalizePrefix(prefix);
  const folders = new Map<string, TDirectoryFolderEntry>();
  const entries: TDirectoryFileEntry[] = [];

  for (const [path, item] of Object.entries(files ?? {})) {
    if (normalized && !path.startsWith(normalized)) continue;

    const relative = path.slice(normalized.length);
    if (!relative) continue;

    const separator = relative.indexOf('/');
    if (separator === -1) {
      entries.push({
        name: relative,
        path,
        size: item?.size ?? 0,
        contentType: inferContentType(relative),
      });
      continue;
    }

    const name = relative.slice(0, separator);
    const folder = folders.get(name) ?? {
      name,
      prefix: `${normalized}${name}/`,
      fileCount: 0,
      totalSize: 0,
    };
    folder.fileCount += 1;
    folder.totalSize += item?.size ?? 0;
    folders.set(name, folder);
  }

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

  return {
    folders: [...folders.values()].sort(byName),
    files: entries.sort(byName),
  };
}

/**
 * What a child of unknown format is typed as.
 *
 * Anything but the parent's `directory` type: inheriting that would make the child look like a
 * folder to {@link isDirectoryAsset}, and the viewer would list the same directory again instead
 * of saying the format is unsupported. No viewer claims `text`, so it lands on the placeholder.
 */
const UNKNOWN_CHILD_CONTENT_TYPE = AssetContentType.text;

/**
 * A file inside a directory asset, as the viewers expect it.
 *
 * The asset id stays the directory's — that is what the download and presigned-url endpoints key
 * on, with `asset_path` selecting the file — while `path` and `content_type` are rewritten to the
 * child's so the viewer switch picks an image or a JSON viewer instead of falling through to the
 * unsupported-format placeholder.
 */
export function makeDirectoryChildFile({
  asset,
  entity,
  entry,
}: {
  asset: IAsset;
  entity: TActivityCustomFile['entity'];
  entry: TDirectoryFileEntry;
}): TActivityCustomFile {
  return {
    id: `${asset.id}:${entry.path}`,
    entity,
    asset: {
      ...asset,
      path: entry.path,
      is_directory: false,
      size: entry.size,
      content_type: entry.contentType ?? UNKNOWN_CHILD_CONTENT_TYPE,
    },
    assetPath: entry.path,
    name: entry.name,
    enforcedRenderType: entry.contentType,
    renderer: ActivityCustomFileRenderer.Default,
  };
}

/** Assets written as a folder are flagged either way depending on how they were registered. */
export function isDirectoryAsset(asset: Pick<IAsset, 'is_directory' | 'content_type'>): boolean {
  return !!asset.is_directory || asset.content_type === AssetContentType.directory;
}
