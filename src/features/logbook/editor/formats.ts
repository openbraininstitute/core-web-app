// The formatting commands of the editor, defined once and used by the toolbar (FormatBar) and the
// selection menu (SelectionMenu): command pattern, one table. Markdown holds every format here but
// alignment: an aligned block reads to agents as plain text (the alignment stays in the page; see
// TextAlign in @logbook/blocks). No colour or underline: markdown has no syntax for them either.
import { isNil } from 'es-toolkit';

import type { Editor } from '@tiptap/react';
import type { TValueOf } from '@/api/logbook/types';
import type { TIconName } from '@/features/logbook/ui/icons';

export const Format = {
  Bold: 'bold',
  Italic: 'italic',
  Strike: 'strike',
  Code: 'code',
  Link: 'link',
  BulletList: 'bullet-list',
  OrderedList: 'ordered-list',
  Quote: 'quote',
  CodeBlock: 'code-block',
} as const;
export type TFormat = TValueOf<typeof Format>;

// The Tiptap mark or node behind each format: what `editor.isActive` takes.
const TIPTAP_NAMES: Readonly<Record<TFormat, string>> = {
  [Format.Bold]: 'bold',
  [Format.Italic]: 'italic',
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

export interface IFormat {
  readonly key: TFormat;
  readonly label: string;
  readonly icon: TIconName;
  // The keyboard shortcut, as `Mod-b` (Tiptap's own); shown in the button's title.
  readonly keys: string | null;
  readonly run: (editor: Editor) => void;
}

const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
export const keysOf = (keys: string): string =>
  keys
    .replace('Mod', mac ? '⌘' : 'Ctrl')
    .replace('Shift', mac ? '⇧' : 'Shift')
    .replaceAll('-', mac ? '' : '+');
export const titleOf = (format: { label: string; keys: string | null }): string =>
  isNil(format.keys) ? format.label : `${format.label} (${keysOf(format.keys)})`;

// A link on the selection: asks for the address; an empty one removes the link. The Link
// extension refuses unsafe addresses (javascript: and the like) by itself.
function editLink(editor: Editor): void {
  const current: unknown = editor.getAttributes(TIPTAP_NAMES[Format.Link])['href'];
  const href = window.prompt('Link address', typeof current === 'string' ? current : 'https://');
  if (isNil(href)) return;
  const chain = editor.chain().focus().extendMarkRange(TIPTAP_NAMES[Format.Link]);
  if (href.trim().length === 0) chain.unsetLink().run();
  else chain.setLink({ href: href.trim() }).run();
}

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
  { key: Format.Link, label: 'Link', icon: 'link', keys: null, run: editLink },
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

// The text style of the block the selection starts in: a paragraph or a heading level.
export const TextStyle = {
  Paragraph: 'paragraph',
  Heading1: 'h1',
  Heading2: 'h2',
  Heading3: 'h3',
} as const;
export type TTextStyle = TValueOf<typeof TextStyle>;

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
  if (editor.isActive('heading', { level: 1 })) return TextStyle.Heading1;
  if (editor.isActive('heading', { level: 2 })) return TextStyle.Heading2;
  if (editor.isActive('heading', { level: 3 })) return TextStyle.Heading3;
  return TextStyle.Paragraph;
}

export function setTextStyle(editor: Editor, style: TTextStyle): void {
  const chain = editor.chain().focus();
  if (style === TextStyle.Paragraph) chain.setParagraph().run();
  else chain.setHeading({ level: LEVELS[style] }).run();
}

// Alignment of paragraphs and headings. Left is the default: choosing it removes the attribute.
export const Align = {
  Left: 'left',
  Center: 'center',
  Right: 'right',
  Justify: 'justify',
} as const;
export type TAlign = TValueOf<typeof Align>;

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
  if (editor.isActive({ textAlign: Align.Center })) return Align.Center;
  if (editor.isActive({ textAlign: Align.Right })) return Align.Right;
  if (editor.isActive({ textAlign: Align.Justify })) return Align.Justify;
  return Align.Left;
}

export function setAlign(editor: Editor, align: TAlign): void {
  const chain = editor.chain().focus();
  if (align === Align.Left) chain.unsetTextAlign().run();
  else chain.setTextAlign(align).run();
}

// What the buttons show, read once per editor change (useEditorState compares it, so a change
// that alters none of it renders nothing).
export interface IFormatState {
  readonly active: Readonly<Record<TFormat, boolean>>;
  readonly style: TTextStyle;
  readonly align: TAlign;
  // False in a block that cannot be aligned (a list item's paragraph can; a code block cannot).
  readonly canAlign: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canIndent: boolean;
  readonly canOutdent: boolean;
}

// Which formats the selection has: what the selection menu needs (no dry-run commands).
export const activeOf = (editor: Editor): Readonly<Record<TFormat, boolean>> => ({
  [Format.Bold]: isFormatActive(editor, Format.Bold),
  [Format.Italic]: isFormatActive(editor, Format.Italic),
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
