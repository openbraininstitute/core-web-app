'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CATEGORIES, LEARN_SECTIONS } from '@/features/learn/ui/category-tiles';
import { HEX_CLIP, SQRT3 } from '@/ui/segments/project/hex-home/hex-geometry';
import styles from '@/ui/segments/project/hex-home/hex-cloud.module.css';
import { HexTile } from '@/ui/segments/project/hex-home/hex-tile';
import { cn } from '@/utils/css-class';

import type { CSSProperties } from 'react';

type LearnSection = (typeof LEARN_SECTIONS)[number];

interface ISectionsProps {
  section: LearnSection;
  onSelect: (section: LearnSection) => void;
  /** Sections that have a page but nothing to show (courses when every course's flag is off). */
  off?: LearnSection[];
  /** Left out altogether, by key (the Sections options). */
  hidden?: string[];
  className?: string;
}

/** Every section shown, each with whether it can be opened yet (what is still to come is greyed out). */
function sectionsOf(off: LearnSection[], hidden: string[]) {
  return CATEGORIES.filter((c) => !hidden.includes(c.key)).map((category) => ({
    category,
    live:
      (LEARN_SECTIONS as readonly string[]).includes(category.key) &&
      !(off as string[]).includes(category.key),
  }));
}

/** The room round the column (for the hexagons' lift and shadow), the gap between them, and their largest size (px). */
const PAD = 16;
const GAP = 8;
const MAX_R = 76;

/**
 * Learn's sections as the home's categories are (the user asked): hexagons one above another straight down the
 * left, centred on the height, white, the open one navy, their names in bold capitals, with no heading or panel
 * round them; as large as the height allows.
 */
export function LearnHexColumn({ section, onSelect, off = [], hidden = [], className }: ISectionsProps) {
  const box = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.clientHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sections = sectionsOf(off, hidden);
  const n = sections.length;
  const r = Math.max(36, Math.min(MAX_R, (height - 2 * PAD - (n - 1) * GAP) / (2 * n)));
  const w = SQRT3 * r;
  const top = height / 2 - ((n - 1) / 2) * (2 * r + GAP);

  return (
    <div ref={box} className={cn('relative h-full shrink-0', className)} style={{ width: w + 2 * PAD }}>
      {height > 0 &&
        sections.map(({ category, live }, i) => {
          const on = live && category.key === section;
          return (
            <HexTile
              key={category.key}
              box={{ x: PAD + w / 2, y: top + i * (2 * r + GAP), r }}
              lift={on ? 1.1 : 0.9}
              drift={false}
              tone={on ? 'navy' : 'white'}
              onClick={live ? () => onSelect(category.key as LearnSection) : undefined}
              title={live ? category.label : `${category.label}: coming soon`}
              appearMs={120 + i * 60}
              className={cn(!live && 'opacity-50 grayscale')}
            >
              <div className="flex h-full w-full items-center justify-center px-[12%] text-center">
                <span
                  lang="en"
                  className={cn(
                    'text-[14px] leading-[16px] font-bold tracking-[0.04em] uppercase hyphens-auto transition-colors duration-300',
                    on ? 'text-white' : 'text-primary-9'
                  )}
                >
                  {category.label}
                </span>
              </div>
            </HexTile>
          );
        })}
    </div>
  );
}

/** Short names for the dock's small hexagons; the full one is each one's title. */
const SHORT: Record<string, string> = {
  free: 'Courses',
  standard: 'Standard',
  conferences: 'Events',
};

/** The dock's margin at either side, the gap between its hexagons, and its padding over and under them (px). */
const DOCK = { side: 10, gap: 4, top: 8, bottom: 8 };

/**
 * The same sections on a narrow screen, along the foot over the tabs as the phone's home has its categories (the
 * user asked): two rows of hexagons, interlocked, as large as the width allows so that none scroll out of sight. It
 * keeps its own height free at the end of the page, so nothing is left under it.
 */
export function LearnHexDock({ section, onSelect, off = [], hidden = [], className }: ISectionsProps) {
  const dock = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const el = dock.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted]);

  const sections = sectionsOf(off, hidden);
  // a few in one row, as the phone's home has its categories, no larger than those; more in two
  const oneRow = sections.length <= 5;
  const top = oneRow ? sections.length : Math.ceil(sections.length / 2);
  // with as many under as over, the lower row sits half a hexagon to the right
  const even = !oneRow && sections.length % 2 === 0;
  const across = top + (even ? 0.5 : 0);
  const w = width
    ? Math.min(oneRow ? 84 : Infinity, (width - 2 * DOCK.side - (top - 1) * DOCK.gap - (even ? DOCK.gap / 2 : 0)) / across)
    : 0;
  const h = (2 * w) / SQRT3;
  const rise = oneRow ? 0 : 0.75 * h + (DOCK.gap * SQRT3) / 2;
  const height = w ? DOCK.top + h + rise + DOCK.bottom : 0;
  // a row narrower than the width centred in it
  const side = oneRow ? Math.max(DOCK.side, (width - top * w - (top - 1) * DOCK.gap) / 2) : DOCK.side;
  const left = (row: number, j: number) => side + j * (w + DOCK.gap) + (row === 1 ? (w + DOCK.gap) / 2 : 0);

  const bar = (
    <div
      ref={dock}
      className={cn(
        'fixed inset-x-0 z-30 bg-white shadow-[0_-4px_14px_rgb(20_40_90/0.06)]',
        // over the phone's tabs, which are along the foot there; at the foot itself on a tablet
        'bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0',
        className
      )}
      style={{ height: height || undefined }}
    >
      {w > 0 &&
        sections.map(({ category, live }, i) => {
          const row = oneRow || i < top ? 0 : 1;
          const j = row ? i - top : i;
          const on = live && category.key === section;
          return (
            <button
              key={category.key}
              type="button"
              disabled={!live}
              aria-pressed={on}
              title={live ? category.label : `${category.label}: coming soon`}
              onClick={() => onSelect(category.key as LearnSection)}
              className={cn(
                'absolute drop-shadow-[0_3px_6px_rgb(28_40_72/0.16)] transition-transform active:scale-95',
                !live && 'opacity-50 grayscale'
              )}
              style={{ left: left(row, j), top: DOCK.top + row * rise, width: w, height: h }}
            >
              <span
                className={cn(styles.appear, 'absolute inset-0 block')}
                style={{ '--appear-delay': `${60 + i * 50}ms` } as CSSProperties}
              >
                <span
                  lang="en"
                  className={cn(
                    'absolute inset-0 flex items-center justify-center px-[9%] text-center text-[8.5px] leading-[10px] font-bold hyphens-auto transition-colors',
                    on ? 'bg-[#002766] text-white' : 'text-primary-9 bg-white'
                  )}
                  style={{ clipPath: HEX_CLIP }}
                >
                  {SHORT[category.key] ?? category.label}
                </span>
              </span>
            </button>
          );
        })}
    </div>
  );

  return (
    <>
      {/* its room at the end of the page */}
      <div className={cn('shrink-0', className)} style={{ height }} aria-hidden />
      {/* fixed to the window, out of any scrolling box it sits in */}
      {mounted && createPortal(bar, document.body)}
    </>
  );
}

/**
 * The sections as buttons in a row along the top of Learn (the user asked, in place of the hexagons): the open one
 * navy, the rest white, those still to come greyed out; a row that scrolls sideways on a narrow screen if it must.
 */
export function LearnSectionButtons({ section, onSelect, off = [], hidden = [], className }: ISectionsProps) {
  const sections = sectionsOf(off, hidden);
  return (
    <nav aria-label="Learn sections" className={cn('no-scrollbar flex shrink-0 gap-2 overflow-x-auto', className)}>
      {sections.map(({ category, live }) => {
        const on = live && category.key === section;
        return (
          <button
            key={category.key}
            type="button"
            disabled={!live}
            aria-pressed={on}
            title={live ? undefined : `${category.label}: coming soon`}
            onClick={() => onSelect(category.key as LearnSection)}
            className={cn(
              'flex h-[40px] shrink-0 items-center rounded-full px-[20px] text-[14px] font-semibold whitespace-nowrap transition-colors max-md:h-[36px] max-md:px-[14px] max-md:text-[13px]',
              on
                ? 'bg-[#002766] text-white'
                : 'border border-[#d6e4ff] bg-white text-[#002766] hover:border-[#002766]',
              !live && 'cursor-default opacity-50'
            )}
          >
            {category.label}
          </button>
        );
      })}
    </nav>
  );
}

/**
 * The sections as hexagons in a row along the top of Learn (the user asked to try them where the buttons were), as
 * the home's categories are drawn: white, the open one navy, their names in bold capitals, rising in one after
 * another; smaller on a phone.
 */
export function LearnSectionHexes({ section, onSelect, off = [], hidden = [], className }: ISectionsProps) {
  const sections = sectionsOf(off, hidden);
  return (
    // no room over them: their tops level with the card's beside them (the user asked)
    <nav aria-label="Learn sections" className={cn('no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-1 pb-2', className)}>
      {sections.map(({ category, live }, i) => {
        const on = live && category.key === section;
        return (
          <button
            key={category.key}
            type="button"
            disabled={!live}
            aria-pressed={on}
            title={live ? category.label : `${category.label}: coming soon`}
            onClick={() => onSelect(category.key as LearnSection)}
            className={cn(
              'relative h-[116px] w-[100px] shrink-0 drop-shadow-[0_5px_10px_rgb(28_40_72/0.16)] transition-transform active:scale-95 max-md:h-[92px] max-md:w-[80px]',
              !live && 'opacity-50 grayscale'
            )}
          >
            <span
              className={cn(styles.appear, 'absolute inset-0 block')}
              style={{ '--appear-delay': `${60 + i * 70}ms` } as CSSProperties}
            >
              <span
                lang="en"
                className={cn(
                  'absolute inset-0 flex items-center justify-center px-[12%] text-center text-[12px] leading-[14px] font-bold tracking-[0.03em] uppercase hyphens-auto transition-colors duration-300 max-md:text-[10px] max-md:leading-[12px]',
                  on ? 'bg-[#002766] text-white' : 'text-primary-9 bg-white'
                )}
                style={{ clipPath: HEX_CLIP }}
              >
                {category.label}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/**
 * The sections on a phone along the foot, just over the tabs, as the phone's home has its categories (the user
 * asked): white hexagons of the same size in a row, the open one navy, their names in bold capitals (short ones where
 * the full name is long), rising in one after another. It keeps its own height free at the end of the page, so
 * nothing is left under it.
 */
export function LearnHexFoot({ section, onSelect, off = [], hidden = [], className }: ISectionsProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const sections = sectionsOf(off, hidden);
  const row = (
    <nav
      aria-label="Learn sections"
      // no strip of its own: the hexagons on the page's background (the user asked)
      className="no-scrollbar fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 flex gap-2 overflow-x-auto px-4 pt-2 pb-3 md:hidden"
    >
      {sections.map(({ category, live }, i) => {
        const on = live && category.key === section;
        return (
          <button
            key={category.key}
            type="button"
            disabled={!live}
            aria-pressed={on}
            title={live ? category.label : `${category.label}: coming soon`}
            onClick={() => onSelect(category.key as LearnSection)}
            className={cn('w-[74px] shrink-0 transition-transform active:scale-95', !live && 'opacity-50 grayscale')}
          >
            <span
              className={cn(styles.appear, 'block')}
              style={{ '--appear-delay': `${60 + i * 80}ms` } as CSSProperties}
            >
              <span
                className="relative block drop-shadow-[0_5px_9px_rgb(28_40_72/0.16)]"
                style={{ aspectRatio: `${SQRT3} / 2` }}
              >
                <span
                  lang="en"
                  className={cn(
                    'absolute inset-0 flex items-center justify-center overflow-hidden px-1.5 text-center text-[10.5px] leading-[12.5px] font-bold tracking-[0.03em] uppercase hyphens-auto transition-colors duration-300',
                    on ? 'bg-[#002766] text-white' : 'text-primary-9 bg-white'
                  )}
                  style={{ clipPath: HEX_CLIP }}
                >
                  {SHORT[category.key] ?? category.label}
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
  return (
    <>
      {/* its room at the end of the page */}
      <div aria-hidden className={cn('h-[104px] shrink-0 md:hidden', className)} />
      {/* fixed to the window, out of any scrolling box it sits in */}
      {mounted && createPortal(row, document.body)}
    </>
  );
}
