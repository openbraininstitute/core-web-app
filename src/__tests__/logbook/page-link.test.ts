import { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { afterEach, expect, test } from 'vitest';

import { jsonToMarkdown, markdownToJson } from '@/__tests__/logbook/blocks/markdown';
import { PageKind } from '@/api/logbook/types';
import { contentExtensions } from '@/features/logbook/blocks/extensions';
import { insertPageLink, pageQueryAt, pagesMatching } from '@/features/logbook/editor/page-link';

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
