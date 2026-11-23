// Push edits only this device has, at app start and before sign-out; clean copies cost no request.
import { delay, isNil, noop } from 'es-toolkit';
import { clearDocument, IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

import { ApiError } from '@/api/error';
import { ProblemType } from '@/api/logbook/types';
import {
  COPY_PREFIX,
  closeAllCopies,
  DIRTY_PREFIX,
  openCopies,
  whenCopyFree,
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

const statusOf = (error: unknown): number | null =>
  error instanceof ApiError ? (error.cause?.status ?? null) : null;
const typeOf = (error: unknown): string | null =>
  error instanceof ApiError ? (error.cause?.type ?? null) : null;

// Old browsers lack `indexedDB.databases()`; copies then sync when their page opens.
async function copyNames(): Promise<string[]> {
  if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return [];
  const databases = await indexedDB.databases();
  return databases
    .map((database) => database.name ?? '')
    .filter((name) => name.startsWith(COPY_PREFIX));
}

export async function localCopies(userId: string): Promise<{ name: string; pageId: string }[]> {
  const suffix = `:${userId}`;
  return (await copyNames())
    .filter((name) => name.endsWith(suffix))
    .map((name) => ({ name, pageId: name.slice(COPY_PREFIX.length, -suffix.length) }));
}

// Resending a Yjs update is harmless; after the last try the copy stays dirty for next start.
const TRIES = 3;
const PAUSE_MS = 1000;
const transient = (error: unknown): boolean => {
  const status = statusOf(error);
  return isNil(status) || status >= 500 || status === 429;
};
async function withRetry<T>(call: () => Promise<T>, pauseMs: number): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await call();
    } catch (error) {
      if (attempt >= TRIES || !transient(error)) throw error;
      await delay(pauseMs * 2 ** (attempt - 1));
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

// y-indexeddb keeps `persistence.set` keys in this store, next to the page's updates.
const CUSTOM_STORE = 'custom';

// The dirty keys, read without loading the page: a clean copy costs one small read, not its text.
// A database that is gone reads as none and is not made again.
function dirtyKeysOf(name: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(name);
    open.onupgradeneeded = () => open.transaction?.abort();
    open.onerror = () => (open.error?.name === 'AbortError' ? resolve([]) : reject(open.error));
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(CUSTOM_STORE)) {
        db.close();
        resolve([]);
        return;
      }
      const read = db
        .transaction(CUSTOM_STORE, 'readonly')
        .objectStore(CUSTOM_STORE)
        .getAllKeys(IDBKeyRange.bound(DIRTY_PREFIX, `${DIRTY_PREFIX}￿`));
      read.onsuccess = () => {
        db.close();
        resolve(read.result.map(String));
      };
      read.onerror = () => {
        db.close();
        reject(read.error);
      };
    };
  });
}

/** A tab, open or crashed, wrote edits to this copy that the server has not confirmed. */
export const isCopyDirty = async (name: string): Promise<boolean> =>
  (await dirtyKeysOf(name)).length > 0;

async function syncCopy(
  docs: IPageDocs,
  name: string,
  pageId: string,
  pauseMs: number
): Promise<TCopySync> {
  // Unreadable keys count as dirty: sending again is harmless, skipping could lose edits.
  if (!(await isCopyDirty(name).catch(() => true))) return CopySync.Clean;
  const local = new Y.Doc();
  const persistence = new IndexeddbPersistence(name, local);
  try {
    await whenLoaded(persistence);
    const result = await sendMissing(docs, pageId, local, pauseMs);
    // No tab has the copy open (its lock is ours), so every key's edits were just sent.
    for (const key of await dirtyKeysOf(name)) await persistence.del(key);
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
    // Open in this tab (skip) or in another (its lock): that tab's provider sends it.
    const result = skip.has(name)
      ? CopySync.Open
      : await whenCopyFree(
          name,
          () => syncCopy(docs, name, pageId, options.pauseMs ?? PAUSE_MS),
          CopySync.Open
        );
    reports.push({ name, pageId, result });
  }
  return reports;
}

// A copy with unsent edits stays (deleting it loses work); so does one open in a tab.
async function dropClean(names: readonly string[]): Promise<void> {
  for (const name of names) {
    const drop = async (): Promise<void> => {
      if (!(await isCopyDirty(name))) await clearDocument(name);
    };
    await whenCopyFree(name, drop, undefined).catch(noop);
  }
}

/** Sign-out: deletes every user's copy that the server already has. Never throws. */
export async function dropCleanCopies(): Promise<void> {
  await closeAllCopies().catch(noop);
  await dropClean(await copyNames().catch(() => []));
}

/** App start: deletes other users' saved copies, for a sign-out that skipped the log-out page. */
export async function dropOthersCleanCopies(userId: string): Promise<void> {
  const mine = `:${userId}`;
  const names = await copyNames().catch(() => []);
  await dropClean(names.filter((name) => !name.endsWith(mine)));
}
