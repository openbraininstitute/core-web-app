// The open log's pages, under its card in the rail: the main page, then the sections in order.
// Each opens in the editor at its own address (and its own socket, LogView.tsx). A section can be
// renamed or deleted, and a new one is added at the end.
// - The list is the pages query (pages.ts), the same one the open log reads: one read serves both.
// - Writes go to the server as the person; a reader's write is refused there and the reason shows
//   under the list. Limit: the actions show to readers too. Upgrade: hide them when the server
//   says the person can only read.
// - No Move up or down: the server sets one page's position without renumbering the others, so a
//   move would be two calls that can half land and leave two sections on one position.
//   Limit: sections stay in the order they were added. Upgrade: a server move that renumbers the
//   sections in one transaction.
import { isNil, isNotNil } from 'es-toolkit';
import { useEffect, useRef, useState } from 'react';

import { PageKind } from '@/api/logbook/types';
import {
  pageToShow,
  useCreateSection,
  useDeleteSection,
  usePages,
  useRenamePage,
} from '@/features/logbook/api/pages';
import { CardMenu, RenameField } from '@/features/logbook/app/Rail';
import { DeletePageDialog } from '@/features/logbook/log/DeletePageDialog';
import { Icon } from '@/features/logbook/ui/icons';

import type { IPage } from '@/api/logbook/types';
import type { IProject } from '@/features/logbook/auth/session';

// The outline is a tree: a trunk comes down from the log's card, and each page (and the add
// button) hangs on it by a curved branch. Plain CSS borders on ::before (the branch: a left and a
// bottom border with a rounded corner, to the middle of the 36 px row) and ::after (the trunk on to
// the next item; the last item has none). No SVG, no measuring: the lines follow the rows.
// The first item sits 8 px lower, clear of the card; its branch is 8 px longer to reach it.
const BRANCH =
  "group relative pb-1 pl-5 first:pt-2 first:before:h-[26px] before:pointer-events-none before:absolute before:top-0 before:left-0 before:h-[18px] before:w-4 before:rounded-bl-[12px] before:border-b-2 before:border-l-2 before:border-[#cfd8e3] before:content-[''] after:pointer-events-none after:absolute after:top-0 after:bottom-0 after:left-0 after:border-l-2 after:border-[#cfd8e3] after:content-[''] last:after:hidden";
const ROW =
  'flex h-9 w-full items-center gap-2 rounded-full border-0 bg-transparent pr-9 pl-3 text-left text-[13px] font-semibold text-primary-9 transition-colors duration-150 hover:bg-fill-pill-hover aria-[current=page]:bg-[#e8f1fb] aria-[current=page]:font-bold';
const DOTS =
  'absolute top-1.5 right-1 grid size-6 place-items-center rounded-full border-0 bg-transparent text-neutral-4 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-fill-2 data-[open=true]:opacity-100';
const FIELD = 'h-9 rounded-full px-3 text-[13px] font-semibold';
const ADD =
  'flex h-9 w-full items-center gap-2 rounded-full border border-[#91caff] bg-[#f0f7ff] pl-3 text-left text-[13px] font-semibold text-blue transition-colors duration-150 hover:bg-[#e3f0ff]';

export interface IPageOutlineProps {
  readonly project: IProject;
  readonly logId: string;
  readonly logName: string;
  readonly pageId: string | null; // the page the address names; null: the main page
  // Opens a page; `edit` opens it in the editor (a section just added).
  readonly onOpen: (page: IPage, edit?: boolean) => void;
}

export function PageOutline(props: IPageOutlineProps) {
  const { project, logId, logName } = props;
  const pages = usePages(logId, project);
  const create = useCreateSection(logId, project);
  const rename = useRenamePage(logId, project);
  const remove = useDeleteSection(logId, project);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  // The add in progress: its idempotency key is made once, so trying the same add again after an
  // answer that got lost never makes two sections.
  const [adding, setAdding] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<IPage | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const list = pages.data ?? [];
  // The outline opens under the log's card, often past the bottom of a short rail (its scrollbar
  // only shows while scrolling on macOS): it scrolls itself into view once its pages are known,
  // and again when the log changes, so the pages show without a scroll.
  const outline = useRef<HTMLDivElement>(null);
  const shown = list.length > 0;
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs again on purpose when the log changes
  useEffect(() => {
    if (shown) outline.current?.scrollIntoView({ block: 'nearest' });
  }, [shown, logId]);
  if (list.length === 0) return null;
  const current = pageToShow(list, props.pageId);
  const fail = (error: unknown): void =>
    setFailed(error instanceof Error ? error.message : 'It did not work.');

  const add = (title: string, key: string): void => {
    setFailed(null);
    create
      .mutateAsync({ title, key })
      .then((page) => {
        setAdding(null);
        props.onOpen(page, true);
      })
      .catch(fail);
  };
  const saveTitle = (page: IPage, title: string): void => {
    setRenaming(null);
    setFailed(null);
    rename.mutateAsync({ page, title }).catch(fail);
  };
  const removeSection = (page: IPage): Promise<unknown> =>
    remove.mutateAsync(page.id).then(() => {
      // The person who deleted it goes to the main page; others on it keep it, read-only.
      const main = list.find((p) => p.kind === PageKind.Main);
      if (current?.id === page.id && isNotNil(main)) props.onOpen(main);
    });

  return (
    <div ref={outline} className="-mt-2 mb-1 flex scroll-mb-2 flex-col">
      {/* Pulled up by the list's gap, so the trunk starts at the card's edge. */}
      <ul className="m-0 ml-[22px] flex list-none flex-col p-0" aria-label={`Pages of ${logName}`}>
        {list.map((page) => {
          const isSection = page.kind === PageKind.Section;
          return (
            <li key={page.id} className={BRANCH}>
              {renaming === page.id ? (
                <RenameField
                  name={page.title}
                  label="Name of the section"
                  className={FIELD}
                  onSave={(title) => saveTitle(page, title)}
                  onCancel={() => setRenaming(null)}
                />
              ) : (
                <>
                  <button
                    type="button"
                    className={ROW}
                    aria-current={page.id === current?.id ? 'page' : undefined}
                    title={isSection ? page.title : 'The main page of the log'}
                    onClick={() => props.onOpen(page)}
                  >
                    <span className="flex flex-none text-neutral-4">
                      <Icon name={isSection ? 'page' : 'home'} size={14} />
                    </span>
                    <span className="min-w-0 truncate">{page.title}</span>
                  </button>
                  {isSection ? (
                    <button
                      type="button"
                      className={DOTS}
                      aria-label={`Actions for ${page.title}`}
                      aria-haspopup="menu"
                      aria-expanded={menuFor === page.id}
                      data-open={menuFor === page.id}
                      onClick={() => setMenuFor(menuFor === page.id ? null : page.id)}
                    >
                      <Icon name="dots" size={14} stroke={2.4} />
                    </button>
                  ) : null}
                </>
              )}
              {menuFor === page.id ? (
                <CardMenu
                  name={page.title}
                  deleteLabel="Delete section"
                  onRename={() => {
                    setMenuFor(null);
                    setRenaming(page.id);
                  }}
                  onDelete={() => {
                    setMenuFor(null);
                    setDeleting(page);
                  }}
                  onClose={() => setMenuFor(null)}
                />
              ) : null}
            </li>
          );
        })}
        <li className={BRANCH}>
          {isNil(adding) ? (
            <button
              type="button"
              className={ADD}
              onClick={() => {
                setFailed(null);
                setAdding(crypto.randomUUID());
              }}
            >
              <Icon name="plus" size={14} stroke={2.4} />
              Add a page
            </button>
          ) : (
            <RenameField
              name=""
              label="Name of the new page"
              placeholder="Page name, then Enter"
              className={FIELD}
              onSave={(title) => add(title, adding)}
              onCancel={() => setAdding(null)}
            />
          )}
        </li>
      </ul>
      {isNil(failed) ? null : (
        <p className="m-0 pl-[42px] text-[12px] font-semibold text-[#b42318]" role="alert">
          {failed}
        </p>
      )}
      {isNil(deleting) ? null : (
        <DeletePageDialog
          page={deleting}
          logName={logName}
          onDelete={() => removeSection(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
