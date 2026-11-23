import { useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { isNil } from 'es-toolkit';
import { useEffect, useState } from 'react';
import { match } from 'ts-pattern';

import { PageKind } from '@/api/logbook/types';
import { usePages } from '@/features/logbook/api/pages';
import { PAGE_LINK_LIST_MAX } from '@/features/logbook/constants';
import {
  insertPageLink,
  pageQueryAt,
  pagesMatching,
  setPageListKeys,
} from '@/features/logbook/editor/page-link';
import { useLogContext } from '@/features/logbook/log/context';
import { Icon } from '@/ui/molecules/icon';

import type { EditorState } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import type { IPage } from '@/api/logbook/types';
import type { IPageQuery } from '@/features/logbook/types';

const OPTIONS = { placement: 'bottom-start', offset: 6 } as const;
const ITEM =
  'flex w-full items-center gap-2 rounded-lg border-0 bg-transparent px-2 py-1.5 text-left text-[13.5px] font-semibold text-primary-9 aria-selected:bg-primary-0';

const sameQuery = (a: IPageQuery | null, b: IPageQuery | null): boolean =>
  a?.from === b?.from && a?.to === b?.to && a?.text === b?.text;

/** The pages to link, at the caret while `[[name` is typed; arrows move, Enter links, Esc closes. */
export function PageLinkMenu({
  editor,
  pageId,
}: {
  readonly editor: Editor;
  readonly pageId: string;
}) {
  const { project, logId } = useLogContext();
  const pages = usePages(logId, project).data ?? [];
  const query = useEditorState({
    editor,
    selector: ({ editor: e }) => pageQueryAt(e.state),
    equalityFn: sameQuery,
  });
  // Esc closes the list for this `[[` only; a new `[[` elsewhere opens it again.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState<IPageQuery | null>(null);
  if (!sameQuery(seen, query)) {
    setSeen(query);
    setActive(0);
    if (isNil(query)) setDismissedAt(null);
  }
  const open = editor.isEditable && !isNil(query) && query.from !== dismissedAt;
  const found = open ? pagesMatching(pages, query.text, pageId).slice(0, PAGE_LINK_LIST_MAX) : [];
  const pick = (page: IPage | undefined): boolean => {
    if (isNil(query) || isNil(page)) return false;
    insertPageLink(editor, query, page);
    return true;
  };

  // Re-registered each render, so the handler always sees the list on screen.
  useEffect(() => {
    if (!open) return;
    const view = editor.view;
    setPageListKeys(view, (event) =>
      match(event.key)
        .with('ArrowDown', () => {
          setActive((at) => (at + 1) % Math.max(found.length, 1));
          return true;
        })
        .with('ArrowUp', () => {
          setActive((at) => (at - 1 + found.length) % Math.max(found.length, 1));
          return true;
        })
        .with('Enter', 'Tab', () => pick(found[active]))
        .with('Escape', () => {
          setDismissedAt(query?.from ?? null);
          return true;
        })
        .otherwise(() => false)
    );
    return () => setPageListKeys(view, null);
  });

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="pageLinkMenu"
      options={OPTIONS}
      // The menu only checks this when the text or the caret moves, so Esc hides the list below.
      shouldShow={({ state }: { readonly state: EditorState }) =>
        editor.isEditable && !isNil(pageQueryAt(state))
      }
      className="z-30"
    >
      {open ? (
        <div className="flex w-[272px] max-w-[calc(100vw-16px)] flex-col rounded-xl bg-white p-1.5 shadow-[0_6px_24px_rgba(0,39,102,0.16),0_0_0_1px_rgba(0,39,102,0.06)]">
          <div className="px-2 pt-1 pb-1.5 text-[11px] font-bold tracking-[0.06em] text-neutral-4 uppercase">
            Link a page
          </div>
          <div role="listbox" aria-label="Pages of this log" className="flex flex-col">
            {found.length === 0 ? (
              <p className="m-0 px-2 py-1.5 text-[13px] text-neutral-4">
                {isNil(query) || query.text.trim() === ''
                  ? 'This log has no other page yet.'
                  : `No page named “${query.text.trim()}”`}
              </p>
            ) : (
              found.map((page, at) => (
                <button
                  key={page.id}
                  type="button"
                  role="option"
                  aria-selected={at === active}
                  className={ITEM}
                  // Keeps the caret in the text, so the link goes where `[[` was typed.
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(at)}
                  onClick={() => pick(page)}
                >
                  <span className="flex flex-none text-neutral-4">
                    <Icon name={page.kind === PageKind.Main ? 'home' : 'page'} size={14} />
                  </span>
                  <span className="min-w-0 truncate">{page.title}</span>
                </button>
              ))
            )}
          </div>
          <div className="mt-1 border-t border-rule-soft px-2 pt-1.5 pb-0.5 text-[11.5px] text-neutral-4">
            ↑ ↓ to choose · Enter to link · Esc to close
          </div>
        </div>
      ) : null}
    </BubbleMenu>
  );
}
