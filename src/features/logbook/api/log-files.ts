// The files of a research log, from EntityCore. Saved
// files are objects inside one folder asset (label `research_log_files`), not asset rows: one read
// of the log finds the folder, one listing names every file in it. Both are cached per log, so a
// page with ten figures makes two calls, not ten. Uploads add to that folder and never replace a
// file (EntityCore answers 409 for a name that exists): a page that points at a saved plot always
// shows the same plot (provenance).
import { queryOptions } from '@tanstack/react-query';
import { isNil, isNotNil, omit } from 'es-toolkit';

import { downloadAsset, listDirectoryOfAssets } from '@/api/entitycore/queries/assets';
import { getResearchLog } from '@/api/entitycore/queries/general/research-log';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { createResearchUpload } from '@/api/logbook/queries/research';
import { settings } from '@/features/logbook/settings';
import { IMAGE, savedNameOf } from '@/features/logbook/shared/files';

import type { IResearchLogAsset } from '@/api/entitycore/types/entities/research-log';
import type { DirectoryListContent } from '@/api/entitycore/types/shared/global';
import type { TValueOf } from '@/api/logbook/types';
import type { IProject } from '@/features/logbook/auth/session';

export interface ILogFile {
  readonly path: string; // the saved name, as EntityCore lists it
  readonly localPath: string; // the saved name without its hash part
  readonly name: string; // the last segment of localPath
  readonly size: number;
  readonly lastModified: string;
}

// The markdown copy of one page, written by the logbook server's EntityCore sync (an asset row,
// not a file of the folder). Read-only here: the page itself is where it is edited.
export interface ILogDocument {
  readonly assetId: string;
  readonly path: string;
  readonly title: string; // the page's title when the sync last wrote it, else the file name
  readonly pageId: string | null; // the page it copies, from the sync's meta
  readonly size: number;
}

export interface ILogFiles {
  readonly folderId: string | null;
  readonly files: readonly ILogFile[];
  readonly documents: readonly ILogDocument[];
}

const FILES_LABEL = 'research_log_files';
const DOCUMENT_LABEL = 'research_log_document';
// The keys of a document's `meta` that hold its page's title and id (set by the sync).
const PAGE_TITLE = 'logbook_page_title';
const PAGE_ID = 'logbook_page_id';

export const MARKDOWN = /\.(md|markdown)$/i;

// What EntityCore stores with a content type of its own (entitycore app/db/types.py,
// CONTENT_TYPE_TO_SUFFIX), for the file chooser. The folder itself takes any file.
// What an artifact opens as in its tab.
export const ArtifactKind = {
  Image: 'image',
  Markdown: 'markdown',
  Table: 'table',
  Code: 'code',
  Pdf: 'pdf',
  Other: 'other',
} as const;
export type TArtifactKind = TValueOf<typeof ArtifactKind>;

// Read as text (code or plain): scripts, notebooks, configs and the text formats of neuroscience
// (NEURON .mod and .hoc, SWC and ASC morphologies).
const TEXT =
  /\.(py|sh|bash|json|ipynb|ya?ml|toml|js|mjs|ts|r|jl|m|txt|log|mod|hoc|swc|asc|cfg|ini|xml)$/i;

export const kindOf = (name: string): TArtifactKind =>
  IMAGE.test(name)
    ? ArtifactKind.Image
    : MARKDOWN.test(name)
      ? ArtifactKind.Markdown
      : /\.csv$/i.test(name)
        ? ArtifactKind.Table
        : /\.pdf$/i.test(name)
          ? ArtifactKind.Pdf
          : TEXT.test(name)
            ? ArtifactKind.Code
            : ArtifactKind.Other;

// One thing the log keeps in EntityCore: a file of its folder, or its published document. Listed
// from the folder's listing (names, sizes, times), never downloaded until its tab opens.
export interface IArtifact {
  readonly id: string; // the saved path, or `document:<asset id>`
  readonly name: string;
  readonly where: string; // the folder ('plots'), or 'synced' for a page's copy
  readonly size: number;
  readonly savedAt: string | null; // when EntityCore stored it (files are add-only: created)
  readonly kind: TArtifactKind;
  readonly path: string | null; // a file of the folder
  readonly assetId: string | null; // a page's synced copy
  readonly pageId: string | null; // the page a synced copy copies
}

const folderOf = (localPath: string): string => localPath.split('/').slice(0, -1).join('/');

// The pages' synced copies first, then the files, newest first.
export function artifactsOf(data: ILogFiles): IArtifact[] {
  const documents = data.documents.map((document) => ({
    id: `document:${document.assetId}`,
    name: document.title,
    where: 'synced',
    size: document.size,
    savedAt: null,
    kind: ArtifactKind.Markdown,
    path: null,
    assetId: document.assetId,
    pageId: document.pageId,
  }));
  const files = data.files
    .toSorted((a, b) => b.lastModified.localeCompare(a.lastModified))
    .map((file) => ({
      id: file.path,
      name: file.name,
      where: folderOf(file.localPath),
      size: file.size,
      savedAt: file.lastModified,
      kind: kindOf(file.name),
      path: file.path,
      assetId: null,
      pageId: null,
    }));
  return [...documents, ...files];
}

// The search of the Artifacts tab, on the listing already in memory: no request per keystroke.
// By name only: the list shows no folder, so a match must be on what people can see.
export function searchArtifacts(artifacts: readonly IArtifact[], query: string): IArtifact[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [...artifacts];
  return artifacts.filter((a) => a.name.toLowerCase().includes(needle));
}

// One chooser for pictures and files: a picture becomes a figure, any other file a file card.
export const UPLOAD_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.gif,.svg,.json,.swc,.nrrd,.obj,.hoc,.asc,.abf,.nwb,.h5,.txt,.mod,.pdf,.glb,.gz,.gzip,.tgz,.ipynb,.zip,.md,.markdown,.csv,.py,.sh';

// `<stem>.<first 12 hex of the SHA-256>.<extension>`. A name
// saved before that rule has no hash part and is its own local name.
const HASHED = /^(.+)\.[0-9a-f]{12}(\.[^./]+)?$/;

export function shortPathOf(path: string): string {
  const slash = path.lastIndexOf('/');
  const match = HASHED.exec(path.slice(slash + 1));
  return isNil(match) ? path : `${path.slice(0, slash + 1)}${match[1] ?? ''}${match[2] ?? ''}`;
}

export const toLogFiles = (listing: DirectoryListContent): ILogFile[] =>
  Object.entries(listing.files).map(([path, file]) => {
    const localPath = shortPathOf(path);
    return {
      path,
      localPath,
      name: localPath.split('/').pop() ?? localPath,
      size: file.size,
      lastModified: file.last_modified,
    };
  });

// The file a page points at: the exact saved name, else the newest file with that local name.
export function findLogFile(files: readonly ILogFile[], src: string): ILogFile | null {
  const exact = files.find((file) => file.path === src);
  if (isNotNil(exact)) return exact;
  const local = shortPathOf(src);
  return (
    files
      .filter((file) => file.localPath === local)
      .toSorted((a, b) => b.lastModified.localeCompare(a.lastModified))[0] ?? null
  );
}

// The pages' synced copies among a log's assets, named by their page's title.
export const documentsOf = (assets: readonly IResearchLogAsset[]): ILogDocument[] =>
  assets
    .filter((a) => a.label === DOCUMENT_LABEL && !a.is_directory)
    .map((a) => {
      const title = a.meta?.[PAGE_TITLE];
      const pageId = a.meta?.[PAGE_ID];
      return {
        assetId: a.id,
        path: a.path,
        title: typeof title === 'string' && title.trim() !== '' ? title : a.path,
        pageId: typeof pageId === 'string' ? pageId : null,
        size: a.size,
      };
    });

async function readLogFiles(
  logId: string,
  project: IProject,
  signal?: AbortSignal
): Promise<ILogFiles> {
  const log = await getResearchLog({ id: logId, context: project, signal });
  const assets = log.assets ?? [];
  const documents = documentsOf(assets);
  const folder = assets.find(
    (a) => a.label === FILES_LABEL && a.is_directory && a.status === 'created'
  );
  if (isNil(folder)) return { folderId: null, files: [], documents };
  const listing = await listDirectoryOfAssets({
    ctx: project,
    entityType: EntityTypeDict.ResearchLog,
    entityId: logId,
    id: folder.id,
    signal,
  });
  return { folderId: folder.id, files: toLogFiles(listing), documents };
}

export const logFilesQuery = (logId: string, project: IProject) =>
  queryOptions({
    queryKey: ['log-files', logId],
    queryFn: ({ signal }) => readLogFiles(logId, project, signal),
    staleTime: 30_000,
  });

// One asset of the log, as the raw answer: a file inside the folder (`path`), or a whole asset.
const downloadLogAsset = (
  logId: string,
  assetId: string,
  project: IProject,
  signal: AbortSignal,
  path = ''
): Promise<Response> =>
  downloadAsset({
    ctx: project,
    entityType: EntityTypeDict.ResearchLog,
    entityId: logId,
    id: assetId,
    assetPath: path,
    asRawResponse: true,
    signal,
  });

// A saved file never changes (add-only), so its bytes are read once per tab.
export const fileTextQuery = (logId: string, folderId: string, path: string, project: IProject) =>
  queryOptions({
    queryKey: ['file-text', logId, path],
    queryFn: async ({ signal }) =>
      (await downloadLogAsset(logId, folderId, project, signal, path)).text(),
    staleTime: Number.POSITIVE_INFINITY,
  });

// The published document is replaced in place at each Publish: read it fresh each time it shows.
export const documentTextQuery = (logId: string, assetId: string, project: IProject) =>
  queryOptions({
    queryKey: ['document-text', logId, assetId],
    queryFn: async ({ signal }) => (await downloadLogAsset(logId, assetId, project, signal)).text(),
  });

// An image as an object URL: the download needs the bearer token, an <img src> cannot send it.
// Limit: the URL is never revoked (a few images per log, freed with the tab). Upgrade: revoke it
// on gc, if logs ever hold hundreds of figures.
export const fileBlobQuery = (logId: string, folderId: string, path: string, project: IProject) =>
  queryOptions({
    queryKey: ['file-blob', logId, path],
    queryFn: async ({ signal }) =>
      URL.createObjectURL(
        await (await downloadLogAsset(logId, folderId, project, signal, path)).blob()
      ),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 5 * 60_000,
  });

// The headers a browser may set on the PUT. Content-Length is a forbidden header in fetch: the
// browser sends it itself, from the body, so it is left out here.
export const putHeadersOf = (
  signed: Readonly<Record<string, string>>
): Readonly<Record<string, string>> => omit(signed, ['Content-Length']);

export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// The largest upload (VITE_UPLOAD_MAX_MB). The whole file is read into memory once to hash it
// (crypto.subtle has no streaming digest), so the limit is checked on file.size, before reading.
export const UPLOAD_MAX_BYTES = Number(settings.upload.maxMb) * 1024 * 1024;

export const isTooLarge = (size: number, max = UPLOAD_MAX_BYTES): boolean => size > max;

export interface IPlannedFile {
  readonly path: string;
  readonly size: number;
  readonly sha256: string;
}

// The saved name a file will get: known before the upload, so the block that shows it can go into
// the page at once and show "uploading" until the file is listed. The file is read and hashed once
// here; the upload sends the same hash, so the name and S3's checksum always agree, even if the
// file changes on disk after this read (S3 then refuses the new bytes with BadDigest).
export async function planFile(file: File): Promise<IPlannedFile> {
  const sha256 = await sha256Hex(await file.arrayBuffer());
  return { path: savedNameOf(file.name, sha256), size: file.size, sha256 };
}

// Upload one file to the log (planFile first). The logbook server finds or makes the log's files
// folder and signs a PUT for these bytes under their name; the bytes go straight to S3, with no
// token. Idempotent: the name carries the content hash, so a file saved already (upload null, or a
// 412 from S3 when it was saved in between) is done. Safe to call again after any failure.
export async function uploadLogFile(
  logId: string,
  project: IProject,
  file: File,
  planned: IPlannedFile
): Promise<void> {
  const answer = await createResearchUpload({
    id: logId,
    context: project,
    file: { name: file.name, size: planned.size, sha256: planned.sha256 },
  });
  // The server and planFile share one naming rule (savedNameOf): a different name means the two
  // are out of step, and the block in the page would point at a file that never arrives.
  if (answer.path !== planned.path)
    throw new Error(`The server saved ${file.name} as ${answer.path}, not ${planned.path}`);
  if (isNil(answer.upload)) return;
  const put = await fetch(answer.upload.url, {
    method: 'PUT',
    body: file,
    headers: putHeadersOf(answer.upload.headers),
  });
  if (put.status === PRECONDITION_FAILED) return;
  if (!put.ok) throw new Error(`Uploading ${file.name} failed (HTTP ${put.status})`);
}

const PRECONDITION_FAILED = 412;
