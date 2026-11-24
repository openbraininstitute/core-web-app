import { useEditorState } from '@tiptap/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';

import {
  ALIGNMENTS,
  BLOCK_FORMATS,
  formatStateOf,
  INLINE_FORMATS,
  setAlign,
  setTextStyle,
  TEXT_STYLES,
  titleOf,
} from '@/features/logbook/editor/formats';
import { LinkDialog } from '@/features/logbook/editor/link-dialog';
import { Format } from '@/features/logbook/types';
import { Icon } from '@/ui/molecules/icon';
import { cn } from '@/utils/css-class';

import type { Editor } from '@tiptap/react';
import type { IFormat, IFormatState, IToolProps, TTextStyle } from '@/features/logbook/types';

const styles: ReadonlySet<string> = new Set(TEXT_STYLES.map((s) => s.style));
const isTextStyle = (value: string): value is TTextStyle => styles.has(value);

const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-9';
const FADE = 'transition-[background-color,color] duration-[120ms] ease-[ease]';

export const TOOL_RULE = 'mx-1.5 h-5 w-px bg-rule';

export function Tool({ label, keys = null, icon, pressed, disabled, onRun }: IToolProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-grid size-8 cursor-pointer place-items-center rounded-lg border-0 bg-transparent text-neutral-4 enabled:hover:bg-fill-2 enabled:hover:text-primary-9 disabled:cursor-default disabled:opacity-35 aria-pressed:bg-fill-2 aria-pressed:text-primary-9',
        FOCUS,
        FADE
      )}
      aria-label={label}
      aria-pressed={pressed}
      title={titleOf({ label, keys })}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onRun}
    >
      <Icon name={icon} size={16} stroke={2.2} />
    </button>
  );
}

export function FormatTools({
  editor,
  formats,
  active,
  disabled,
}: {
  readonly editor: Editor;
  readonly formats: readonly IFormat[];
  readonly active: IFormatState['active'];
  readonly disabled: boolean;
}) {
  return formats.map((format) => (
    <Tool
      key={format.key}
      label={format.label}
      keys={format.keys}
      icon={format.icon}
      pressed={active[format.key]}
      disabled={disabled}
      onRun={() => format.run(editor)}
    />
  ));
}

export function TextStyleSelect({
  editor,
  style,
  disabled,
}: {
  readonly editor: Editor;
  readonly style: TTextStyle;
  readonly disabled: boolean;
}) {
  return (
    <select
      className={cn(
        'h-8 cursor-pointer rounded-lg border-0 bg-transparent px-2 text-[13px] font-semibold text-neutral-4 enabled:hover:bg-fill-2',
        FOCUS,
        FADE
      )}
      aria-label="Text style"
      value={style}
      disabled={disabled}
      onChange={(event) => {
        if (isTextStyle(event.target.value)) setTextStyle(editor, event.target.value);
      }}
    >
      {TEXT_STYLES.map(({ style: option, label }) => (
        <option key={option} value={option}>
          {label}
        </option>
      ))}
    </select>
  );
}

/**
 * The link button: it opens the link dialog on the selection or at the cursor. The dialog is
 * portalled to the body: inside the selection bubble it would hide with the bubble, which
 * hides as soon as the editor loses focus to the dialog's fields.
 */
export function LinkTool({
  editor,
  pressed,
  disabled,
}: {
  readonly editor: Editor;
  readonly pressed: boolean;
  readonly disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tool
        label="Link"
        icon="link"
        pressed={pressed}
        disabled={disabled}
        onRun={() => setOpen(true)}
      />
      {open
        ? createPortal(<LinkDialog editor={editor} onClose={() => setOpen(false)} />, document.body)
        : null}
    </>
  );
}

export function FormatBar({
  editor,
  disabled,
}: {
  readonly editor: Editor;
  readonly disabled: boolean;
}) {
  const state = useEditorState({ editor, selector: ({ editor: e }) => formatStateOf(e) });
  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-rule px-4 py-1.5 max-md:flex-nowrap max-md:overflow-x-auto max-md:px-2 max-md:py-1"
      role="toolbar"
      aria-label="Formatting"
    >
      <Tool
        label="Undo"
        keys="Mod-z"
        icon="undo"
        disabled={disabled || !state.canUndo}
        onRun={() => editor.chain().focus().undo().run()}
      />
      <Tool
        label="Redo"
        keys="Mod-Shift-z"
        icon="redo"
        disabled={disabled || !state.canRedo}
        onRun={() => editor.chain().focus().redo().run()}
      />
      <span className={TOOL_RULE} />
      <TextStyleSelect editor={editor} style={state.style} disabled={disabled} />
      <span className={TOOL_RULE} />
      <FormatTools
        editor={editor}
        formats={INLINE_FORMATS}
        active={state.active}
        disabled={disabled}
      />
      <LinkTool editor={editor} pressed={state.active[Format.Link]} disabled={disabled} />
      <span className={TOOL_RULE} />
      <FormatTools
        editor={editor}
        formats={BLOCK_FORMATS}
        active={state.active}
        disabled={disabled}
      />
      <span className={TOOL_RULE} />
      {ALIGNMENTS.map(({ align, label, icon, keys }) => (
        <Tool
          key={align}
          label={label}
          keys={keys}
          icon={icon}
          pressed={state.align === align}
          disabled={disabled || !state.canAlign}
          onRun={() => setAlign(editor, align)}
        />
      ))}
      <span className={TOOL_RULE} />
      <Tool
        label="Indent"
        keys="Tab"
        icon="indent"
        disabled={disabled || !state.canIndent}
        onRun={() => editor.chain().focus().sinkListItem('listItem').run()}
      />
      <Tool
        label="Outdent"
        keys="Shift-Tab"
        icon="outdent"
        disabled={disabled || !state.canOutdent}
        onRun={() => editor.chain().focus().liftListItem('listItem').run()}
      />
    </div>
  );
}
