'use client';

import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { fullscreenPopupContainer } from '@/utils/fullscreen';

import type { PlotTooltip } from '@/features/spike-viewer/spike-statistics/figures';

/**
 * A card for the pointer at (`clientX`, `clientY`). `flip` puts it on the
 * pointer's left; left out, it goes there only where the right has no room.
 */
export type PlacedTooltip = { clientX: number; clientY: number; flip?: boolean; card: PlotTooltip };

/** Between the pointer and the card, and the least between the card and the window's edge. */
const GAP = 14;
const EDGE = 8;

/**
 * The hover card every plot of the results shows: beside the pointer and level
 * with it, as far as the window allows. On the page rather than in the plot,
 * whose box would clip it.
 */
export function TooltipCard({ clientX, clientY, flip, card }: PlacedTooltip) {
  // Placed by its own size, once it has one: before paint, so it never shows unplaced.
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const left = flip ?? clientX + GAP + width > window.innerWidth - EDGE;
    el.style.left = `${left ? Math.max(EDGE, clientX - GAP - width) : clientX + GAP}px`;
    el.style.top = `${Math.max(EDGE, Math.min(clientY - height / 2, window.innerHeight - height - EDGE))}px`;
    el.style.visibility = 'visible';
  });
  return createPortal(
    <div
      ref={ref}
      className="border-neutral-2 pointer-events-none invisible fixed z-[1100] max-w-80 min-w-36 rounded-xl border bg-white/95 px-3 py-2 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center gap-2">
        {card.swatch && (
          <span className="size-2 shrink-0 rounded-full" style={{ background: card.swatch }} />
        )}
        <span className="text-primary-9 truncate text-xs font-semibold">{card.title}</span>
        {card.note && (
          <span className="ml-auto pl-3 text-[11px] whitespace-nowrap text-neutral-400">
            {card.note}
          </span>
        )}
      </div>
      {card.subtitle && (
        <div className="mt-0.5 truncate text-[11px] text-neutral-400">{card.subtitle}</div>
      )}
      {card.rows.length > 0 && (
        <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-0.5 text-[11px]">
          {card.rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="truncate text-neutral-500">{row.label}</dt>
              <dd
                className={
                  row.strong
                    ? 'text-primary-9 truncate text-right font-semibold tabular-nums'
                    : 'truncate text-right text-neutral-700 tabular-nums'
                }
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {card.hint && <div className="mt-1.5 text-[10px] text-neutral-400">{card.hint}</div>}
    </div>,
    fullscreenPopupContainer()
  );
}
