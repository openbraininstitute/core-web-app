'use client';

import { listBox } from '@/features/learn/ui/category-tiles';
import { PlayChip } from '@/features/learn/ui/play-chip';
import { ShareChip } from '@/features/learn/ui/share';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { FeedItem } from '@/features/learn/feed-item';

/** Where a section's entries come from: named, linked, and credited on every card. */
export type FeedSource = { name: string; href: string; note: string };

/** The left-hand side of an outside section: its entries in the faint box, with filters above. */
export function FeedIndex({
  items,
  selected,
  onSelect,
  filters,
  empty,
}: {
  items: FeedItem[];
  selected?: FeedItem;
  onSelect: (id: string) => void;
  filters?: ReactNode;
  /** What to say when there is nothing: still loading, or the source could not be reached. */
  empty: string;
}) {
  const lb = listBox();
  return (
    <div className={lb.box}>
      {filters}
      {items.length === 0 ? (
        <p className="px-[4px] py-[20px] text-center text-[13px] text-[#8c8c8c]">{empty}</p>
      ) : (
        <ul className="secondary-scrollbar -mr-[6px] flex min-h-0 flex-col gap-[9px] overflow-y-auto pr-[6px]">
          {items.map((item) => {
            const on = item.id === selected?.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  data-learn="row"
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    'group relative flex w-full items-center gap-[12px] rounded-[12px] p-[12px] pr-[84px] text-left transition-shadow',
                    on
                      ? 'bg-[#bae7ff] shadow-[inset_0_0_0_1.5px_#003a8c]'
                      : 'bg-white shadow-[inset_0_0_0_1px_#f0f0f0] hover:shadow-[inset_0_0_0_1px_#d9d9d9]'
                  )}
                >
                  {item.image && (
                    // biome-ignore lint/performance/noImgElement: the source's own picture, on its own host
                    <img
                      src={item.image}
                      alt=""
                      loading="lazy"
                      className="h-[58px] w-[96px] shrink-0 rounded-[8px] object-cover"
                    />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
                    <span className="line-clamp-2 text-[14px] leading-[19px] font-semibold text-[#002766]">
                      {item.title}
                    </span>
                    {item.byline && (
                      <span className="truncate text-[12px] leading-[16px] text-[#595959]">
                        {item.byline}
                      </span>
                    )}
                    {(item.when || item.where) && (
                      <span className="truncate text-[11px] leading-[15px] text-[#8c8c8c]">
                        {[item.when, item.where].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                  {/* sharing it, and going to it at its source: top right, as on the courses' cards;
                      the way there shown on the chosen one, and on the one pointed at */}
                  <ShareChip
                    what={{ title: item.title, text: item.byline, path: item.href }}
                    className="absolute top-[8px] right-[42px] opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
                  />
                  <PlayChip
                    external
                    title={item.title}
                    href={item.href}
                    className={cn(
                      'absolute top-[8px] right-[8px] transition-opacity',
                      on
                        ? 'opacity-100'
                        : 'opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100'
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** The right-hand side: the chosen entry, what it is, and a way to it at its source. */
export function FeedCard({
  item,
  source,
  empty,
  className,
}: {
  item?: FeedItem;
  source: FeedSource;
  empty: string;
  className?: string;
}) {
  if (!item)
    return (
      <section
        className={cn(
          className,
          'flex items-center justify-center p-10 text-[15px] text-[#8c8c8c]'
        )}
      >
        {empty}
      </section>
    );
  return (
    <section className={cn(className, 'pt-0 pr-[44px] pb-[34px] pl-[40px]')}>
      <div className="flex max-w-[820px] flex-col gap-[20px]">
        <header
          data-learn="head"
          className="flex min-h-[84px] items-center justify-between gap-[20px]"
        >
          <div className="flex min-w-0 flex-col gap-[7px] py-[14px]">
            <h1 className="text-[26px] leading-[33px] font-bold text-[#002766]">{item.title}</h1>
            <p className="text-[12.5px] leading-[17px] text-[#8c8c8c]">
              {[item.byline, item.when, item.where].filter(Boolean).join(' · ')}
            </p>
          </div>
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[42px] shrink-0 items-center rounded-[22px] bg-[#389e0d] px-[24px] text-[14px] leading-[19px] font-semibold whitespace-nowrap text-white transition-colors hover:bg-[#237804]"
          >
            {item.hrefLabel} ↗
          </a>
        </header>

        {item.image && (
          // biome-ignore lint/performance/noImgElement: the source's own picture, on its own host
          <img
            src={item.image}
            alt=""
            className="max-h-[280px] w-full rounded-[12px] object-cover"
          />
        )}

        {item.tags?.length ? (
          <div className="flex flex-wrap gap-[6px]">
            {item.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-[#f0f5ff] px-[10px] py-[3px] text-[11.5px] leading-[16px] font-semibold text-[#003a8c]"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}

        {item.body ? (
          <p className="text-[15px] leading-[25px] whitespace-pre-line text-[#595959]">
            {item.body}
          </p>
        ) : null}

        {/* the source, credited */}
        <p className="rounded-[12px] border border-[#f0f0f0] bg-[#fafafa] px-[16px] py-[12px] text-[12.5px] leading-[19px] text-[#8c8c8c]">
          {source.note}{' '}
          <a
            href={source.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#003a8c] hover:underline"
          >
            {source.name} ↗
          </a>
        </p>
      </div>
    </section>
  );
}
