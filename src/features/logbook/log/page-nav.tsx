// Reads the same pages list as the outline, so nothing here makes a request.
import { isNil } from 'es-toolkit';

import { Icon } from '@/ui/molecules/icon';
import { cn } from '@/utils/css-class';

import type { IPage } from '@/api/logbook/types';
import type { INeighbours, IPageNavProps } from '@/features/logbook/types';

export function neighboursOf(pages: readonly IPage[], pageId: string): INeighbours {
  const index = pages.findIndex((page) => page.id === pageId);
  if (index < 0) return { index, previous: null, next: null };
  return { index, previous: pages[index - 1] ?? null, next: pages[index + 1] ?? null };
}

// Nothing for a one-page log or a deleted page.
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
