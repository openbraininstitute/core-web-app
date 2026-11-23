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
import { CardMenu, RenameField } from '@/features/logbook/board/rail';
import { DeletePageDialog } from '@/features/logbook/log/delete-page-dialog';
import { Icon } from '@/ui/molecules/icon';

import type { IPage } from '@/api/logbook/types';
import type { IPageOutlineProps } from '@/features/logbook/types';

const BRANCH =
  "group relative pb-1 pl-5 first:pt-2 first:before:h-[26px] before:pointer-events-none before:absolute before:top-0 before:left-0 before:h-[18px] before:w-4 before:rounded-bl-[12px] before:border-b-2 before:border-l-2 before:border-neutral-2 before:content-[''] after:pointer-events-none after:absolute after:top-0 after:bottom-0 after:left-0 after:border-l-2 after:border-neutral-2 after:content-[''] last:after:hidden";
const ROW =
  'flex h-9 w-full items-center gap-2 rounded-full border-0 bg-transparent pr-9 pl-3 text-left text-[13px] font-semibold text-primary-9 transition-colors duration-150 hover:bg-fill-pill-hover aria-[current=page]:bg-primary-0 aria-[current=page]:font-bold';
const DOTS =
  'absolute top-1.5 right-1 grid size-6 place-items-center rounded-full border-0 bg-transparent text-neutral-4 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-fill-2 data-[state=open]:opacity-100';
const FIELD = 'h-9 rounded-full px-3 text-[13px] font-semibold';
const ADD =
  'flex h-9 w-full items-center gap-2 rounded-full border border-primary-2 bg-primary-0 pl-3 text-left text-[13px] font-semibold text-primary-6 transition-colors duration-150 hover:bg-primary-1/50';

export function PageOutline(props: IPageOutlineProps) {
  const { project, logId, logName } = props;
  const pages = usePages(logId, project);
  const create = useCreateSection(logId, project);
  const rename = useRenamePage(logId, project);
  const remove = useDeleteSection(logId, project);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<IPage | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const list = pages.data ?? [];
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
      const main = list.find((p) => p.kind === PageKind.Main);
      if (current?.id === page.id && isNotNil(main)) props.onOpen(main);
    });

  return (
    <div ref={outline} className="-mt-2 mb-1 flex scroll-mb-2 flex-col">
      <ul className="m-0 ml-[22px] flex list-none flex-col p-0" aria-label={`Pages of ${logName}`}>
        {list.map((page) => {
          const isSection = page.kind === PageKind.Section;
          return (
            <li key={page.id} className={BRANCH}>
              {renaming === page.id ? (
                <RenameField
                  name={page.title}
                  label="Name of the page"
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
                    onDoubleClick={isSection ? () => setRenaming(page.id) : undefined}
                  >
                    <span className="flex flex-none text-neutral-4">
                      <Icon name={isSection ? 'page' : 'home'} size={14} />
                    </span>
                    <span className="min-w-0 truncate">{page.title}</span>
                  </button>
                  {isSection ? (
                    <CardMenu
                      name={page.title}
                      deleteLabel="Delete page"
                      onRename={() => setRenaming(page.id)}
                      onDelete={() => setDeleting(page)}
                    >
                      <button
                        type="button"
                        className={DOTS}
                        aria-label={`Actions for ${page.title}`}
                      >
                        <Icon name="dots" size={14} stroke={2.4} />
                      </button>
                    </CardMenu>
                  ) : null}
                </>
              )}
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
        <p className="m-0 pl-[42px] text-[12px] font-semibold text-destructive" role="alert">
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
