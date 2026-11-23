import 'fake-indexeddb/auto';

import { isNil, isNotNil } from 'es-toolkit';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

import { ApiError } from '@/api/error';
import {
  acquireCopy,
  copyName,
  DIRTY_PREFIX,
  LocalCopy,
  releaseCopy,
} from '@/features/logbook/collaboration/local-copy';
import {
  dropCleanCopies,
  dropCopies,
  dropOthersCleanCopies,
  isCopyDirty,
  localCopies,
  syncCopies,
} from '@/features/logbook/collaboration/local-sync';
import { CopySync } from '@/features/logbook/types';

import type { IPageDocs } from '@/features/logbook/types';

function fakeLocks(): LockManager {
  const held = new Map<string, { mode: LockMode; count: number }>();
  const free = (name: string, mode: LockMode): boolean => {
    const current = held.get(name);
    return isNil(current) || (mode === 'shared' && current.mode === 'shared');
  };
  const request = async (
    name: string,
    options: LockOptions,
    callback: (lock: Lock | null) => unknown
  ): Promise<unknown> => {
    const mode = options.mode ?? 'exclusive';
    if (!free(name, mode)) {
      if (options.ifAvailable === true) return callback(null);
      while (!free(name, mode)) await new Promise((resolve) => setTimeout(resolve, 1));
    }
    const current = held.get(name);
    held.set(name, { mode, count: (current?.count ?? 0) + 1 });
    try {
      return await callback({ name, mode });
    } finally {
      const after = held.get(name);
      if (isNotNil(after) && after.count > 1) held.set(name, { mode, count: after.count - 1 });
      else held.delete(name);
    }
  };
  return { request, query: async () => ({}) } as never;
}
beforeAll(() =>
  Object.defineProperty(navigator, 'locks', { value: fakeLocks(), configurable: true })
);
afterAll(() => Reflect.deleteProperty(navigator, 'locks'));

let n = 0;
const nextUser = () => `user-${++n}`;
const PAGE = 'page-1';

const textOf = (document: Y.Doc): string =>
  document
    .getXmlFragment('default')
    .toArray()
    .map((node) => (node instanceof Y.XmlElement ? node.toArray().map(String).join('') : ''))
    .join('|');

function type(document: Y.Doc, s: string): void {
  document.transact(() => {
    const paragraph = new Y.XmlElement('paragraph');
    paragraph.insert(0, [new Y.XmlText(s)]);
    document.getXmlFragment('default').push([paragraph]);
  });
}

const dirtyOf = (userId: string, pageId = PAGE): Promise<boolean> =>
  isCopyDirty(copyName(pageId, userId));

async function typedCopy(userId: string, s: string, pageId = PAGE): Promise<void> {
  const copy = await LocalCopy.open(pageId, userId);
  type(copy.document, s);
  await copy.close();
}

const SYNCED = { isSynced: true, hasUnsyncedChanges: false };

function fakeServer(pages: readonly string[] = [PAGE]) {
  const docs = new Map(pages.map((id) => [id, new Y.Doc()]));
  const sent: Uint8Array[] = [];
  let reads = 0;
  const pageOf = (pageId: string): Y.Doc => {
    const found = docs.get(pageId);
    if (isNil(found)) throw new ApiError('not found', { status: 404 });
    return found;
  };
  const port: IPageDocs = {
    read: async (pageId) => {
      reads += 1;
      return Y.encodeStateAsUpdate(pageOf(pageId));
    },
    send: async (pageId, update) => {
      sent.push(update);
      Y.applyUpdate(pageOf(pageId), update);
    },
  };
  return { port, docs, sent, reads: () => reads };
}

test('a local change marks the copy dirty; a change applied from elsewhere does not', async () => {
  const user = nextUser();
  const copy = await LocalCopy.open(PAGE, user);
  const other = new Y.Doc();
  type(other, 'from the server');
  Y.applyUpdate(copy.document, Y.encodeStateAsUpdate(other));
  await copy.close();
  expect(await dirtyOf(user)).toBe(false);

  await typedCopy(user, 'typed here');
  expect(await dirtyOf(user)).toBe(true);
});

test('a reopened copy holds the text; a saved notice marks it clean only when nothing is unsent', async () => {
  const user = nextUser();
  await typedCopy(user, 'kept on this device');
  const copy = await LocalCopy.open(PAGE, user);
  expect(textOf(copy.document)).toBe('kept on this device');
  expect(copy.restored).toBe(true);
  type(copy.document, 'more');
  expect(copy.dirty).toBe(true);
  copy.markClean({ isSynced: true, hasUnsyncedChanges: true });
  copy.markClean({ isSynced: false, hasUnsyncedChanges: false });
  expect(copy.dirty).toBe(true);
  copy.markClean(SYNCED);
  expect(copy.dirty).toBe(false);
  await copy.close();
  expect(await dirtyOf(user)).toBe(true);
});

test('two tabs offline: one tab saved does not mark the other tab’s edits clean', async () => {
  const user = nextUser();
  const tabA = await LocalCopy.open(PAGE, user);
  const tabB = await LocalCopy.open(PAGE, user);
  type(tabA.document, 'typed in A');
  type(tabB.document, 'typed in B, never sent');
  tabA.markClean(SYNCED);
  await tabA.close();
  await tabB.close();
  expect(await dirtyOf(user)).toBe(true);

  const server = fakeServer();
  const [result] = await syncCopies(server.port, user, { skip: new Set() });
  expect(result?.result).toBe(CopySync.Sent);
  expect(textOf(server.docs.get(PAGE) ?? new Y.Doc())).toContain('typed in B, never sent');
  expect(await dirtyOf(user)).toBe(false);
});

test('a copy taken again within the same tick is not reloaded (React double mount)', async () => {
  const user = nextUser();
  const first = await acquireCopy(PAGE, user);
  releaseCopy(PAGE, user);
  const again = await acquireCopy(PAGE, user);
  expect(again).toBe(first);
  releaseCopy(PAGE, user);
  await new Promise((resolve) => setTimeout(resolve, 5));
  expect(again.document.isDestroyed).toBe(true);
});

test('at start a dirty copy is sent once and is clean after; the next start makes no request', async () => {
  const user = nextUser();
  await typedCopy(user, 'typed while offline');
  const server = fakeServer();
  expect(await syncCopies(server.port, user, { skip: new Set() })).toEqual([
    { name: copyName(PAGE, user), pageId: PAGE, result: CopySync.Sent },
  ]);
  expect(textOf(server.docs.get(PAGE) ?? new Y.Doc())).toBe('typed while offline');
  expect(await dirtyOf(user)).toBe(false);

  const [again] = await syncCopies(server.port, user, { skip: new Set() });
  expect(again?.result).toBe(CopySync.Clean);
  expect(server.reads()).toBe(1);
});

test('a copy the server already has is read once and nothing is sent', async () => {
  const user = nextUser();
  await typedCopy(user, 'already there');
  const server = fakeServer();
  const [result] = await syncCopies(server.port, user, { skip: new Set() });
  expect(result?.result).toBe(CopySync.Sent);
  const persistence = new IndexeddbPersistence(copyName(PAGE, user), new Y.Doc());
  await persistence.whenSynced;
  await persistence.set(`${DIRTY_PREFIX}crashed-tab`, 1);
  await persistence.destroy();
  const [second] = await syncCopies(server.port, user, { skip: new Set() });
  expect(second?.result).toBe(CopySync.NothingToSend);
  expect(server.sent).toHaveLength(1);
});

test('a lost answer or a 5xx: the same bytes are sent again until 200', async () => {
  const user = nextUser();
  await typedCopy(user, 'sent twice');
  const server = fakeServer();
  let sends = 0;
  const flaky: IPageDocs = {
    read: server.port.read,
    send: async (pageId, update) => {
      sends += 1;
      if (sends === 1) throw new ApiError('HTTP 503', { status: 503 });
      if (sends === 2) throw new TypeError('Failed to fetch');
      await server.port.send(pageId, update);
    },
  };
  const [result] = await syncCopies(flaky, user, { skip: new Set(), pauseMs: 1 });
  expect(result?.result).toBe(CopySync.Sent);
  expect(sends).toBe(3);
  expect(textOf(server.docs.get(PAGE) ?? new Y.Doc())).toBe('sent twice');
});

test('server down: the copy stays dirty and is reported; a gone page is reported, never deleted', async () => {
  const user = nextUser();
  await typedCopy(user, 'nowhere to go');
  await typedCopy(user, 'page deleted', 'page-gone');
  const server = fakeServer([PAGE]);
  const down: IPageDocs = {
    read: async (pageId) => {
      if (pageId === PAGE) throw new TypeError('Failed to fetch');
      return server.port.read(pageId);
    },
    send: server.port.send,
  };
  const results = await syncCopies(down, user, { skip: new Set(), pauseMs: 1 });
  expect(Object.fromEntries(results.map((r) => [r.pageId, r.result]))).toEqual({
    [PAGE]: CopySync.Failed,
    'page-gone': CopySync.Gone,
  });
  expect(await dirtyOf(user)).toBe(true);
  expect(await dirtyOf(user, 'page-gone')).toBe(true);
  expect((await localCopies(user)).map((c) => c.pageId).toSorted()).toEqual([PAGE, 'page-gone']);
});

test('a copy open in this tab is left to its provider', async () => {
  const user = nextUser();
  await typedCopy(user, 'open elsewhere');
  const server = fakeServer();
  const [result] = await syncCopies(server.port, user, { skip: new Set([copyName(PAGE, user)]) });
  expect(result?.result).toBe(CopySync.Open);
  expect(server.reads()).toBe(0);
});

test('a copy open in another tab is left to that tab, and its later edits still count', async () => {
  const user = nextUser();
  const other = await LocalCopy.open(PAGE, user);
  type(other.document, 'typed in the other tab');
  const server = fakeServer();
  const [result] = await syncCopies(server.port, user);
  expect(result?.result).toBe(CopySync.Open);
  type(other.document, 'typed offline, then the tab crashed');
  await other.close();
  expect(await dirtyOf(user)).toBe(true);
});

test('sign-out drops every copy the server has, and keeps the ones with unsent edits', async () => {
  const clean = nextUser();
  const dirty = nextUser();
  const open = nextUser();
  const copy = await LocalCopy.open(PAGE, clean);
  type(copy.document, 'saved');
  copy.markClean(SYNCED);
  await copy.close();
  await typedCopy(dirty, 'not on the server yet');
  const held = await LocalCopy.open(PAGE, open);

  await dropCleanCopies();

  expect(await localCopies(clean)).toEqual([]);
  expect((await localCopies(dirty)).map((c) => c.pageId)).toEqual([PAGE]);
  expect((await localCopies(open)).map((c) => c.pageId)).toEqual([PAGE]);
  await held.close();
});

test('discarding drops a copy with unsent edits, and leaves one open in a tab', async () => {
  const lost = nextUser();
  const open = nextUser();
  await typedCopy(lost, 'can no longer be saved');
  const held = await LocalCopy.open(PAGE, open);
  type(held.document, 'still being edited');
  const names = [...(await localCopies(lost)), ...(await localCopies(open))].map((c) => c.name);

  await dropCopies(names);

  expect(await localCopies(lost)).toEqual([]);
  expect((await localCopies(open)).map((c) => c.pageId)).toEqual([PAGE]);
  await held.close();
});

test('at start, another user’s saved copies go; theirs with unsent edits and mine stay', async () => {
  const me = nextUser();
  const other = nextUser();
  const mine = await LocalCopy.open(PAGE, me);
  mine.markClean(SYNCED);
  await mine.close();
  const theirs = await LocalCopy.open(PAGE, other);
  theirs.markClean(SYNCED);
  await theirs.close();
  await typedCopy(other, 'their unsent edit', 'page-2');

  await dropOthersCleanCopies(me);

  expect((await localCopies(me)).map((c) => c.pageId)).toEqual([PAGE]);
  expect((await localCopies(other)).map((c) => c.pageId)).toEqual(['page-2']);
});

test('a copy that is gone reads as clean and is not made again', async () => {
  const name = copyName('page-never-opened', nextUser());
  expect(await isCopyDirty(name)).toBe(false);
  expect((await indexedDB.databases()).map((d) => d.name)).not.toContain(name);
});

test('a copy still opens when the browser refuses its lock', async () => {
  const locks = navigator.locks;
  const refused = { request: () => Promise.reject(new Error('refused')), query: async () => ({}) };
  Object.defineProperty(navigator, 'locks', { value: refused, configurable: true });
  try {
    const user = nextUser();
    await typedCopy(user, 'kept without a lock');
    const copy = await LocalCopy.open(PAGE, user);
    expect(textOf(copy.document)).toBe('kept without a lock');
    await copy.close();
  } finally {
    Object.defineProperty(navigator, 'locks', { value: locks, configurable: true });
  }
});
