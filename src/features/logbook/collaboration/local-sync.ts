// Push edits only this device has, at app start and before sign-out; clean copies cost no request.
import { isNil, noop } from 'es-toolkit';
import { clearDocument, IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

import { ApiError } from '@/api/error';
import { ProblemType } from '@/api/logbook/types';
import {
  COPY_PREFIX,
  closeAllCopies,
  DIRTY_KEY,
  Dirty,
  openCopies,
  whenLoaded,
} from '@/features/logbook/collaboration/local-copy';

import type { TValueOf } from '@/api/logbook/types';

// Both throw an ApiError when refused.
export interface IPageDocs {
  readonly read: (pageId: string) => Promise<Uint8Array>;
  readonly send: (pageId: string, update: Uint8Array) => Promise<void>;
}

export const CopySync = {
  Clean: 'clean',
  Sent: 'sent',
  NothingToSend: 'nothing-to-send',
  Open: 'open', // its provider sends it
  Gone: 'gone', // 404
  Refused: 'refused', // 403
  Failed: 'failed', // kept, retried at the next start
} as const;
export type TCopySync = TValueOf<typeof CopySync>;

export interface ICopyReport {
  readonly name: string;
  readonly pageId: string;
  readonly result: TCopySync;
}

const SAFE: ReadonlySet<TCopySync> = new Set([
  CopySync.Clean,
  CopySync.Sent,
  CopySync.NothingToSend,
]);
export const isSafe = (report: ICopyReport): boolean => SAFE.has(report.result);

const statusOf = (error: unknown): number | null =>
  error instanceof ApiError ? (error.cause?.status ?? null) : null;
const typeOf = (error: unknown): string | null =>
  error instanceof ApiError ? (error.cause?.type ?? null) : null;

// Old browsers lack `indexedDB.databases()`; copies then sync when their page opens.
export async function localCopies(userId: string): Promise<{ name: string; pageId: string }[]> {
  if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return [];
  const suffix = `:${userId}`;
  const databases = await indexedDB.databases();
  return databases
    .map((database) => database.name ?? '')
    .filter((name) => name.startsWith(COPY_PREFIX) && name.endsWith(suffix))
    .map((name) => ({ name, pageId: name.slice(COPY_PREFIX.length, -suffix.length) }));
}

// Resending a Yjs update is harmless; after the last try the copy stays dirty for next start.
const TRIES = 3;
const PAUSE_MS = 1000;
const transient = (error: unknown): boolean => {
  const status = statusOf(error);
  return isNil(status) || status >= 500 || status === 429;
};
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function withRetry<T>(call: () => Promise<T>, pauseMs: number): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await call();
    } catch (error) {
      if (attempt >= TRIES || !transient(error)) throw error;
      await pause(pauseMs * 2 ** (attempt - 1));
    }
  }
}

async function missingOnServer(
  docs: IPageDocs,
  pageId: string,
  local: Y.Doc,
  pauseMs: number
): Promise<Uint8Array | null> {
  const server = new Y.Doc();
  try {
    Y.applyUpdate(server, await withRetry(() => docs.read(pageId), pauseMs));
    const diff = Y.encodeStateAsUpdate(local, Y.encodeStateVector(server));
    const { structs, ds } = Y.decodeUpdate(diff);
    return structs.length > 0 || ds.clients.size > 0 ? diff : null;
  } finally {
    server.destroy();
  }
}

// On 409 change-needs-missing-content the page changed under us: re-read and resend the diff.
async function sendMissing(
  docs: IPageDocs,
  pageId: string,
  local: Y.Doc,
  pauseMs: number
): Promise<TCopySync> {
  const send = (update: Uint8Array) => withRetry(() => docs.send(pageId, update), pauseMs);
  const diff = await missingOnServer(docs, pageId, local, pauseMs);
  if (isNil(diff)) return CopySync.NothingToSend;
  try {
    await send(diff);
    return CopySync.Sent;
  } catch (error) {
    if (statusOf(error) !== 409 || typeOf(error) !== ProblemType.ChangeNeedsMissingContent)
      throw error;
  }
  const again = await missingOnServer(docs, pageId, local, pauseMs);
  if (isNil(again)) return CopySync.NothingToSend;
  await send(again);
  return CopySync.Sent;
}

async function syncCopy(
  docs: IPageDocs,
  name: string,
  pageId: string,
  pauseMs: number
): Promise<TCopySync> {
  const local = new Y.Doc();
  const persistence = new IndexeddbPersistence(name, local);
  try {
    await whenLoaded(persistence);
    if ((await persistence.get(DIRTY_KEY)) === Dirty.No) return CopySync.Clean;
    const result = await sendMissing(docs, pageId, local, pauseMs);
    await persistence.set(DIRTY_KEY, Dirty.No);
    return result;
  } catch (error) {
    const status = statusOf(error);
    if (status === 404) return CopySync.Gone;
    if (status === 403) return CopySync.Refused;
    console.warn(`The copy of page ${pageId} could not be sent:`, error);
    return CopySync.Failed;
  } finally {
    await persistence.destroy().catch(noop);
    local.destroy();
  }
}

export interface ISyncOptions {
  readonly skip?: ReadonlySet<string>;
  readonly pauseMs?: number;
}

// One at a time to bound memory (two page docs per dirty copy). Never throws.
export async function syncCopies(
  docs: IPageDocs,
  userId: string,
  options: ISyncOptions = {}
): Promise<ICopyReport[]> {
  const skip = options.skip ?? openCopies();
  const reports: ICopyReport[] = [];
  for (const { name, pageId } of await localCopies(userId).catch(() => [])) {
    const result = skip.has(name)
      ? CopySync.Open
      : await syncCopy(docs, name, pageId, options.pauseMs ?? PAUSE_MS);
    reports.push({ name, pageId, result });
  }
  return reports;
}

// Delete only copies the server fully has; return the rest so the user decides.
export async function clearSyncedCopies(
  docs: IPageDocs,
  userId: string,
  options: Omit<ISyncOptions, 'skip'> = {}
): Promise<ICopyReport[]> {
  // A database can't be deleted while this tab holds it open.
  await closeAllCopies();
  const reports = await syncCopies(docs, userId, { ...options, skip: new Set() });
  // Each copy is its own database, so they clear side by side.
  await Promise.all(reports.filter(isSafe).map((report) => clearDocument(report.name)));
  return reports.filter((report) => !isSafe(report));
}

// The user chose to sign out anyway; unsent edits are lost.
export async function discardCopies(reports: readonly ICopyReport[]): Promise<void> {
  await Promise.all(reports.map((report) => clearDocument(report.name)));
}
