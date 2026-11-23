import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { afterEach, beforeAll, expect, test } from 'vitest';

import { PageKind } from '@/api/logbook/types';
import { contentExtensions } from '@/features/logbook/blocks/extensions';
import { PageLinkKeys } from '@/features/logbook/editor/page-link';
import { PageLinkMenu } from '@/features/logbook/editor/page-link-menu';
import { EntityPickerContext, LogContext } from '@/features/logbook/log/context';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';

import type { JSONContent } from '@tiptap/core';
import type { IPage } from '@/api/logbook/types';

let editor: Editor | null = null;
afterEach(() => editor?.destroy());

// jsdom has no layout; the floating list asks where the caret is.
const NO_RECTS = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] });
beforeAll(() => {
  for (const proto of [Element.prototype, Range.prototype] as { getClientRects?: unknown }[])
    proto.getClientRects ??= NO_RECTS;
  Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});

const page = (id: string, title: string, position: number): IPage => ({
  id,
  researchId: 'log-1',
  kind: id === 'main' ? PageKind.Main : PageKind.Section,
  title,
  position,
  version: 1,
  editedAt: '2026-11-23T00:00:00Z',
  editedBy: null,
});

function openList(text: string): Editor {
  const e = new Editor({
    // In the page, as in the app: the floating list is placed next to the editor's element.
    element: document.body.appendChild(document.createElement('div')),
    extensions: [...contentExtensions, PageLinkKeys],
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] },
  });
  editor = e;
  const client = new QueryClient();
  client.setQueryData(keyBuilderLogbook.pages('log-1'), [
    page('main', 'Main', 0),
    page('x', 'Raw results', 1),
    page('f', 'Results', 2),
  ]);
  render(
    <QueryClientProvider client={client}>
      <LogContext.Provider
        value={{ project: { virtualLabId: 'l', projectId: 'p' }, logId: 'log-1' }}
      >
        <EntityPickerContext.Provider value={() => {}}>
          <PageLinkMenu editor={e as never} pageId="main" />
        </EntityPickerContext.Provider>
      </LogContext.Provider>
    </QueryClientProvider>
  );
  act(() => {
    e.view.dispatch(e.state.tr.setSelection(TextSelection.create(e.state.doc, text.length + 1)));
  });
  return e;
}
const press = (e: Editor, key: string, extra: Record<string, boolean> = {}) =>
  act(() => {
    fireEvent.keyDown(e.view.dom, { key, ...extra });
  });
const chosen = () => screen.getAllByRole('option').find((o) => o.ariaSelected === 'true');
const linksIn = (e: Editor) =>
  ((e.getJSON().content?.[0]?.content ?? []) as JSONContent[])
    .filter((node) => node.type === 'pageLink')
    .map((node) => node.attrs?.['pageId']);

test('arrows move through the list, Enter links the chosen page where `[[r` was', async () => {
  const e = openList('See [[r');
  await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
  expect(chosen()?.textContent).toBe('Raw results');
  press(e, 'ArrowDown');
  expect(chosen()?.textContent).toBe('Results');
  press(e, 'Enter');
  expect(linksIn(e)).toEqual(['f']);
  expect(e.getText()).not.toContain('[[');
});

test('Shift+Enter keeps its meaning while the list is open: a line break, no link', async () => {
  const e = openList('See [[r');
  await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
  press(e, 'Enter', { shiftKey: true });
  expect(linksIn(e)).toEqual([]);
  const kinds = (e.getJSON().content?.[0]?.content ?? []).map((node) => node.type);
  expect(kinds).toContain('hardBreak');
});

test('Esc closes the list and leaves the text as typed', async () => {
  const e = openList('See [[r');
  await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
  press(e, 'Escape');
  await waitFor(() => expect(screen.queryAllByRole('option')).toHaveLength(0));
  expect(e.getText()).toBe('See [[r');
});

test('with no page to offer, the arrows go back to the text', async () => {
  const e = openList('index x[[0');
  await waitFor(() => expect(screen.getByText(/No page named/)).toBeDefined());
  const handled = e.view.someProp('handleKeyDown', (handle) =>
    handle(e.view, new KeyboardEvent('keydown', { key: 'ArrowUp' }))
  );
  expect(handled).toBeFalsy();
});
