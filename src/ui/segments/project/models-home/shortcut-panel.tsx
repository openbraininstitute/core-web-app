'use client';

import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react';
import { useEffect, useState } from 'react';

import { cn } from '@/utils/css-class';

import { DendrogramShortcuts, LayerShortcuts, OrbitShortcuts } from './shortcut-designs/designs-a';
import { BentoShortcuts, IndexShortcuts, RasterShortcuts } from './shortcut-designs/designs-b';
import { ElementShortcuts, MetroShortcuts, TraceShortcuts } from './shortcut-designs/designs-c';
import { NetworkShortcuts } from './shortcut-network';

import type { ComponentType } from 'react';

/** The ways of drawing the first home's places, flicked through with the arrows. */
const DESIGNS: Array<{ name: string; Design: ComponentType }> = [
  { name: 'Network', Design: NetworkShortcuts },
  { name: 'Dendrogram', Design: DendrogramShortcuts },
  { name: 'Cortical layers', Design: LayerShortcuts },
  { name: 'Orbits', Design: OrbitShortcuts },
  { name: 'Bento', Design: BentoShortcuts },
  { name: 'Spike raster', Design: RasterShortcuts },
  { name: 'Index', Design: IndexShortcuts },
  { name: 'Elements', Design: ElementShortcuts },
  { name: 'Metro', Design: MetroShortcuts },
  { name: 'Voltage traces', Design: TraceShortcuts },
];

const REMEMBERED = 'project-home/shortcuts-design';

const ARROW =
  'flex size-[26px] items-center justify-center rounded-full border border-neutral-200 text-primary-9 transition-colors hover:border-primary-9 hover:bg-primary-9 hover:text-white';

/**
 * "Where would you like to start?", the first home's places, in one of several designs, flicked
 * through with the arrows under the heading; the one last shown is shown again.
 */
export function ShortcutPanel({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    try {
      const remembered = Number(localStorage.getItem(REMEMBERED));
      if (Number.isInteger(remembered) && remembered > 0 && remembered < DESIGNS.length) {
        setIndex(remembered);
      }
    } catch {
      // Without storage, the first design.
    }
  }, []);
  const show = (next: number) => {
    const at = (next + DESIGNS.length) % DESIGNS.length;
    setIndex(at);
    try {
      localStorage.setItem(REMEMBERED, String(at));
    } catch {
      // Not remembered, then.
    }
  };
  const { name, Design } = DESIGNS[index];
  return (
    <div className={cn('flex min-h-0 flex-col gap-[10px]', className)}>
      {/* The arrows through the designs are out of sight until the end of the heading is pointed at. */}
      <div className="group/designs relative">
        <h1 className="text-primary-9 font-serif text-[40px] leading-[46px]">
          Where would you like to start?
        </h1>
        <span aria-hidden className="absolute top-0 right-0 h-full w-[120px]" />
        <div className="pointer-events-none absolute top-full right-0 z-20 flex items-center gap-[8px] rounded-full bg-white/90 py-[3px] pr-[10px] pl-[3px] opacity-0 shadow-[0_2px_10px_rgba(0,39,102,0.08)] transition-opacity duration-200 group-focus-within/designs:pointer-events-auto group-focus-within/designs:opacity-100 group-has-[span:hover]/designs:pointer-events-auto group-has-[span:hover]/designs:opacity-100 hover:pointer-events-auto hover:opacity-100">
        <button
          type="button"
          onClick={() => show(index - 1)}
          aria-label="Previous design"
          className={ARROW}
        >
          <RiArrowLeftSLine className="size-[16px]" />
        </button>
        <button
          type="button"
          onClick={() => show(index + 1)}
          aria-label="Next design"
          className={ARROW}
        >
          <RiArrowRightSLine className="size-[16px]" />
        </button>
        <span className="text-[11px] leading-[14px] font-semibold tracking-[1px] text-neutral-400 uppercase">
          {index + 1} / {DESIGNS.length} · {name}
        </span>
        </div>
      </div>
      <div className="relative min-h-[400px] flex-1">
        <Design key={name} />
      </div>
    </div>
  );
}
