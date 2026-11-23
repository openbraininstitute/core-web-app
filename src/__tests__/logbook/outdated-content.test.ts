import { Editor } from '@tiptap/core';
import { Collaboration } from '@tiptap/extension-collaboration';
import { afterEach, expect, test } from 'vitest';
import * as Y from 'yjs';

import { contentExtensions } from '@/features/logbook/blocks/extensions';
import { CollaborationNotices } from '@/features/logbook/collaboration/notices';
import { FRAGMENT } from '@/features/logbook/constants';
import { previewExtensions } from '@/features/logbook/editor/extensions';

let editor: Editor | null = null;
afterEach(() => editor?.destroy());

// A page as a newer release writes it: a line, then a block this build has never heard of.
function pageWithFutureBlock(): Y.Doc {
  const doc = new Y.Doc();
  const line = new Y.XmlElement('paragraph');
  line.insert(0, [new Y.XmlText('known')]);
  const future = new Y.XmlElement('futureBlock');
  doc.getXmlFragment(FRAGMENT).insert(0, [line, future]);
  return doc;
}
const namesIn = (doc: Y.Doc): string[] =>
  doc
    .getXmlFragment(FRAGMENT)
    .toArray()
    .map((item) => (item instanceof Y.XmlElement ? item.nodeName : 'text'));

test('a block this build does not know is skipped, never deleted from the shared page', () => {
  const doc = pageWithFutureBlock();
  editor = new Editor({ extensions: previewExtensions(doc), editable: false });
  expect(editor.getText()).toContain('known');
  expect(namesIn(doc)).toEqual(['paragraph', 'futureBlock']);
});

test('without the guard, the sync deletes it: what an older tab did to new blocks', () => {
  const doc = pageWithFutureBlock();
  editor = new Editor({
    extensions: [...contentExtensions, Collaboration.configure({ document: doc, field: FRAGMENT })],
  });
  expect(namesIn(doc)).toEqual(['paragraph']);
});

test('the outdated state stays through a reconnect: only a reload loads the newer schema', () => {
  const notices = new CollaborationNotices();
  notices.outdated();
  notices.connected();
  expect(notices.snapshot().outdated).toBe(true);
});
