import { isNil, isNotNil, noop } from 'es-toolkit';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

import { COPY_STORAGE_VERSION, DIRTY_YES, FRAGMENT } from '@/features/logbook/constants';
import { storageKeyOf } from '@/features/logbook/helpers';

import type { IEntityCoreSyncState, IHeld, ILocalCopyDeps } from '@/features/logbook/types';

export const COPY_PREFIX = `logbook:${COPY_STORAGE_VERSION}:page:`;
export const copyName = (pageId: string, userId: string): string =>
  `${COPY_PREFIX}${pageId}:${userId}`;

const locksOf = (): LockManager | null => globalThis.navigator?.locks ?? null;

function holdCopyLock(name: string): Promise<() => void> {
  const locks = locksOf();
  if (isNil(locks)) return Promise.resolve(noop);
  return new Promise((granted) => {
    locks
      .request(name, { mode: 'shared' }, () => new Promise<void>((release) => granted(release)))
      .catch(() => granted(noop));
  });
}

export async function whenCopyFree<T>(name: string, use: () => Promise<T>, busy: T): Promise<T> {
  const locks = locksOf();
  if (isNil(locks)) return use();
  return locks.request(name, { ifAvailable: true }, (lock) => (isNil(lock) ? busy : use()));
}

export const DIRTY_PREFIX = 'dirty:';

// `_db` rejects when IndexedDB can't open; `whenSynced` would just hang.
export async function whenLoaded(persistence: IndexeddbPersistence): Promise<void> {
  // oxlint-disable-next-line eslint/no-underscore-dangle -- y-indexeddb's open promise
  await persistence._db;
  await persistence.whenSynced;
}

export class LocalCopy {
  readonly document: Y.Doc;
  readonly restored: boolean;
  readonly #persistence: IndexeddbPersistence | null;
  readonly #dirtyKey = `${DIRTY_PREFIX}${crypto.randomUUID()}`;
  #dirty = false;
  #written: Promise<unknown> = Promise.resolve();
  readonly #release: () => void;

  private constructor({ document, persistence, release = noop }: ILocalCopyDeps) {
    this.document = document;
    this.#persistence = persistence;
    this.#release = release;
    this.restored = document.getXmlFragment(FRAGMENT).length > 0;
    document.on('update', this.#onUpdate);
  }

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

  get dirty(): boolean {
    return this.#dirty;
  }

  readonly #onUpdate = (_update: Uint8Array, _origin: unknown, _doc: Y.Doc, tr: Y.Transaction) => {
    if (!tr.local || this.#dirty || isNil(this.#persistence)) return;
    this.#dirty = true;
    this.#written = this.#persistence.set(this.#dirtyKey, DIRTY_YES);
  };

  markClean(provider: IEntityCoreSyncState): void {
    if (!this.#dirty || isNil(this.#persistence)) return;
    if (!provider.isSynced || provider.hasUnsyncedChanges) return;
    this.#dirty = false;
    this.#written = this.#persistence.del(this.#dirtyKey);
  }

  async close(): Promise<void> {
    this.document.off('update', this.#onUpdate);
    await this.#written.catch(noop);
    await this.#persistence?.destroy().catch(noop);
    this.#release();
    this.document.destroy();
  }
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

export const openCopies = (): ReadonlySet<string> => new Set(held.keys());

export async function closeAllCopies(): Promise<void> {
  const all = [...held.values()];
  held.clear();
  for (const current of all) if (isNotNil(current.closing)) clearTimeout(current.closing);
  await Promise.all(all.map(async (current) => (await current.copy).close()));
}
