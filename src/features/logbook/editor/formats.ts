import { getMarkRange, isiOS, isMacOS } from '@tiptap/core';
import { isNil } from 'es-toolkit';
import { match } from 'ts-pattern';

import { Align, Format, TextStyle } from '@/features/logbook/types';

import type { Editor } from '@tiptap/react';
import type {
  IFormat,
  IFormatState,
  ILinkEdit,
  ILinkTarget,
  TAlign,
  TFormat,
  TTextStyle,
} from '@/features/logbook/types';
import type { TIconName } from '@/ui/molecules/icon';

const TIPTAP_NAMES: Readonly<Record<TFormat, string>> = {
  [Format.Bold]: 'bold',
  [Format.Italic]: 'italic',
  [Format.Underline]: 'underline',
  [Format.Strike]: 'strike',
  [Format.Code]: 'code',
  [Format.Link]: 'link',
  [Format.BulletList]: 'bulletList',
  [Format.OrderedList]: 'orderedList',
  [Format.Quote]: 'blockquote',
  [Format.CodeBlock]: 'codeBlock',
};
export const isFormatActive = (editor: Editor, format: TFormat): boolean =>
  editor.isActive(TIPTAP_NAMES[format]);

const isApple = (): boolean => typeof navigator !== 'undefined' && (isMacOS() || isiOS());
const keysOf = (keys: string): string => {
  const mac = isApple();
  return keys
    .replace('Mod', mac ? '⌘' : 'Ctrl')
    .replace('Shift', mac ? '⇧' : 'Shift')
    .replaceAll('-', mac ? '' : '+');
};
export const titleOf = (format: { label: string; keys: string | null }): string =>
  isNil(format.keys) ? format.label : `${format.label} (${keysOf(format.keys)})`;

/** What a link edit works on: the selection, or the whole link the cursor is in. */
export function linkTargetOf(editor: Editor): ILinkTarget {
  const { state } = editor;
  const { from, to } = state.selection;
  const href: unknown = editor.getAttributes(TIPTAP_NAMES[Format.Link])['href'];
  const markType = state.schema.marks[TIPTAP_NAMES[Format.Link]];
  // getMarkRange gives void when the cursor is not in a link.
  const mark = isNil(markType) ? undefined : getMarkRange(state.doc.resolve(from), markType);
  const range = mark
    ? { from: Math.min(from, mark.from), to: Math.max(to, mark.to) }
    : { from, to };
  const $from = state.doc.resolve(range.from);
  let onlyText = $from.parent.isTextblock && $from.sameParent(state.doc.resolve(range.to));
  state.doc.nodesBetween(range.from, range.to, (node) => {
    if (node.isInline && !node.isText) onlyText = false;
  });
  return {
    ...range,
    text: state.doc.textBetween(range.from, range.to),
    href: typeof href === 'string' ? href : '',
    textEditable: onlyText,
  };
}

// `name:` then a digit is a host and port (localhost:3000); tel: and sms: may start with one.
const SCHEME = /^(?:[a-z][a-z\d+.-]*:(?!\d)|(?:tel|sms):)/i;

/** An address without a scheme ("example.org", "localhost:3000") is read as https. */
export const hrefOf = (url: string): string => {
  const trimmed = url.trim();
  return trimmed.length === 0 || SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
};

/** False for an address the link mark refuses (a `javascript:` one, say). */
export const canLink = (editor: Editor, href: string): boolean =>
  href.length > 0 && editor.can().setLink({ href });

/** Links the target as it is now; renamed text is replaced by plain linked text. */
export function saveLink(editor: Editor, target: ILinkTarget, edit: ILinkEdit): void {
  const text = edit.text.length > 0 ? edit.text : edit.href;
  const keep = target.from !== target.to && (!edit.renamed || !target.textEditable);
  const end = keep ? target.to : target.from + text.length;
  const chain = editor.chain().focus();
  if (!keep) chain.insertContentAt({ from: target.from, to: target.to }, { type: 'text', text });
  chain
    .setTextSelection({ from: target.from, to: end })
    .setLink({ href: edit.href })
    .setTextSelection(end)
    .run();
}

export const removeLink = (editor: Editor, target: ILinkTarget): void => {
  editor
    .chain()
    .focus()
    .setTextSelection({ from: target.from, to: target.to })
    .unsetLink()
    .setTextSelection(target.to)
    .run();
};

export const INLINE_FORMATS: readonly IFormat[] = [
  {
    key: Format.Bold,
    label: 'Bold',
    icon: 'bold',
    keys: 'Mod-b',
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  {
    key: Format.Italic,
    label: 'Italic',
    icon: 'italic',
    keys: 'Mod-i',
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    key: Format.Underline,
    label: 'Underline',
    icon: 'underline',
    keys: 'Mod-u',
    run: (e) => e.chain().focus().toggleUnderline().run(),
  },
  {
    key: Format.Strike,
    label: 'Strikethrough',
    icon: 'strike',
    keys: 'Mod-Shift-s',
    run: (e) => e.chain().focus().toggleStrike().run(),
  },
  {
    key: Format.Code,
    label: 'Inline code',
    icon: 'code',
    keys: 'Mod-e',
    run: (e) => e.chain().focus().toggleCode().run(),
  },
];

export const BLOCK_FORMATS: readonly IFormat[] = [
  {
    key: Format.BulletList,
    label: 'Bulleted list',
    icon: 'listBullet',
    keys: 'Mod-Shift-8',
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    key: Format.OrderedList,
    label: 'Numbered list',
    icon: 'listOrdered',
    keys: 'Mod-Shift-7',
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    key: Format.Quote,
    label: 'Quote',
    icon: 'quote',
    keys: 'Mod-Shift-b',
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    key: Format.CodeBlock,
    label: 'Code block',
    icon: 'codeBlock',
    keys: 'Mod-Alt-c',
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
];

export const TEXT_STYLES: readonly { readonly style: TTextStyle; readonly label: string }[] = [
  { style: TextStyle.Paragraph, label: 'Text' },
  { style: TextStyle.Heading1, label: 'Heading 1' },
  { style: TextStyle.Heading2, label: 'Heading 2' },
  { style: TextStyle.Heading3, label: 'Heading 3' },
];

const LEVELS = {
  [TextStyle.Heading1]: 1,
  [TextStyle.Heading2]: 2,
  [TextStyle.Heading3]: 3,
} as const;

export function textStyleOf(editor: Editor): TTextStyle {
  return match(editor)
    .when(
      (e) => e.isActive('heading', { level: 1 }),
      () => TextStyle.Heading1
    )
    .when(
      (e) => e.isActive('heading', { level: 2 }),
      () => TextStyle.Heading2
    )
    .when(
      (e) => e.isActive('heading', { level: 3 }),
      () => TextStyle.Heading3
    )
    .otherwise(() => TextStyle.Paragraph);
}

export function setTextStyle(editor: Editor, style: TTextStyle): void {
  const chain = editor.chain().focus();
  if (style === TextStyle.Paragraph) chain.setParagraph().run();
  else chain.setHeading({ level: LEVELS[style] }).run();
}

export const ALIGNMENTS: readonly {
  readonly align: TAlign;
  readonly label: string;
  readonly icon: TIconName;
  readonly keys: string;
}[] = [
  { align: Align.Left, label: 'Align left', icon: 'alignLeft', keys: 'Mod-Shift-l' },
  { align: Align.Center, label: 'Align centre', icon: 'alignCenter', keys: 'Mod-Shift-e' },
  { align: Align.Right, label: 'Align right', icon: 'alignRight', keys: 'Mod-Shift-r' },
  { align: Align.Justify, label: 'Justify', icon: 'alignJustify', keys: 'Mod-Shift-j' },
];

export function alignOf(editor: Editor): TAlign {
  return match(editor)
    .when(
      (e) => e.isActive({ textAlign: Align.Center }),
      () => Align.Center
    )
    .when(
      (e) => e.isActive({ textAlign: Align.Right }),
      () => Align.Right
    )
    .when(
      (e) => e.isActive({ textAlign: Align.Justify }),
      () => Align.Justify
    )
    .otherwise(() => Align.Left);
}

export function setAlign(editor: Editor, align: TAlign): void {
  const chain = editor.chain().focus();
  if (align === Align.Left) chain.unsetTextAlign().run();
  else chain.setTextAlign(align).run();
}

export const activeOf = (editor: Editor): Readonly<Record<TFormat, boolean>> => ({
  [Format.Bold]: isFormatActive(editor, Format.Bold),
  [Format.Italic]: isFormatActive(editor, Format.Italic),
  [Format.Underline]: isFormatActive(editor, Format.Underline),
  [Format.Strike]: isFormatActive(editor, Format.Strike),
  [Format.Code]: isFormatActive(editor, Format.Code),
  [Format.Link]: isFormatActive(editor, Format.Link),
  [Format.BulletList]: isFormatActive(editor, Format.BulletList),
  [Format.OrderedList]: isFormatActive(editor, Format.OrderedList),
  [Format.Quote]: isFormatActive(editor, Format.Quote),
  [Format.CodeBlock]: isFormatActive(editor, Format.CodeBlock),
});

export function formatStateOf(editor: Editor): IFormatState {
  const can = editor.can();
  return {
    active: activeOf(editor),
    style: textStyleOf(editor),
    align: alignOf(editor),
    canAlign: can.setTextAlign(Align.Center),
    canUndo: can.undo(),
    canRedo: can.redo(),
    canIndent: can.sinkListItem('listItem'),
    canOutdent: can.liftListItem('listItem'),
  };
}
