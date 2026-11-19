// The copy of a page on this device: its Yjs document in IndexedDB
// (y-indexeddb), one database per page and user. The editor and the Hocuspocus provider run on
// this document, so edits that no task has saved yet survive a closed tab, a crash or a long time
// offline, and the next tab (or the next app start, local-sync.ts) sends them.
import { isNil, isNotNil, noop } from 'es-toolkit';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

// `logbook:<pageId>:<userId>`: two people on one machine never share a copy.
export const COPY_PREFIX = 'logbook:';
export const copyName = (pageId: string, userId: string): string =>
  `${COPY_PREFIX}${pageId}:${userId}`;

// The key in a copy's `custom` store that says it may hold edits the server lacks. A number, as
// the store keeps no booleans; a copy without the key counts as dirty (one full sync, then clean).
export const DIRTY_KEY = 'dirty';
export const Dirty = { Yes: 1, No: 0 } as const;

// What `markClean` needs to know of the provider.
export interface IEntityCoreSyncState {
  readonly isSynced: boolean;
  readonly hasUnsyncedChanges: boolean;
}

// A copy read into its document. `_db` is y-indexeddb's only sign that the database could not
// open (blocked, quota, a private window): it rejects, where `whenSynced` would wait forever.
export async function whenLoaded(persistence: IndexeddbPersistence): Promise<void> {
  // oxlint-disable-next-line eslint/no-underscore-dangle -- see above: y-indexeddb's open promise
  await persistence._db;
  await persistence.whenSynced;
}

/** What LocalCopy takes, by name. */
export interface ILocalCopyDeps {
  document: Y.Doc;
  persistence: IndexeddbPersistence | null;
  dirty: boolean;
}

export class LocalCopy {
  readonly document: Y.Doc;
  // True when the copy held text when it was loaded: "Saving…" until the provider is synced.
  readonly restored: boolean;
  // Null when this browser gives no IndexedDB (a private window may refuse it): the page then
  // works online only, as it would without this file.
  readonly #persistence: IndexeddbPersistence | null;
  // The flag as stored, kept here so a keystroke writes it only when it changes (clean → dirty),
  // not on every change: y-indexeddb already writes one row per change.
  #dirty: boolean;
  // The last flag write: close() waits for it, so a closed tab keeps the flag.
  #written: Promise<unknown> = Promise.resolve();

  private constructor({ document, persistence, dirty }: ILocalCopyDeps) {
    this.document = document;
    this.#persistence = persistence;
    this.#dirty = dirty;
    this.restored = document.getXmlFragment('default').length > 0;
    document.on('update', this.#onUpdate);
  }

  // The copy, loaded (`whenSynced`) before anything uses it: the editor never starts on an empty
  // document, and the provider's first sync carries what only this device has. Never throws.
  static async open(pageId: string, userId: string): Promise<LocalCopy> {
    const document = new Y.Doc();
    if (typeof indexedDB === 'undefined')
      return new LocalCopy({ document, persistence: null, dirty: false });
    const persistence = new IndexeddbPersistence(copyName(pageId, userId), document);
    try {
      await whenLoaded(persistence);
      const flag: unknown = await persistence.get(DIRTY_KEY);
      // A new copy holds nothing yet, so nothing the server lacks: clean from the start. Else a
      // page only read here would stay unflagged and be read again at every app start.
      if (isNil(flag) && document.store.clients.size === 0) {
        await persistence.set(DIRTY_KEY, Dirty.No);
        return new LocalCopy({ document, persistence, dirty: false });
      }
      return new LocalCopy({ document, persistence, dirty: flag !== Dirty.No });
    } catch (error) {
      console.warn('This page has no copy on this device:', error);
      void persistence.destroy().catch(noop);
      return new LocalCopy({ document, persistence: null, dirty: false });
    }
  }

  get dirty(): boolean {
    return this.#dirty;
  }

  // A change typed here: a local transaction. The provider and y-indexeddb apply theirs with
  // Y.applyUpdate, which is never local. The flag is written inside this handler, so a tab closed
  // right after the change still has it.
  readonly #onUpdate = (_update: Uint8Array, _origin: unknown, _doc: Y.Doc, tr: Y.Transaction) => {
    if (!tr.local || this.#dirty || isNil(this.#persistence)) return;
    this.#dirty = true;
    this.#written = this.#persistence.set(DIRTY_KEY, Dirty.Yes);
  };

  // A `saved` notice came: when the provider is synced with nothing unsent, the server has had
  // every change of this copy before the notice, so the copy is clean. A change after this sets
  // the flag again; IndexedDB runs the two writes in order.
  markClean(provider: IEntityCoreSyncState): void {
    if (!this.#dirty || isNil(this.#persistence)) return;
    if (!provider.isSynced || provider.hasUnsyncedChanges) return;
    this.#dirty = false;
    this.#written = this.#persistence.set(DIRTY_KEY, Dirty.No);
  }

  // The page closes: the copy stays on the device (it makes reopening fast and holds what a crash
  // would lose); only the open handle and the document go.
  async close(): Promise<void> {
    this.document.off('update', this.#onUpdate);
    await this.#written.catch(noop);
    await this.#persistence?.destroy().catch(noop);
    this.document.destroy();
  }
}

// The copies open in this tab, shared by whoever opens the same page, closed when the last one
// lets go. Closing waits a tick, like HocuspocusRoom's provider: React's development double mount
// takes the copy again at once and never reloads it.
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

// The database names open in this tab: the sync at app start leaves them to their provider.
export const openCopies = (): ReadonlySet<string> => new Set(held.keys());

// Sign-out: every copy open in this tab closes now (its flag written), so it can be deleted.
export async function closeAllCopies(): Promise<void> {
  const all = [...held.values()];
  held.clear();
  for (const current of all) if (isNotNil(current.closing)) clearTimeout(current.closing);
  await Promise.all(all.map(async (current) => (await current.copy).close()));
}
