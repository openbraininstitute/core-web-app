// Log files live in one EntityCore folder asset; uploads only add, so a saved plot never changes.
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
  readonly path: string;
  readonly localPath: string; // saved name without the hash part
  readonly name: string;
  readonly size: number;
  readonly lastModified: string;
}

// A page's markdown copy written by the server's EntityCore sync; read-only here.
export interface ILogDocument {
  readonly assetId: string;
  readonly path: string;
  readonly title: string;
  readonly pageId: string | null;
  readonly size: number;
}

export interface ILogFiles {
  readonly folderId: string | null;
  readonly files: readonly ILogFile[];
  readonly documents: readonly ILogDocument[];
}

const FILES_LABEL = 'research_log_files';
const DOCUMENT_LABEL = 'research_log_document';
const PAGE_TITLE = 'logbook_page_title';
const PAGE_ID = 'logbook_page_id';

export const MARKDOWN = /\.(md|markdown)$/i;

export const ArtifactKind = {
  Image: 'image',
  Markdown: 'markdown',
  Table: 'table',
  Code: 'code',
  Pdf: 'pdf',
  Other: 'other',
} as const;
export type TArtifactKind = TValueOf<typeof ArtifactKind>;

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

export interface IArtifact {
  readonly id: string;
  readonly name: string;
  readonly where: string; // folder, or 'synced' for a page's copy
  readonly size: number;
  readonly savedAt: string | null;
  readonly kind: TArtifactKind;
  readonly path: string | null;
  readonly assetId: string | null;
  readonly pageId: string | null;
}

const folderOf = (localPath: string): string => localPath.split('/').slice(0, -1).join('/');

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

// Name only: the list shows no folder, so match only what people can see.
export function searchArtifacts(artifacts: readonly IArtifact[], query: string): IArtifact[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [...artifacts];
  return artifacts.filter((a) => a.name.toLowerCase().includes(needle));
}

export const UPLOAD_ACCEPT =
  '.png,.jpg,.jpeg,.webp,.gif,.svg,.json,.swc,.nrrd,.obj,.hoc,.asc,.abf,.nwb,.h5,.txt,.mod,.pdf,.glb,.gz,.gzip,.tgz,.ipynb,.zip,.md,.markdown,.csv,.py,.sh';

// `<stem>.<first 12 hex of the SHA-256>.<ext>`; older names have no hash part.
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

// Exact saved name, else the newest file with that local name.
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

// Files are add-only, so read once per tab.
export const fileTextQuery = (logId: string, folderId: string, path: string, project: IProject) =>
  queryOptions({
    queryKey: ['file-text', logId, path],
    queryFn: async ({ signal }) =>
      (await downloadLogAsset(logId, folderId, project, signal, path)).text(),
    staleTime: Number.POSITIVE_INFINITY,
  });

// Publish replaces the document in place, so always read it fresh.
export const documentTextQuery = (logId: string, assetId: string, project: IProject) =>
  queryOptions({
    queryKey: ['document-text', logId, assetId],
    queryFn: async ({ signal }) => (await downloadLogAsset(logId, assetId, project, signal)).text(),
  });

// <img src> can't send the token. Limit: URL never revoked. Upgrade: revoke on gc.
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

// fetch forbids setting Content-Length; the browser adds it.
export const putHeadersOf = (
  signed: Readonly<Record<string, string>>
): Readonly<Record<string, string>> => omit(signed, ['Content-Length']);

export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// The whole file is hashed in memory (no streaming digest), so check size before reading.
export const UPLOAD_MAX_BYTES = Number(settings.upload.maxMb) * 1024 * 1024;

export const isTooLarge = (size: number, max = UPLOAD_MAX_BYTES): boolean => size > max;

export interface IPlannedFile {
  readonly path: string;
  readonly size: number;
  readonly sha256: string;
}

// Hash once here and reuse it for the upload, so the name and S3's checksum always match.
export async function planFile(file: File): Promise<IPlannedFile> {
  const sha256 = await sha256Hex(await file.arrayBuffer());
  return { path: savedNameOf(file.name, sha256), size: file.size, sha256 };
}

// Idempotent: the name carries the hash, so null upload or a 412 means it's already saved.
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
  // A different name means server and client naming drifted; the block would never resolve.
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
