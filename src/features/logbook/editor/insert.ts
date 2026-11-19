// Every insert lands after the top-level block the caret is in, never inside it.
import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';

// Returns the position the content went in at: the first inserted block starts there.
export function insertAfterBlock(editor: Editor, content: JSONContent | JSONContent[]): number {
  const { $from } = editor.state.selection;
  const pos = $from.depth >= 1 ? $from.after(1) : editor.state.doc.content.size;
  editor.chain().insertContentAt(pos, content).focus().run();
  return pos;
}
