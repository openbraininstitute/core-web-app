// Sending what only this device has, without opening the pages: at app start
// for every copy of the signed-in person that may hold edits the server lacks, and at sign-out
// before a copy is deleted. A clean copy, the common case, costs no request: only a dirty one is
// read (a page can be 8 MB), compared and sent.
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

// The server side of a page's text: the port this file talks to (api/page-docs.ts in the app, a
// fake in the tests). Both throw an ApiError (its cause has the HTTP status and problem type) when refused.
export interface IPageDocs {
  readonly read: (pageId: string) => Promise<Uint8Array>;
  readonly send: (pageId: string, update: Uint8Array) => Promise<void>;
}

export const CopySync = {
  Clean: 'clean', // the flag says the server has it all: no request
  Sent: 'sent',
  NothingToSend: 'nothing-to-send',
  Open: 'open', // open in this tab: its provider sends it
  Gone: 'gone', // 404: the page is gone, or this person cannot see it any more
  Refused: 'refused', // 403: read-only for this person now
  Failed: 'failed', // the server could not be reached: kept, tried again at the next start
} as const;
export type TCopySync = TValueOf<typeof CopySync>;

export interface ICopyReport {
  readonly name: string;
  readonly pageId: string;
  readonly result: TCopySync;
}

// Results after which the copy holds nothing the server lacks.
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

// The copies of `userId` on this device. `indexedDB.databases()` is missing in old browsers:
// then none are listed, and each copy is still sent when its page is opened.
export async function localCopies(userId: string): Promise<{ name: string; pageId: string }[]> {
  if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return [];
  const suffix = `:${userId}`;
  const databases = await indexedDB.databases();
  return databases
    .map((database) => database.name ?? '')
    .filter((name) => name.startsWith(COPY_PREFIX) && name.endsWith(suffix))
    .map((name) => ({ name, pageId: name.slice(COPY_PREFIX.length, -suffix.length) }));
}

// Same bytes again after a lost answer or a 5xx: a repeated Yjs change changes nothing. A few
// tries with a growing pause; after that the copy stays dirty for the next start.
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

// What the server lacks of `local`: the difference to its state, or null when there is none.
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

// Read the page, send what it lacks of `local`. On 409 change-needs-missing-content the page
// changed under the difference (a restore, a merge): read it again and send the new difference.
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

// One copy: clean → nothing; dirty (or no flag) → read the page, send the difference, then clean.
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
  // The copies to leave alone: open in this tab, their provider sends them.
  readonly skip?: ReadonlySet<string>;
  readonly pauseMs?: number;
}

// Every copy of `userId`, one after another: a dirty copy holds up to two page documents in
// memory while it is compared, so one at a time bounds the memory. Never throws.
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

// Sign-out: send first, then delete. A copy is deleted only once the server has everything in it;
// the others are kept and returned, so the screen can name them and ask whether to sign out
// anyway (then `discardCopies`). A copy whose changes the server lacks is never deleted unasked.
export async function clearSyncedCopies(
  docs: IPageDocs,
  userId: string,
  options: Omit<ISyncOptions, 'skip'> = {}
): Promise<ICopyReport[]> {
  // Open copies first: a database cannot be deleted while this tab holds it open.
  await closeAllCopies();
  const reports = await syncCopies(docs, userId, { ...options, skip: new Set() });
  for (const report of reports.filter(isSafe)) await clearDocument(report.name);
  return reports.filter((report) => !isSafe(report));
}

// The person chose to sign out anyway: these copies go with what only they held.
export async function discardCopies(reports: readonly ICopyReport[]): Promise<void> {
  for (const report of reports) await clearDocument(report.name);
}
