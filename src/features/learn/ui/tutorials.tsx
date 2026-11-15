'use client';

import { useMemo, useState } from 'react';

import YouTubePlayer from '@/components/documentation/tutorials/youtube-player';
import { listBox } from '@/features/learn/ui/category-tiles';
import { VideoCard } from '@/ui/segments/project/hex-home/video-card';
import { cn } from '@/utils/css-class';
import { parseYouTubeId } from '@/utils/youtube';

import type { TTutorial } from '@/ui/segments/project/get-started/query';

/*
 * Tutorials in Learn: the same videos as the project home page's Tutorials (from Sanity), listed
 * on the left by category and played on the right.
 */

const OTHER = 'Other';
/** A card's picture when a tutorial has none of its own. */
const FALLBACK_POSTER = '/images/start/walkthrough/get-started-mosaic.jpg';
const categoryOf = (t: TTutorial) => t.category?.trim() || OTHER;
/** Sanity's titles come in mixed case; the home page shows them in sentence case too. */
const sentence = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

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
        // the home's blue video cards, two to a row (the user asked), the one playing ringed
        <ul className="secondary-scrollbar -mr-[6px] grid min-h-0 grid-cols-2 content-start gap-[10px] overflow-y-auto pr-[6px] max-sm:grid-cols-1">
          {shown.map((t, i) => (
            // on a phone a tap opens its card in the list's place (learn-page.tsx)
            <li key={t.slug} data-phone-opens>
              <VideoCard
                video={{
                  key: t.slug,
                  title: sentence(t.title),
                  kind: categoryOf(t),
                  poster: t.posterImage ?? FALLBACK_POSTER,
                  url: t.url,
                }}
                selected={t.slug === selected?.slug}
                onPick={() => onSelect(t.slug)}
                delayMs={Math.min(i, 10) * 40}
              />
            </li>
          ))}
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
  className,
}: {
  tutorial?: TTutorial;
  tutorials: TTutorial[];
  onSelect: (slug: string) => void;
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
    <TutorialPlayer
      key={tutorial.slug}
      tutorial={tutorial}
      meta={`Video tutorial · ${categoryOf(tutorial)} · ${index + 1} of ${tutorials.length}`}
      nav={
        tutorials.length > 1 && (
          <div className="flex shrink-0 gap-[6px] pt-[2px]">
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
        )
      }
    />
  );
}

/**
 * No white card: the video across the whole width at the top, its title over it in white until it
 * plays; then the title fades from there to under the video, where the way on is. Keyed by the
 * tutorial, so each starts with its title over it.
 */
function TutorialPlayer({
  tutorial,
  meta,
  nav,
}: {
  tutorial: TTutorial;
  meta: string;
  nav: React.ReactNode;
}) {
  const [played, setPlayed] = useState(false);
  const title = sentence(tutorial.title);
  const youTubeId = parseYouTubeId(tutorial.url);
  return (
    <section className="flex min-h-0 w-full flex-1 flex-col gap-[16px] overflow-y-auto">
      <div className="relative overflow-hidden rounded-[12px] bg-[#002766]">
        {/* not autoplaying, since the section opens on one */}
        {youTubeId ? (
          <YouTubePlayer
            id={youTubeId}
            onPlay={() => setPlayed(true)}
            className="aspect-video w-full text-white"
          />
        ) : (
          <video
            controls
            playsInline
            preload="metadata"
            poster={tutorial.posterImage ?? undefined}
            src={tutorial.url}
            onPlay={() => setPlayed(true)}
            className="aspect-video w-full object-contain"
          >
            <track kind="captions" srcLang="en" label="English captions" />
          </video>
        )}
        {/* over the poster, clear of the controls along the bottom */}
        <div
          aria-hidden={played}
          className={cn(
            'pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-[6px] bg-linear-to-b from-[#001026]/80 via-[#001026]/40 to-transparent px-[28px] pt-[24px] pb-[56px] transition-opacity duration-500',
            played ? 'opacity-0' : 'opacity-100'
          )}
        >
          <h2 className="text-[30px] leading-[37px] font-bold text-white drop-shadow-sm">
            {title}
          </h2>
          <p className="text-[13px] leading-[18px] text-white/80">{meta}</p>
        </div>
      </div>
      <div className="flex items-start justify-between gap-[20px] px-[4px]">
        {/* the same title under it once it plays; its room kept, so nothing jumps */}
        <div
          className={cn(
            'flex min-w-0 flex-col gap-[6px] transition-opacity duration-500',
            played ? 'opacity-100 delay-200' : 'opacity-0'
          )}
          aria-hidden={!played}
        >
          <h1 className="text-[26px] leading-[33px] font-bold text-[#002766]">{title}</h1>
          <p className="text-[12.5px] leading-[17px] text-[#8c8c8c]">{meta}</p>
        </div>
        {nav}
      </div>
    </section>
  );
}
