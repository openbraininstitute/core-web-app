'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { listBox } from '@/features/learn/ui/category-tiles';
import { cn } from '@/utils/css-class';

import type { TTutorial } from '@/ui/segments/project/get-started/query';

/*
 * Tutorials in Learn: the same videos as the project home page's Tutorials (from Sanity), listed
 * on the left by category and played on the right.
 */

const OTHER = 'Other';
const categoryOf = (t: TTutorial) => t.category?.trim() || OTHER;
/** Sanity's titles come in mixed case; the home page shows them in sentence case too. */
const sentence = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path
        d="M5.5 3.8v8.4a.6.6 0 0 0 .92.5l6.5-4.2a.6.6 0 0 0 0-1L6.42 3.3a.6.6 0 0 0-.92.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function Poster({ src, className }: { src: string | null; className?: string }) {
  return (
    <span className={cn('relative block overflow-hidden bg-[#002766]', className)}>
      {src ? (
        <Image src={src} alt="" fill sizes="200px" className="object-cover" />
      ) : (
        <PlayIcon className="absolute inset-0 m-auto size-[18px] text-white/70" />
      )}
    </span>
  );
}

/** The left-hand side: the tutorials in the faint box, filterable by category. */
export function TutorialsIndex({
  tutorials,
  selected,
  onSelect,
}: {
  /** Which of PAGE_LOOKS the page is in. */
  tutorials: TTutorial[];
  selected?: TTutorial;
  onSelect: (slug: string) => void;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const categories = useMemo(
    () =>
      [...new Set(tutorials.map(categoryOf))].sort((a, b) =>
        a === OTHER ? 1 : b === OTHER ? -1 : a.localeCompare(b)
      ),
    [tutorials]
  );
  const shown = tutorials.filter((t) => !category || categoryOf(t) === category);

  const lb = listBox();
  const chip = lb.chip;

  return (
    <div className={lb.box}>
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-[6px]">
          <button type="button" className={chip(!category)} onClick={() => setCategory(null)}>
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={chip(category === c)}
              aria-pressed={category === c}
              onClick={() => setCategory(category === c ? null : c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {tutorials.length === 0 ? (
        <p className="px-[4px] py-[20px] text-center text-[13px] text-[#8c8c8c]">
          No tutorials could be loaded.
        </p>
      ) : (
        <ul className="secondary-scrollbar -mr-[6px] flex min-h-0 flex-col gap-[9px] overflow-y-auto pr-[6px]">
          {shown.map((t) => {
            const on = t.slug === selected?.slug;
            return (
              <li key={t.slug}>
                <button
                  type="button"
                  aria-pressed={on}
                  data-learn="row"
                  onClick={() => onSelect(t.slug)}
                  className={cn(
                    'flex w-full items-center gap-[12px] rounded-[12px] p-[10px] text-left transition-shadow',
                    on
                      ? 'bg-[#bae7ff] shadow-[inset_0_0_0_1.5px_#003a8c]'
                      : 'bg-white shadow-[inset_0_0_0_1px_#f0f0f0] hover:shadow-[inset_0_0_0_1px_#d9d9d9]'
                  )}
                >
                  <span className="relative shrink-0">
                    <Poster src={t.posterImage} className="h-[58px] w-[103px] rounded-[8px]" />
                    <span className="absolute inset-0 m-auto flex size-[24px] items-center justify-center rounded-full bg-white/90 text-[#002766] shadow">
                      <PlayIcon className="ml-px size-[12px]" />
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
                    <span className="line-clamp-2 text-[14px] leading-[19px] font-semibold text-[#002766]">
                      {sentence(t.title)}
                    </span>
                    <span className="self-start rounded-[4px] bg-[#fafafa] px-[7px] py-[2px] text-[10px] leading-[14px] font-semibold tracking-[0.3px] text-[#595959] uppercase shadow-[inset_0_0_0_1px_#f0f0f0]">
                      {categoryOf(t)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** The right-hand side: the chosen tutorial, ready to play. */
export function TutorialCard({
  tutorial,
  tutorials,
  onSelect,
  project,
  className,
}: {
  tutorial?: TTutorial;
  tutorials: TTutorial[];
  onSelect: (slug: string) => void;
  /** The project's root, for the link to the same video on the home page. */
  project: string;
  className?: string;
}) {
  if (!tutorial) {
    return (
      <section
        className={cn(
          className,
          'flex items-center justify-center p-10 text-[15px] text-[#8c8c8c]'
        )}
      >
        No tutorials to show yet.
      </section>
    );
  }
  const index = tutorials.findIndex((t) => t.slug === tutorial.slug);
  const prev = tutorials[(index - 1 + tutorials.length) % tutorials.length];
  const next = tutorials[(index + 1) % tutorials.length];
  const step =
    'flex h-[34px] items-center gap-[6px] rounded-full border border-[#e8e8e8] px-[14px] text-[12px] font-semibold text-[#003a8c] hover:border-[#d9d9d9] hover:bg-[#f5f9ff]';

  return (
    <section className={cn(className, 'pt-0 pr-[44px] pb-[34px] pl-[40px]')}>
      <div className="flex max-w-[960px] flex-col gap-[20px]">
        {/* level with the middle of the category tiles, as a course's title is */}
        <header
          data-learn="head"
          className="flex min-h-[84px] items-center justify-between gap-[20px]"
        >
          <div className="flex min-w-0 flex-col gap-[7px]">
            <h1 className="text-[31px] leading-[38px] font-bold text-[#002766]">
              {sentence(tutorial.title)}
            </h1>
            <p className="text-[12.5px] leading-[17px] text-[#8c8c8c]">
              Video tutorial · {categoryOf(tutorial)} · {index + 1} of {tutorials.length}
            </p>
          </div>
          {tutorials.length > 1 && (
            <div className="flex shrink-0 gap-[6px]">
              <button
                type="button"
                className={step}
                onClick={() => onSelect(prev.slug)}
                title={prev.title}
              >
                ‹ Previous
              </button>
              <button
                type="button"
                className={step}
                onClick={() => onSelect(next.slug)}
                title={next.title}
              >
                Next ›
              </button>
            </div>
          )}
        </header>

        {/* framed like a course's figure; not autoplaying, since the section opens on one */}
        <div className="overflow-hidden rounded-[12px] border border-[#d9d9d9] bg-[#002766]">
          <video
            key={tutorial.slug}
            controls
            playsInline
            preload="metadata"
            poster={tutorial.posterImage ?? undefined}
            src={tutorial.url}
            className="aspect-video w-full object-contain"
          >
            <track kind="captions" srcLang="en" label="English captions" />
          </video>
        </div>

        <Link
          href={`${project}/tutorials/${tutorial.slug}`}
          className="self-start text-[13px] font-semibold text-[#003a8c] hover:underline"
        >
          Open on the home page →
        </Link>
      </div>
    </section>
  );
}
