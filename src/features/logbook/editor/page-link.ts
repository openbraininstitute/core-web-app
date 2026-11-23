import { Extension } from '@tiptap/core';
import { Plugin, TextSelection } from '@tiptap/pm/state';
import { isNil } from 'es-toolkit';
import { match } from 'ts-pattern';

import { PAGE_QUERY_MAX } from '@/features/logbook/constants';
import { insertAfterBlock } from '@/features/logbook/editor/insert';
import { ListKey } from '@/features/logbook/types';

import type { ResolvedPos } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/react';
import type { IPage } from '@/api/logbook/types';
import type { IPageQuery, TListKey, TPageListKeys } from '@/features/logbook/types';

// `[[` then the start of a page name, right before the caret, in plain text.
const QUERY = new RegExp(`\\[\\[([^\\[\\]\\n\\ufffc]{0,${PAGE_QUERY_MAX}})$`);

/** In a code block or inline code, `[[` is code: no list, and no link put there. */
const inCode = (state: EditorState, $pos: ResolvedPos): boolean =>
  $pos.parent.type.spec.code === true ||
  (state.storedMarks ?? $pos.marks()).some((mark) => mark.type.spec.code === true);

/** The `[[name` being typed at the caret, or null: read from the state, so nothing to keep in sync. */
export function pageQueryAt(state: EditorState): IPageQuery | null {
  const { selection } = state;
  if (!(selection instanceof TextSelection) || !selection.empty) return null;
  const { $from } = selection;
  if (!$from.parent.isTextblock || inCode(state, $from)) return null;
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
    // -1 not found, 0 the name starts with it, 1 it is further in.
    return Math.sign(page.title.toLowerCase().indexOf(query));
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

/**
 * Insert > Link a page: types `[[` where the list can open. Text that is selected stays and the
 * caret goes after it; with a card selected, or in code, `[[` starts a new line after that block.
 */
export function startPageLink(editor: Editor): void {
  const { state } = editor;
  const { selection } = state;
  if (selection instanceof TextSelection && !inCode(state, selection.$to)) {
    editor.chain().focus().setTextSelection(selection.to).insertContent('[[').run();
    return;
  }
  const at = insertAfterBlock(editor, {
    type: 'paragraph',
    content: [{ type: 'text', text: '[[' }],
  });
  // Inside the new line (+1), after its two characters (+2).
  editor
    .chain()
    .focus()
    .setTextSelection(at + 3)
    .run();
}

/**
 * What a key does while the list is open; null leaves it to the text. A key with a modifier keeps
 * its usual meaning (Shift+Enter breaks the line, Shift+Tab outdents), and with nothing to choose
 * the arrows and Enter go back to the text.
 */
export function listKeyOf(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'metaKey' | 'ctrlKey' | 'altKey'>,
  count: number
): TListKey | null {
  if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return null;
  return match(event.key)
    .with('Escape', () => ListKey.Close)
    .when(
      () => count === 0,
      () => null
    )
    .with('ArrowDown', () => ListKey.Down)
    .with('ArrowUp', () => ListKey.Up)
    .with('Enter', 'Tab', () => ListKey.Pick)
    .otherwise(() => null);
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
