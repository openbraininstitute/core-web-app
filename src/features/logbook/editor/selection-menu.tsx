import { TextSelection } from '@tiptap/pm/state';
import { useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';

import { FormatTools, TextStyleSelect, TOOL_RULE } from '@/features/logbook/editor/format-bar';
import {
  activeOf,
  BLOCK_FORMATS,
  Format,
  INLINE_FORMATS,
  isFormatActive,
  textStyleOf,
} from '@/features/logbook/editor/formats';

import type { EditorState } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';

const OPTIONS = { placement: 'top', offset: 8 } as const;

// Real text selected in an editable editor: not a caret, a selected block or code.
const shows = ({ editor, state }: { readonly editor: Editor; readonly state: EditorState }) => {
  const { selection, doc } = state;
  return (
    editor.isEditable &&
    selection instanceof TextSelection &&
    doc.textBetween(selection.from, selection.to).trim().length > 0 &&
    !isFormatActive(editor, Format.CodeBlock)
  );
};

export function SelectionMenu({ editor }: { readonly editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({ active: activeOf(e), style: textStyleOf(e) }),
  });
  return (
    <BubbleMenu
      editor={editor}
      options={OPTIONS}
      shouldShow={shows}
      className="z-30 flex max-w-[calc(100vw-16px)] items-center gap-0.5 overflow-x-auto rounded-xl bg-white p-1 shadow-[0_6px_24px_rgba(0,39,102,0.16),0_0_0_1px_rgba(0,39,102,0.06)]"
      role="toolbar"
      aria-label="Format the selection"
    >
      <TextStyleSelect editor={editor} style={state.style} disabled={false} />
      <span className={TOOL_RULE} />
      <FormatTools
        editor={editor}
        formats={INLINE_FORMATS}
        active={state.active}
        disabled={false}
      />
      <span className={TOOL_RULE} />
      <FormatTools editor={editor} formats={BLOCK_FORMATS} active={state.active} disabled={false} />
    </BubbleMenu>
  );
}
