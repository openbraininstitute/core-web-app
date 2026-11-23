import { delay, isNil, noop } from 'es-toolkit';
import { match } from 'ts-pattern';
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
import { LOCAL_SYNC_PAUSE_MS, LOCAL_SYNC_TRIES } from '@/features/logbook/constants';
import { CopySync } from '@/features/logbook/types';

import type { ICopyReport, IPageDocs, ISyncOptions, TCopySync } from '@/features/logbook/types';

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

const transient = (error: unknown): boolean => {
  const status = statusOf(error);
  return isNil(status) || status >= 500 || status === 429;
};
async function withRetry<T>(call: () => Promise<T>, pauseMs: number): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await call();
    } catch (error) {
      if (attempt >= LOCAL_SYNC_TRIES || !transient(error)) throw error;
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

export const isCopyDirty = async (name: string): Promise<boolean> =>
  (await dirtyKeysOf(name)).length > 0;

async function syncCopy(
  docs: IPageDocs,
  name: string,
  pageId: string,
  pauseMs: number
): Promise<TCopySync> {
  if (!(await isCopyDirty(name).catch(() => true))) return CopySync.Clean;
  const local = new Y.Doc();
  const persistence = new IndexeddbPersistence(name, local);
  try {
    await whenLoaded(persistence);
    const result = await sendMissing(docs, pageId, local, pauseMs);
    for (const key of await dirtyKeysOf(name)) await persistence.del(key);
    return result;
  } catch (error) {
    return match(statusOf(error))
      .with(404, () => CopySync.Gone)
      .with(403, () => CopySync.Refused)
      .otherwise(() => {
        console.warn(`The copy of page ${pageId} could not be sent:`, error);
        return CopySync.Failed;
      });
  } finally {
    await persistence.destroy().catch(noop);
    local.destroy();
  }
}

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
      : await whenCopyFree(
          name,
          () => syncCopy(docs, name, pageId, options.pauseMs ?? LOCAL_SYNC_PAUSE_MS),
          CopySync.Open
        );
    reports.push({ name, pageId, result });
  }
  return reports;
}

async function dropClean(names: readonly string[]): Promise<void> {
  for (const name of names) {
    const drop = async (): Promise<void> => {
      if (!(await isCopyDirty(name))) await clearDocument(name);
    };
    await whenCopyFree(name, drop, undefined).catch(noop);
  }
}

export async function dropCleanCopies(): Promise<void> {
  await closeAllCopies().catch(noop);
  await dropClean(await copyNames().catch(() => []));
}

export async function dropOthersCleanCopies(userId: string): Promise<void> {
  const mine = `:${userId}`;
  const names = await copyNames().catch(() => []);
  await dropClean(names.filter((name) => !name.endsWith(mine)));
}
