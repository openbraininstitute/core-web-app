import { NodeSelection } from '@tiptap/pm/state';

import type { JSONContent } from '@tiptap/core';
import type { Selection } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';

function afterBlockOf(selection: Selection, docSize: number): number {
  const { $from } = selection;
  if (selection instanceof NodeSelection && $from.depth === 0) return selection.to;
  return $from.depth >= 1 ? $from.after(1) : docSize;
}

export function insertAfterBlock(editor: Editor, content: JSONContent | JSONContent[]): number {
  const pos = afterBlockOf(editor.state.selection, editor.state.doc.content.size);
  editor.chain().insertContentAt(pos, content).focus().run();
  return pos;
}
