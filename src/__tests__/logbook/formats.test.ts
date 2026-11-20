// Every tool of the format bar and the selection menu, run on the editor's real schema.
import { Collaboration } from '@tiptap/extension-collaboration';
import { Editor } from '@tiptap/react';
import { afterEach, expect, test, vi } from 'vitest';
import * as Y from 'yjs';

import { contentExtensions, FRAGMENT } from '@/features/logbook/blocks/extensions';
import {
  ALIGNMENTS,
  alignOf,
  BLOCK_FORMATS,
  Format,
  formatStateOf,
  INLINE_FORMATS,
  isFormatActive,
  setAlign,
  setTextStyle,
  TEXT_STYLES,
  textStyleOf,
} from '@/features/logbook/editor/formats';

let editor: Editor;
// The words of the first block are selected, as after a drag over them. (Not "select all": the
// editor keeps an empty paragraph after a last block that is not one.)
const open = (html: string): Editor => {
  editor = new Editor({
    extensions: [
      ...contentExtensions,
      Collaboration.configure({ document: new Y.Doc(), field: FRAGMENT }),
    ],
  });
  editor.commands.setContent(html);
  select(Object.assign(document.createElement('div'), { innerHTML: html }).textContent ?? '');
  return editor;
};
// Selects the first place these words are at; an empty text puts the caret at the start.
function select(words: string): void {
  let from = 1;
  editor.state.doc.descendants((node, pos) => {
    const at = node.isText ? (node.text ?? '').indexOf(words) : -1;
    if (at >= 0) from = pos + at;
    return at < 0;
  });
  editor.commands.setTextSelection({ from, to: from + words.length });
}
const firstType = (): string | undefined => editor.getJSON().content?.[0]?.type;
afterEach(() => {
  editor.destroy();
  vi.restoreAllMocks();
});

test('the selection gets bold, italic, underline, strikethrough and inline code, and loses them again', () => {
  open('<p>some words</p>');
  const marks = INLINE_FORMATS.filter((format) => format.key !== Format.Link);
  expect(marks.map((format) => format.key)).toEqual([
    Format.Bold,
    Format.Italic,
    Format.Underline,
    Format.Strike,
    Format.Code,
  ]);
  for (const format of marks) {
    format.run(editor);
    expect(isFormatActive(editor, format.key)).toBe(true);
    format.run(editor);
    expect(isFormatActive(editor, format.key)).toBe(false);
  }
});

test('a link is set from the address asked for, and removed with an empty one', () => {
  open('<p>some words</p>');
  const link = INLINE_FORMATS.find((format) => format.key === Format.Link);
  vi.spyOn(window, 'prompt').mockReturnValue('https://example.org');
  link?.run(editor);
  expect(editor.getAttributes('link')['href']).toBe('https://example.org');
  vi.spyOn(window, 'prompt').mockReturnValue('');
  link?.run(editor);
  expect(isFormatActive(editor, Format.Link)).toBe(false);
});

test('a paragraph becomes a bulleted list, a numbered list, a quote and a code block, and comes back', () => {
  const blocks = {
    [Format.BulletList]: 'bulletList',
    [Format.OrderedList]: 'orderedList',
    [Format.Quote]: 'blockquote',
    [Format.CodeBlock]: 'codeBlock',
  } as const;
  expect(BLOCK_FORMATS.map((format) => format.key)).toEqual(Object.keys(blocks));
  for (const format of BLOCK_FORMATS) {
    open('<p>one line</p>');
    format.run(editor);
    expect(firstType()).toBe(blocks[format.key as keyof typeof blocks]);
    expect(isFormatActive(editor, format.key)).toBe(true);
    format.run(editor);
    expect(firstType()).toBe('paragraph');
    editor.destroy();
  }
});

test('the text style sets the three heading levels and plain text', () => {
  open('<p>a title</p>');
  for (const { style } of [...TEXT_STYLES].reverse()) {
    setTextStyle(editor, style);
    expect(textStyleOf(editor)).toBe(style);
  }
  expect(firstType()).toBe('paragraph');
});

test('a paragraph aligns left, centre, right and justified', () => {
  open('<p>some words</p>');
  for (const { align } of ALIGNMENTS) {
    setAlign(editor, align);
    expect(alignOf(editor)).toBe(align);
  }
});

test('a list item goes under the one above with indent, and comes back with outdent', () => {
  open('<ul><li><p>first</p></li><li><p>second</p></li></ul>');
  select('second');
  expect(formatStateOf(editor)).toMatchObject({ canIndent: true, canOutdent: true });
  editor.chain().focus().sinkListItem('listItem').run();
  const items = (): number => editor.getJSON().content?.[0]?.content?.length ?? 0;
  expect(items()).toBe(1);
  editor.chain().focus().liftListItem('listItem').run();
  expect(items()).toBe(2);
});

test('undo takes a format back and redo applies it again', () => {
  open('<p>some words</p>');
  INLINE_FORMATS[0]?.run(editor);
  expect(formatStateOf(editor).canUndo).toBe(true);
  editor.commands.undo();
  expect(isFormatActive(editor, Format.Bold)).toBe(false);
  expect(formatStateOf(editor).canRedo).toBe(true);
  editor.commands.redo();
  expect(isFormatActive(editor, Format.Bold)).toBe(true);
});
