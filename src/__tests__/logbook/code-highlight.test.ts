import { Editor } from '@tiptap/core';
import { afterEach, expect, test } from 'vitest';

import { contentExtensions } from '@/features/logbook/blocks/extensions';
import {
  CodeHighlight,
  codeDecorations,
  codeHighlightKey,
} from '@/features/logbook/editor/extensions';

let editor: Editor | null = null;
afterEach(() => editor?.destroy());

const spans = (set: ReturnType<typeof codeDecorations> | undefined) =>
  (set?.find() ?? []).map((d) => [d.from, d.to]);

// The colours after any edit equal the colours worked out from scratch.
const expectFresh = (e: Editor) =>
  expect(spans(codeHighlightKey.getState(e.state))).toEqual(spans(codeDecorations(e.state.doc)));

test('code colours stay right through edits in and around a code block', () => {
  editor = new Editor({
    extensions: [...contentExtensions, CodeHighlight],
    content: {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'intro' }] },
        { type: 'codeBlock', content: [{ type: 'text', text: 'const rate = 12; // Hz' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'end' }] },
      ],
    },
  });
  expect(spans(codeHighlightKey.getState(editor.state)).length).toBeGreaterThan(0);
  editor.commands.insertContentAt(1, 'more '); // a paragraph above the code moves it
  expectFresh(editor);
  const inCode = editor.state.doc.child(0).nodeSize + 1;
  editor.commands.insertContentAt(inCode, 'let x = 1;\n'); // typing inside the code
  expectFresh(editor);
  editor.commands.setTextSelection(inCode + 2);
  editor.commands.setNode('paragraph'); // the code block becomes text: no colours left
  expect(spans(codeHighlightKey.getState(editor.state))).toEqual([]);
  expectFresh(editor);
});
