// Every insert lands after the top-level block the caret is in, never inside it.
import { NodeSelection } from '@tiptap/pm/state';

import type { JSONContent } from '@tiptap/core';
import type { Selection } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';

function afterBlockOf(selection: Selection, docSize: number): number {
  const { $from } = selection;
  // A selected top-level card sits at depth 0: it ends at the selection's end.
  if (selection instanceof NodeSelection && $from.depth === 0) return selection.to;
  return $from.depth >= 1 ? $from.after(1) : docSize;
}

// Returns where the first inserted block starts.
export function insertAfterBlock(editor: Editor, content: JSONContent | JSONContent[]): number {
  const pos = afterBlockOf(editor.state.selection, editor.state.doc.content.size);
  editor.chain().insertContentAt(pos, content).focus().run();
  return pos;
}
