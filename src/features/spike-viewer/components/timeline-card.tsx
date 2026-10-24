'use client';

import { Fragment } from 'react';
import { createPortal } from 'react-dom';

import { TIMELINE_COLORS } from '@/features/spike-viewer/renderer/axis-overlay';
import { cn } from '@/utils/css-class';
import { fullscreenPopupContainer } from '@/utils/fullscreen';

import type { TimelineEvent } from '@/features/spike-viewer/config-timeline';
import type { EventsHover } from '@/features/spike-viewer/renderer/raster-renderer';

const KIND = { stimulus: 'Stimulus', recording: 'Recording', manipulation: 'Manipulation' };
const COLOR = {
  stimulus: TIMELINE_COLORS.stimulus,
  recording: TIMELINE_COLORS.recording,
  manipulation: TIMELINE_COLORS.manipulation,
};

/**
 * The card for a marker of the config's timings under the pointer: when, and
 * each block it stands for with every one of its settings - side by side
 * where there are several. On the page, not in the raster, which would clip it.
 */
export function TimelineCard({ hover }: { hover: EventsHover }) {
  const { group, clientX, clientY } = hover;
  const blocks = group.events;
  const columns = blocks.length === 1 ? 1 : blocks.length <= 4 ? 2 : 3;
  const flipX = clientX > window.innerWidth * 0.55;
  const flipY = clientY > window.innerHeight * 0.5;
  return createPortal(
    <div
      className="border-neutral-2 pointer-events-none fixed z-[1100] overflow-hidden rounded-xl border bg-white/95 px-3 py-2.5 shadow-lg backdrop-blur-sm"
      style={{
        left: clientX,
        top: clientY,
        width: columns * 262,
        maxWidth: 'calc(100vw - 32px)',
        translate: `${flipX ? 'calc(-100% - 14px)' : '14px'} ${flipY ? 'calc(-100% - 14px)' : '14px'}`,
      }}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-primary-9 text-xs font-semibold">
          {group.edge === 'start' ? 'Starts' : 'Ends'} at {round(group.time)} ms
        </span>
        {blocks.length > 1 && (
          <span className="ml-auto text-[11px] text-neutral-400">{blocks.length} blocks</span>
        )}
      </div>
      <div
        className={cn('mt-2 grid items-start', blocks.length > 1 ? 'gap-2' : 'gap-3')}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {blocks.map((event, i) => (
          // The same block can stand for several onsets at once, zoomed out.
          // biome-ignore lint/suspicious/noArrayIndexKey: blocks do not reorder under one marker
          <BlockSection key={`${event.name}-${i}`} event={event} framed={blocks.length > 1} />
        ))}
      </div>
      <div className="mt-2 text-[10px] text-neutral-400">
        {blocks.every((e) => e.end === e.start)
          ? 'Click to start the raster’s window here'
          : `Click to set the raster to ${blocks.length > 1 ? 'their window' : 'this window'}`}
      </div>
    </div>,
    fullscreenPopupContainer()
  );
}

/** A block's section; framed in grey where several share the card, so each reads as one. */
function BlockSection({ event, framed }: { event: TimelineEvent; framed: boolean }) {
  const span =
    event.end === undefined
      ? `from ${round(event.start)} ms`
      : event.end === event.start
        ? `at ${round(event.start)} ms`
        : `${round(event.start)}–${round(event.end)} ms`;
  return (
    <section
      className={cn(
        'min-w-0',
        framed && 'rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2'
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="size-2 shrink-0 rounded-full" style={{ background: COLOR[event.kind] }} />
        <span className="text-primary-9 truncate text-xs font-semibold">{event.name}</span>
        <span className="ml-auto shrink-0 text-[10px] tracking-wide text-neutral-400 uppercase">
          {KIND[event.kind]}
        </span>
      </div>
      <div className="mt-0.5 truncate text-[11px] text-neutral-500">{event.block.title}</div>
      <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[11px]">
        <dt className="text-neutral-500">Window</dt>
        <dd className="text-primary-9 text-right font-semibold tabular-nums">{span}</dd>
        {event.block.fields.map((field) => (
          <Fragment key={field.label}>
            <dt className="truncate text-neutral-500">{field.label}</dt>
            <dd className="truncate text-right text-neutral-700 tabular-nums" title={field.value}>
              {field.value}
            </dd>
          </Fragment>
        ))}
      </dl>
    </section>
  );
}

const round = (v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(1));
