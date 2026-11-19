import 'fake-indexeddb/auto';

import { isNil } from 'es-toolkit';
import { expect, test } from 'vitest';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

import { ApiError } from '@/api/error';
import {
  acquireCopy,
  copyName,
  DIRTY_KEY,
  LocalCopy,
  releaseCopy,
} from '@/features/logbook/collaboration/local-copy';
import {
  CopySync,
  clearSyncedCopies,
  localCopies,
  syncCopies,
} from '@/features/logbook/collaboration/local-sync';

import type { IPageDocs } from '@/features/logbook/collaboration/local-sync';

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

const flagOf = async (userId: string, pageId = PAGE): Promise<unknown> => {
  const persistence = new IndexeddbPersistence(copyName(pageId, userId), new Y.Doc());
  await persistence.whenSynced;
  const flag: unknown = await persistence.get(DIRTY_KEY);
  await persistence.destroy();
  return flag;
};

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
  expect(await flagOf(user)).toBe(0);

  await typedCopy(user, 'typed here');
  expect(await flagOf(user)).toBe(1);
});

test('a copy from before the flag (text, no key) counts as dirty and is sent once', async () => {
  const user = nextUser();
  const old = new Y.Doc();
  const persistence = new IndexeddbPersistence(copyName(PAGE, user), old);
  await persistence.whenSynced;
  type(old, 'typed before the flag existed');
  await persistence.destroy();
  expect(await flagOf(user)).toBeUndefined();

  const server = fakeServer();
  const results = [
    ...(await syncCopies(server.port, user, { skip: new Set() })),
    ...(await syncCopies(server.port, user, { skip: new Set() })),
  ];
  expect(results.map((r) => r.result)).toEqual([CopySync.Sent, CopySync.Clean]);
  expect(textOf(server.docs.get(PAGE) ?? new Y.Doc())).toBe('typed before the flag existed');
});

test('a reopened copy holds the text; a saved notice marks it clean only when nothing is unsent', async () => {
  const user = nextUser();
  await typedCopy(user, 'kept on this device');
  const copy = await LocalCopy.open(PAGE, user);
  expect(textOf(copy.document)).toBe('kept on this device');
  expect(copy.restored).toBe(true);
  expect(copy.dirty).toBe(true);
  copy.markClean({ isSynced: true, hasUnsyncedChanges: true });
  copy.markClean({ isSynced: false, hasUnsyncedChanges: false });
  expect(copy.dirty).toBe(true);
  copy.markClean(SYNCED);
  expect(copy.dirty).toBe(false);
  await copy.close();
  expect(await flagOf(user)).toBe(0);
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
  expect(await flagOf(user)).toBe(0);

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
  await persistence.set(DIRTY_KEY, 1);
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
      if (sends === 2) throw new TypeError('Failed to fetch'); // no answer at all
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
  expect(await flagOf(user)).toBe(1);
  expect(await flagOf(user, 'page-gone')).toBe(1);
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

test('sign-out deletes the copies the server has and keeps the others', async () => {
  const user = nextUser();
  await typedCopy(user, 'will be sent');
  await typedCopy(user, 'cannot be sent', 'page-2');
  const server = fakeServer([PAGE, 'page-2']);
  const halfDown: IPageDocs = {
    read: async (pageId) => {
      if (pageId === 'page-2') throw new TypeError('Failed to fetch');
      return server.port.read(pageId);
    },
    send: server.port.send,
  };
  const kept = await clearSyncedCopies(halfDown, user, { pauseMs: 1 });
  expect(kept.map((r) => [r.pageId, r.result])).toEqual([['page-2', CopySync.Failed]]);
  expect((await localCopies(user)).map((c) => c.pageId)).toEqual(['page-2']);
  expect(textOf(server.docs.get(PAGE) ?? new Y.Doc())).toBe('will be sent');
});
