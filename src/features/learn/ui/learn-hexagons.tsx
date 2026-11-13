'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CATEGORIES, LEARN_SECTIONS } from '@/features/learn/ui/category-tiles';
import { HEX_CLIP, SQRT3 } from '@/ui/segments/project/hex-home/hex-geometry';
import styles from '@/ui/segments/project/hex-home/hex-cloud.module.css';
import { HexTile } from '@/ui/segments/project/hex-home/hex-tile';
import { HEADING, PANEL } from '@/ui/segments/workflows/elements/workflow-hex-menu';
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

/** The panel's inner margin, the gap between hexagons and the heading's room (page px). */
const PAD = 16;
const GAP = 8;
const HEAD = 32 + 12;
const MAX_R = 72;

/** Rows of two and one by turns: a honeycomb two wide. */
function rowsOf(n: number) {
  const rows: number[] = [];
  for (let left = n; left > 0; ) {
    const k = Math.min(rows.length % 2 ? 1 : 2, left);
    rows.push(k);
    left -= k;
  }
  return rows;
}

/**
 * Learn's sections as the home's and the Workflows page's categories are: hexagons down the left (the user asked),
 * white, the open one navy, their names in bold capitals, in a white panel under a "Learn" heading. Eleven do not fit
 * one column at a size their names fit, so they lie in a honeycomb two wide, as large as the panel's height allows.
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
  const rows = rowsOf(sections.length);
  const rise = (r: number) => 1.5 * r + (GAP * SQRT3) / 2;
  const room = height - 2 * PAD - HEAD;
  const r = Math.max(
    36,
    Math.min(MAX_R, (room - ((rows.length - 1) * GAP * SQRT3) / 2) / (2 + 1.5 * (rows.length - 1)))
  );
  const w = SQRT3 * r;
  const places: Array<{ x: number; y: number }> = [];
  rows.forEach((k, row) => {
    const y = PAD + HEAD + r + row * rise(r);
    for (let j = 0; j < k; j++) places.push({ x: k === 2 ? PAD + w / 2 + j * (w + GAP) : PAD + w + GAP / 2, y });
  });

  return (
    <div
      ref={box}
      className={cn(PANEL, 'relative h-full shrink-0 overflow-hidden', className)}
      style={{ width: 2 * w + GAP + 2 * PAD }}
    >
      <h2 className={cn(HEADING, 'absolute')} style={{ top: PAD, left: PAD }}>
        Learn
      </h2>
      {height > 0 &&
        sections.map(({ category, live }, i) => {
          const on = live && category.key === section;
          return (
            <HexTile
              key={category.key}
              box={{ ...places[i], r }}
              lift={on ? 1.1 : 0.9}
              drift={false}
              tone={on ? 'navy' : 'white'}
              onClick={live ? () => onSelect(category.key as LearnSection) : undefined}
              title={live ? category.label : `${category.label}: coming soon`}
              appearMs={120 + i * 60}
              className={cn(!live && 'opacity-50 grayscale')}
            >
              <div className="flex h-full w-full items-center justify-center px-[13%] text-center">
                <span
                  lang="en"
                  className={cn(
                    'text-[12px] leading-[14px] font-bold tracking-[0.03em] uppercase hyphens-auto transition-colors duration-300',
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
  const top = Math.ceil(sections.length / 2);
  // with as many under as over, the lower row sits half a hexagon to the right
  const even = sections.length % 2 === 0;
  const across = top + (even ? 0.5 : 0);
  const w = width
    ? (width - 2 * DOCK.side - (top - 1) * DOCK.gap - (even ? DOCK.gap / 2 : 0)) / across
    : 0;
  const h = (2 * w) / SQRT3;
  const rise = 0.75 * h + (DOCK.gap * SQRT3) / 2;
  const height = w ? DOCK.top + h + rise + DOCK.bottom : 0;
  const left = (row: number, j: number) =>
    DOCK.side + j * (w + DOCK.gap) + (row === 1 ? (w + DOCK.gap) / 2 : 0);

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
          const row = i < top ? 0 : 1;
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
