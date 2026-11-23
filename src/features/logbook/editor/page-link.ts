import { Extension } from '@tiptap/core';
import { Plugin, TextSelection } from '@tiptap/pm/state';
import { isNil } from 'es-toolkit';

import { PAGE_QUERY_MAX } from '@/features/logbook/constants';

import type { EditorState } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/react';
import type { IPage } from '@/api/logbook/types';
import type { IPageQuery, TPageListKeys } from '@/features/logbook/types';

// `[[` then the start of a page name, right before the caret, in plain text.
const QUERY = new RegExp(`\\[\\[([^\\[\\]\\n\\ufffc]{0,${PAGE_QUERY_MAX}})$`);

/** The `[[name` being typed at the caret, or null: read from the state, so nothing to keep in sync. */
export function pageQueryAt(state: EditorState): IPageQuery | null {
  const { selection } = state;
  if (!(selection instanceof TextSelection) || !selection.empty) return null;
  const { $from } = selection;
  if (!$from.parent.isTextblock || $from.parent.type.spec.code === true) return null;
  const start = Math.max(0, $from.parentOffset - PAGE_QUERY_MAX - 2);
  // An inline node reads as U+FFFC, so a query never runs across a chip.
  const before = $from.parent.textBetween(start, $from.parentOffset, undefined, '￼');
  const match = QUERY.exec(before);
  if (isNil(match)) return null;
  return { from: $from.pos - match[0].length, to: $from.pos, text: match[1] ?? '' };
}

/** Pages whose name holds the query, the closest first: names that start with it lead. */
export function pagesMatching(pages: readonly IPage[], text: string, except: string): IPage[] {
  const query = text.trim().toLowerCase();
  const rank = (page: IPage): number => {
    const at = page.title.toLowerCase().indexOf(query);
    return at < 0 ? -1 : at === 0 ? 0 : 1;
  };
  return pages
    .filter((page) => page.id !== except && rank(page) >= 0)
    .sort((a, b) => rank(a) - rank(b) || a.position - b.position);
}

/** Puts a link to `page` where `[[name` was typed, with a space after it to keep writing. */
export function insertPageLink(editor: Editor, query: IPageQuery, page: IPage): void {
  editor
    .chain()
    .focus()
    .insertContentAt({ from: query.from, to: query.to }, [
      { type: 'pageLink', attrs: { pageId: page.id, label: page.title } },
      { type: 'text', text: ' ' },
    ])
    .run();
}

// The open page list's key handler, per editor view. A WeakMap: a closed editor leaves nothing.
const listKeys = new WeakMap<EditorView, TPageListKeys>();

/** Gives the keys to the page list while it is open; null hands them back to the text. */
export function setPageListKeys(view: EditorView, onKey: TPageListKeys | null): void {
  if (isNil(onKey)) listKeys.delete(view);
  else listKeys.set(view, onKey);
}

/** While the page list is open, its arrows, Enter and Escape go to the list, not the text. */
export const PageLinkKeys = Extension.create({
  name: 'pageLinkKeys',
  // Before the lists' and paragraphs' own Enter, or Enter would split the line instead of linking.
  priority: 1000,
  addProseMirrorPlugins: () => [
    new Plugin({ props: { handleKeyDown: (view, event) => listKeys.get(view)?.(event) ?? false } }),
  ],
});
