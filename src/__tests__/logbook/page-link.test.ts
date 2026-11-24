import { Editor } from '@tiptap/core';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { afterEach, expect, test } from 'vitest';

import { jsonToMarkdown, markdownToJson } from '@/__tests__/logbook/blocks/markdown';
import { PageKind } from '@/api/logbook/types';
import { contentExtensions } from '@/features/logbook/blocks/extensions';
import {
  insertPageLink,
  listKeyOf,
  pageQueryAt,
  pagesMatching,
  startPageLink,
} from '@/features/logbook/editor/page-link';
import { ListKey } from '@/features/logbook/types';

import type { JSONContent } from '@tiptap/core';
import type { IPage } from '@/api/logbook/types';

let editor: Editor | null = null;
afterEach(() => editor?.destroy());

const page = (id: string, title: string, position: number): IPage => ({
  id,
  researchId: 'log',
  kind: id === 'main' ? PageKind.Main : PageKind.Section,
  title,
  position,
  version: 1,
  editedAt: '2026-11-23T00:00:00Z',
  editedBy: null,
});
const PAGES = [
  page('main', 'Main', 0),
  page('c', 'Methods', 1),
  page('x', 'Raw results', 2),
  page('f', 'Results', 3),
];

const editorWith = (content: JSONContent[]): Editor => {
  editor = new Editor({ extensions: contentExtensions, content: { type: 'doc', content } });
  const end = editor.state.doc.content.size - 1;
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, end)));
  return editor;
};
const line = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});

test('`[[` and the start of a name at the caret open the list, with the name so far', () => {
  const e = editorWith([line('See [[res')]);
  expect(pageQueryAt(e.state)).toEqual({ from: 5, to: 10, text: 'res' });
  expect(pageQueryAt(editorWith([line('plain text')]).state)).toBeNull();
  expect(pageQueryAt(editorWith([line('closed [[done]]')]).state)).toBeNull();
});

test('in a code block, `[[` is code, not a link', () => {
  const e = editorWith([{ type: 'codeBlock', content: [{ type: 'text', text: 'a[[b' }] }]);
  expect(pageQueryAt(e.state)).toBeNull();
});

test('in inline code, `[[` is code too: no list, so no link lands inside the code span', () => {
  const e = editorWith([
    { type: 'paragraph', content: [{ type: 'text', text: 'arr[[0', marks: [{ type: 'code' }] }] },
  ]);
  expect(pageQueryAt(e.state)).toBeNull();
});

test('a key with a modifier keeps its meaning; with nothing to choose, arrows and Enter go back to the text', () => {
  const key = (k: string, extra: Partial<KeyboardEvent> = {}) =>
    ({
      key: k,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      ...extra,
    }) as KeyboardEvent;
  expect(listKeyOf(key('ArrowDown'), 2)).toBe(ListKey.Down);
  expect(listKeyOf(key('Enter'), 2)).toBe(ListKey.Pick);
  expect(listKeyOf(key('Enter', { shiftKey: true }), 2)).toBeNull();
  expect(listKeyOf(key('Tab', { shiftKey: true }), 2)).toBeNull();
  expect(listKeyOf(key('ArrowUp'), 0)).toBeNull();
  expect(listKeyOf(key('Enter'), 0)).toBeNull();
  expect(listKeyOf(key('Escape'), 0)).toBe(ListKey.Close);
});

test('Insert > Link a page never replaces a selected card or selected text, and never types into code', () => {
  const card = { type: 'entity', attrs: { label: 'CA1', type: 'circuit', entityId: 'c-1' } };
  const withCard = editorWith([line('one'), card]);
  const cardAt = withCard.state.doc.child(0).nodeSize;
  withCard.view.dispatch(
    withCard.state.tr.setSelection(NodeSelection.create(withCard.state.doc, cardAt))
  );
  startPageLink(withCard as never);
  const blocks: JSONContent[] = withCard.getJSON().content ?? [];
  // The card stays, and `[[` starts the line right after it.
  expect(blocks.slice(0, 3).map((b) => b.type)).toEqual(['paragraph', 'entity', 'paragraph']);
  expect(blocks[2]?.content?.[0]?.text).toBe('[[');
  expect(pageQueryAt(withCard.state)).toMatchObject({ text: '' });

  const withText = editorWith([line('keep this')]);
  withText.view.dispatch(
    withText.state.tr.setSelection(TextSelection.create(withText.state.doc, 1, 5))
  );
  startPageLink(withText as never);
  expect(withText.getText()).toBe('keep[[ this');
  expect(pageQueryAt(withText.state)).toMatchObject({ text: '' });

  const inCode = editorWith([{ type: 'codeBlock', content: [{ type: 'text', text: 'x = 1' }] }]);
  startPageLink(inCode as never);
  const after: JSONContent[] = inCode.getJSON().content ?? [];
  expect(after[0]?.content?.[0]?.text).toBe('x = 1');
  expect(after[1]?.content?.[0]?.text).toBe('[[');
  expect(pageQueryAt(inCode.state)).toMatchObject({ text: '' });
});

test('names that start with the query lead; the page being written is never offered', () => {
  expect(pagesMatching(PAGES, 'res', 'main').map((p) => p.id)).toEqual(['f', 'x']);
  expect(pagesMatching(PAGES, '', 'c').map((p) => p.id)).toEqual(['main', 'x', 'f']);
  expect(pagesMatching(PAGES, 'zzz', 'main')).toEqual([]);
});

test('picking a page puts the link where `[[name` was, then a space; three picks link C, X, F', () => {
  const e = editorWith([line('See [[me')]);
  for (const [at, target] of [PAGES[1], PAGES[2], PAGES[3]].entries()) {
    if (at > 0) e.commands.insertContent('[[');
    const query = pageQueryAt(e.state);
    expect(query).not.toBeNull();
    if (query && target) insertPageLink(e as never, query, target);
  }
  const nodes: JSONContent[] = e.getJSON().content?.[0]?.content ?? [];
  const links = nodes
    .filter((node) => node.type === 'pageLink')
    .map((node) => node.attrs?.['pageId']);
  expect(links).toEqual(['c', 'x', 'f']);
  // The chips sit between words; a query never runs back across a chip.
  e.commands.insertContent('and ');
  expect(pageQueryAt(e.state)).toBeNull();
});

test('the web writes and reads the same `:page[…]{id=…}` markdown as the server', () => {
  const doc: JSONContent = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Compare ' },
          { type: 'pageLink', attrs: { label: 'Runs [day 2]', pageId: 'c' } },
        ],
      },
    ],
  };
  const markdown = jsonToMarkdown(doc);
  expect(markdown).toBe('Compare :page[Runs [day 2\\]]{id=c}');
  expect(markdownToJson(markdown).content?.[0]?.content?.[1]).toMatchObject({
    type: 'pageLink',
    attrs: { label: 'Runs [day 2]', pageId: 'c' },
  });
});
