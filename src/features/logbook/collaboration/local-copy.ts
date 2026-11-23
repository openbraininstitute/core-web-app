// The page's Yjs doc in IndexedDB, so unsaved edits survive a closed tab, a crash or going offline.
import { isNil, isNotNil, noop } from 'es-toolkit';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

import { storageKeyOf } from '@/features/logbook/helpers';

// Per user, so two people on one machine never share a copy.
export const COPY_PREFIX = storageKeyOf('page', '');
export const copyName = (pageId: string, userId: string): string =>
  `${COPY_PREFIX}${pageId}:${userId}`;

// A Web Lock per copy, across tabs: every tab with the copy open holds it shared, and the
// start-up sync or sign-out takes it only when free. Without Web Locks, each tab sees its own.
const locksOf = (): LockManager | null => globalThis.navigator?.locks ?? null;

export function holdCopyLock(name: string): Promise<() => void> {
  const locks = locksOf();
  if (isNil(locks)) return Promise.resolve(noop);
  return new Promise((granted) => {
    void locks.request(
      name,
      { mode: 'shared' },
      () => new Promise<void>((release) => granted(release))
    );
  });
}

/** Runs `use` while no tab has the copy open; otherwise returns `busy`. */
export async function whenCopyFree<T>(name: string, use: () => Promise<T>, busy: T): Promise<T> {
  const locks = locksOf();
  if (isNil(locks)) return use();
  return locks.request(name, { ifAvailable: true }, (lock) => (isNil(lock) ? busy : use()));
}

// `dirty:<writer>`: this open copy (a tab) wrote edits the server may lack; the copy is clean
// when no such key is left. One key per writer, so a tab's saved notice never clears another
// tab's unsent edits; a crashed tab's key stays until the start-up sync has sent its copy.
export const DIRTY_PREFIX = 'dirty:';
export const DIRTY_YES = 1;

export interface IEntityCoreSyncState {
  readonly isSynced: boolean;
  readonly hasUnsyncedChanges: boolean;
}

// `_db` rejects when IndexedDB can't open; `whenSynced` would just hang.
export async function whenLoaded(persistence: IndexeddbPersistence): Promise<void> {
  // oxlint-disable-next-line eslint/no-underscore-dangle -- y-indexeddb's open promise
  await persistence._db;
  await persistence.whenSynced;
}

export interface ILocalCopyDeps {
  document: Y.Doc;
  persistence: IndexeddbPersistence | null;
  release?: () => void;
}

export class LocalCopy {
  readonly document: Y.Doc;
  // Held text on load, so show "Saving…" until synced.
  readonly restored: boolean;
  // Null without IndexedDB (e.g. private window): online only.
  readonly #persistence: IndexeddbPersistence | null;
  readonly #dirtyKey = `${DIRTY_PREFIX}${crypto.randomUUID()}`;
  // Cached so the key is written only on clean → dirty, not every keystroke.
  #dirty = false;
  // close() waits for this so a closed tab keeps its key.
  #written: Promise<unknown> = Promise.resolve();
  readonly #release: () => void;

  private constructor({ document, persistence, release = noop }: ILocalCopyDeps) {
    this.document = document;
    this.#persistence = persistence;
    this.#release = release;
    this.restored = document.getXmlFragment('default').length > 0;
    document.on('update', this.#onUpdate);
  }

  // Load before use, so the first sync carries what only this device has. Never throws.
  static async open(pageId: string, userId: string): Promise<LocalCopy> {
    const document = new Y.Doc();
    if (typeof indexedDB === 'undefined') return new LocalCopy({ document, persistence: null });
    const name = copyName(pageId, userId);
    const release = await holdCopyLock(name);
    const persistence = new IndexeddbPersistence(name, document);
    try {
      await whenLoaded(persistence);
      return new LocalCopy({ document, persistence, release });
    } catch (error) {
      console.warn('This page has no copy on this device:', error);
      void persistence.destroy().catch(noop);
      release();
      return new LocalCopy({ document, persistence: null });
    }
  }

  /** This tab has edits the server has not confirmed. */
  get dirty(): boolean {
    return this.#dirty;
  }

  // Only local edits mark dirty; written right here so a tab closed straight after keeps it.
  readonly #onUpdate = (_update: Uint8Array, _origin: unknown, _doc: Y.Doc, tr: Y.Transaction) => {
    if (!tr.local || this.#dirty || isNil(this.#persistence)) return;
    this.#dirty = true;
    this.#written = this.#persistence.set(this.#dirtyKey, DIRTY_YES);
  };

  // Clean only if synced with nothing unsent when the `saved` notice lands; only this tab's key.
  markClean(provider: IEntityCoreSyncState): void {
    if (!this.#dirty || isNil(this.#persistence)) return;
    if (!provider.isSynced || provider.hasUnsyncedChanges) return;
    this.#dirty = false;
    this.#written = this.#persistence.del(this.#dirtyKey);
  }

  // The copy stays on the device; only the handle and doc go.
  async close(): Promise<void> {
    this.document.off('update', this.#onUpdate);
    await this.#written.catch(noop);
    await this.#persistence?.destroy().catch(noop);
    this.#release();
    this.document.destroy();
  }
}

// Shared per tab; close waits a tick so React's dev double mount reuses the copy.
interface IHeld {
  readonly copy: Promise<LocalCopy>;
  users: number;
  closing: ReturnType<typeof setTimeout> | null;
}
const held = new Map<string, IHeld>();

export function acquireCopy(pageId: string, userId: string): Promise<LocalCopy> {
  const name = copyName(pageId, userId);
  const current = held.get(name);
  if (isNotNil(current)) {
    if (isNotNil(current.closing)) clearTimeout(current.closing);
    current.closing = null;
    current.users += 1;
    return current.copy;
  }
  const copy = LocalCopy.open(pageId, userId);
  held.set(name, { copy, users: 1, closing: null });
  return copy;
}

export function releaseCopy(pageId: string, userId: string): void {
  const name = copyName(pageId, userId);
  const current = held.get(name);
  if (isNil(current)) return;
  current.users -= 1;
  if (current.users > 0) return;
  current.closing = setTimeout(() => {
    held.delete(name);
    void current.copy.then((copy) => copy.close());
  }, 0);
}

// App-start sync skips these; their provider sends them.
export const openCopies = (): ReadonlySet<string> => new Set(held.keys());

// Sign-out: close every copy (flag written) so it can be deleted.
export async function closeAllCopies(): Promise<void> {
  const all = [...held.values()];
  held.clear();
  for (const current of all) if (isNotNil(current.closing)) clearTimeout(current.closing);
  await Promise.all(all.map(async (current) => (await current.copy).close()));
}
