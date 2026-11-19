// Moving between the pages of a log inside the page itself (read mode), like chapters of a book:
// "Page 3 of 12" above the page, and the previous and next pages as two cards at its end, so a
// log reads straight through. Jumping anywhere is the left menu's job (PageOutline, the whole
// tree); both read the same pages list, so nothing here makes a request.
import { isNil } from 'es-toolkit';

import { cn } from '@/features/logbook/lib/utils';
import { Icon } from '@/features/logbook/ui/icons';

import type { IPage } from '@/api/logbook/types';

export interface INeighbours {
  readonly index: number; // the page's place in the list; -1 when it is not there (deleted)
  readonly previous: IPage | null;
  readonly next: IPage | null;
}

// The page before and after `pageId`, in the log's order.
export function neighboursOf(pages: readonly IPage[], pageId: string): INeighbours {
  const index = pages.findIndex((page) => page.id === pageId);
  if (index < 0) return { index, previous: null, next: null };
  return { index, previous: pages[index - 1] ?? null, next: pages[index + 1] ?? null };
}

export interface IPageNavProps {
  readonly pages: readonly IPage[];
  readonly page: IPage; // the page shown (it may have left the list: deleted)
  readonly onOpen: (page: IPage) => void;
}

// Above the page: where it sits in the log ("Page 3 of 12 · its title"). Nothing for a log of
// one page, or for a page no longer in the list.
export function PagePlace({ pages, page }: Omit<IPageNavProps, 'onOpen'>) {
  const { index } = neighboursOf(pages, page.id);
  if (pages.length <= 1 || index < 0) return null;
  return (
    <p className="mt-0 mb-4 text-[12.5px] text-neutral-4">
      Page {index + 1} of {pages.length}
      <span className="font-semibold text-primary-9"> · {page.title}</span>
    </p>
  );
}

// The end of the page: the previous and next pages, as two cards.
export function PageSteps({ pages, page, onOpen }: IPageNavProps) {
  const { previous, next } = neighboursOf(pages, page.id);
  if (isNil(previous) && isNil(next)) return null;
  const card =
    'flex min-w-0 flex-col gap-0.5 rounded-2xl border border-block-border bg-white px-4 py-3 text-left transition-colors hover:border-primary-4 hover:bg-soft';
  return (
    <nav
      className="mt-10 grid grid-cols-2 gap-3 border-t border-rule pt-6 max-sm:grid-cols-1"
      aria-label="Previous and next page"
    >
      {isNil(previous) ? (
        <span />
      ) : (
        <button type="button" className={card} onClick={() => onOpen(previous)}>
          <span className="flex items-center gap-1 text-[12px] text-neutral-4">
            <Icon name="arrowLeft" size={12} stroke={2.4} />
            Previous
          </span>
          <span className="truncate text-[14px] font-semibold text-primary-9">
            {previous.title}
          </span>
        </button>
      )}
      {isNil(next) ? null : (
        <button
          type="button"
          className={cn(card, 'items-end text-right')}
          onClick={() => onOpen(next)}
        >
          <span className="flex items-center gap-1 text-[12px] text-neutral-4">
            Next
            <Icon name="arrowRight" size={12} stroke={2.4} />
          </span>
          <span className="max-w-full truncate text-[14px] font-semibold text-primary-9">
            {next.title}
          </span>
        </button>
      )}
    </nav>
  );
}
