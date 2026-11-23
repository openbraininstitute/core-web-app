import { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { afterEach, expect, test } from 'vitest';

import { contentExtensions } from '@/features/logbook/blocks/extensions';
import { insertAfterBlock } from '@/features/logbook/editor/insert';

let editor: Editor | null = null;
afterEach(() => editor?.destroy());

const typesOf = (e: Editor): string[] =>
  (e.getJSON().content ?? []).map((block) => block.type ?? '');

test('with a card selected, the insert lands right after the card', () => {
  editor = new Editor({
    extensions: contentExtensions,
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'one' }] },
        { type: 'entity', attrs: { label: 'CA1', type: 'circuit', entityId: 'c-1' } },
        { type: 'paragraph', content: [{ type: 'text', text: 'two' }] },
      ],
    },
  });
  const cardAt = editor.state.doc.child(0).nodeSize;
  editor.view.dispatch(
    editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, cardAt))
  );
  insertAfterBlock(editor as never, { type: 'horizontalRule' });
  expect(typesOf(editor)).toEqual(['paragraph', 'entity', 'horizontalRule', 'paragraph']);
});
