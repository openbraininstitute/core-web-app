// Only this tab's own (local) changes count toward the save status.
import { expect, test } from 'vitest';
import * as Y from 'yjs';

test('a change typed here is local; one applied from another client is not', () => {
  const here = new Y.Doc();
  const elsewhere = new Y.Doc();
  const seen: boolean[] = [];
  here.on('update', (_update: Uint8Array, _origin: unknown, _doc: Y.Doc, tr: Y.Transaction) =>
    seen.push(tr.local)
  );
  here.transact(() => here.getText('t').insert(0, 'typed here'));
  elsewhere.getText('t').insert(0, 'the same person, another tab');
  Y.applyUpdate(here, Y.encodeStateAsUpdate(elsewhere), 'provider');
  expect(seen).toEqual([true, false]);
});
