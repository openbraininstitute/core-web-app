import { Collaboration } from '@tiptap/extension-collaboration';
import { Editor } from '@tiptap/react';
import { afterEach, expect, test, vi } from 'vitest';
import * as Y from 'yjs';

import { contentExtensions } from '@/features/logbook/blocks/extensions';
import { FRAGMENT } from '@/features/logbook/constants';
import {
  ALIGNMENTS,
  alignOf,
  BLOCK_FORMATS,
  canLink,
  formatStateOf,
  hrefOf,
  INLINE_FORMATS,
  isFormatActive,
  linkTargetOf,
  removeLink,
  saveLink,
  setAlign,
  setTextStyle,
  TEXT_STYLES,
  textStyleOf,
} from '@/features/logbook/editor/formats';
import { Format } from '@/features/logbook/types';

let editor: Editor;
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
  const marks = INLINE_FORMATS;
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

test('a selected text gets a link and keeps its text and other marks', () => {
  open('<p>some <strong>bold</strong> words</p>');
  select('bold');
  const target = linkTargetOf(editor);
  expect(target).toMatchObject({ text: 'bold', href: '', textEditable: true });
  saveLink(editor, target, { text: 'bold', href: 'https://example.org', renamed: false });
  expect(editor.getHTML()).toContain(
    '<a target="_blank" rel="noopener noreferrer nofollow" href="https://example.org"><strong>bold</strong></a>'
  );
});

test('the selected text can be renamed while it is linked', () => {
  open('<p>see here please</p>');
  select('here');
  saveLink(editor, linkTargetOf(editor), {
    text: 'the docs',
    href: 'https://example.org',
    renamed: true,
  });
  expect(editor.state.doc.textContent).toBe('see the docs please');
  select('the docs');
  expect(editor.getAttributes('link')['href']).toBe('https://example.org');
  select('please');
  expect(isFormatActive(editor, Format.Link)).toBe(false);
});

test('with nothing selected a new named link goes in at the cursor, or the address when unnamed', () => {
  open('<p>ab</p>');
  editor.commands.setTextSelection(2);
  saveLink(editor, linkTargetOf(editor), {
    text: 'docs',
    href: 'https://example.org',
    renamed: true,
  });
  expect(editor.state.doc.textContent).toBe('adocsb');
  editor.commands.setTextSelection(1);
  saveLink(editor, linkTargetOf(editor), { text: '', href: 'https://x.org', renamed: false });
  expect(editor.state.doc.textContent).toBe('https://x.orgadocsb');
});

test('the cursor in a link edits the whole link, and remove takes it off', () => {
  open('<p>go <a href="https://old.org">to the site</a> now</p>');
  editor.commands.setTextSelection(8);
  const target = linkTargetOf(editor);
  expect(target).toMatchObject({ text: 'to the site', href: 'https://old.org' });
  saveLink(editor, target, { text: 'to the site', href: 'https://new.org', renamed: false });
  select('to the site');
  expect(editor.getAttributes('link')['href']).toBe('https://new.org');
  removeLink(editor, linkTargetOf(editor));
  select('to the site');
  expect(isFormatActive(editor, Format.Link)).toBe(false);
});

test('an edit made while the dialog is open moves the target with it', () => {
  open('<p>see here please</p>');
  select('here');
  const opened = linkTargetOf(editor);
  editor.commands.insertContentAt(1, 'Earlier text. ', { updateSelection: false });
  saveLink(editor, linkTargetOf(editor), {
    text: 'the docs',
    href: 'https://x.org',
    renamed: true,
  });
  expect(editor.state.doc.textContent).toBe('Earlier text. see the docs please');
  expect(opened.from).toBeLessThan(linkTargetOf(editor).from);
});

test('a selection across blocks or of the whole log keeps its text, so nothing is lost', () => {
  open('<p>one</p><p>two</p>');
  editor.commands.selectAll();
  expect(linkTargetOf(editor).textEditable).toBe(false);
  saveLink(editor, linkTargetOf(editor), { text: 'onetwo!', href: 'https://x.org', renamed: true });
  expect(editor.getJSON().content).toHaveLength(2);
  expect(editor.state.doc.textContent).toBe('onetwo');
});

test('an address without a scheme reads as https, and an unsafe one is refused', () => {
  open('<p>x</p>');
  expect(hrefOf(' example.org ')).toBe('https://example.org');
  expect(hrefOf('mailto:a@b.org')).toBe('mailto:a@b.org');
  expect(hrefOf('localhost:3000')).toBe('https://localhost:3000');
  expect(hrefOf('example.org:8080/x')).toBe('https://example.org:8080/x');
  expect(hrefOf('tel:123')).toBe('tel:123');
  expect(canLink(editor, hrefOf('localhost:3000'))).toBe(true);
  expect(canLink(editor, 'https://example.org')).toBe(true);
  expect(canLink(editor, 'javascript:alert(1)')).toBe(false);
  expect(canLink(editor, '')).toBe(false);
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
