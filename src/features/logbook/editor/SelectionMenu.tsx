// The menu over selected text (Tiptap's BubbleMenu, placed by Floating UI): the inline formats and
// a heading toggle, where the pointer already is.
import { TextSelection } from '@tiptap/pm/state';
import { useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';

import { FormatTools, TOOL_RULE, Tool } from '@/features/logbook/editor/FormatBar';
import {
  activeOf,
  Format,
  INLINE_FORMATS,
  isFormatActive,
  setTextStyle,
  TextStyle,
  textStyleOf,
} from '@/features/logbook/editor/formats';

import type { EditorState } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';

const OPTIONS = { placement: 'top', offset: 8 } as const;

// Text with characters in it, in an editable editor, outside code: not a caret, not a selected
// block (an entity or a figure), not a code block.
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
      className="z-30 flex items-center gap-0.5 rounded-xl bg-white p-1 shadow-[0_6px_24px_rgba(0,39,102,0.16),0_0_0_1px_rgba(0,39,102,0.06)]"
      role="toolbar"
      aria-label="Format the selection"
    >
      <FormatTools
        editor={editor}
        formats={INLINE_FORMATS}
        active={state.active}
        disabled={false}
      />
      <span className={TOOL_RULE} />
      <Tool
        label="Heading"
        icon="heading"
        pressed={state.style !== TextStyle.Paragraph}
        disabled={false}
        onRun={() =>
          setTextStyle(
            editor,
            state.style === TextStyle.Paragraph ? TextStyle.Heading2 : TextStyle.Paragraph
          )
        }
      />
    </BubbleMenu>
  );
}
