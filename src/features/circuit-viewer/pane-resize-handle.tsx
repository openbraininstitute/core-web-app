import { Fragment, useRef } from 'react';

import IconPlus from '@/components/icons/Plus';
import { cn } from '@/utils/css-class';

/**
 * The grab bar between a viewer and the pane docked under it.
 *
 * On the bottom pane's top edge, by default, it reports the height that pane
 * should take, measured from the bottom of `containerRef`. On the `bottom`
 * edge of a pane over another it reports that pane's height, measured from the
 * top of `containerRef`, and leaves its ceiling to the caller. Either way the
 * caller keeps owning where the height is stored.
 */
export function PaneResizeHandle({
  containerRef,
  minHeight,
  onResize,
  onDragChange,
  edge = 'top',
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  minHeight: number;
  onResize: (height: number) => void;
  onDragChange?: (dragging: boolean) => void;
  edge?: 'top' | 'bottom';
}) {
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const {
      top: containerTop,
      bottom: containerBottom,
      height: containerHeight,
    } = container.getBoundingClientRect();
    onDragChange?.(true);
    followDrag(
      e,
      (ev) => {
        if (edge === 'bottom') {
          onResize(Math.max(minHeight, ev.clientY - containerTop));
          return;
        }
        const raw = containerBottom - ev.clientY;
        onResize(Math.min(containerHeight, Math.max(minHeight, raw)));
      },
      () => onDragChange?.(false)
    );
  }

  return (
    <div
      onPointerDown={onPointerDown}
      className={`group absolute left-0 right-0 ${edge === 'bottom' ? '-bottom-2' : '-top-2'} z-10 flex h-4 cursor-ns-resize items-center justify-center`}
      style={{ touchAction: 'none' }}
    >
      <div className="h-1 w-14 rounded-full bg-neutral-400 transition-all group-hover:w-16 group-hover:bg-neutral-600" />
    </div>
  );
}

/**
 * The same grab bar on its side, between two panes side by side.
 *
 * Reports where the rule between them should go, measured from the left of
 * `containerRef`, and when a drag starts and ends: a host that animates the
 * panes holds that off while they follow the pointer.
 */
export function PaneSideResizeHandle({
  containerRef,
  minWidth,
  onResize,
  onDragChange,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Room kept either side of the rule. */
  minWidth: number;
  onResize: (left: number) => void;
  onDragChange?: (dragging: boolean) => void;
}) {
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const { left: containerLeft, width: containerWidth } = container.getBoundingClientRect();
    onDragChange?.(true);
    followDrag(
      e,
      (ev) => {
        const raw = ev.clientX - containerLeft;
        onResize(Math.min(containerWidth - minWidth, Math.max(minWidth, raw)));
      },
      () => onDragChange?.(false)
    );
  }

  return (
    <div
      onPointerDown={onPointerDown}
      className="group absolute top-0 bottom-0 -left-2 z-10 flex w-4 cursor-ew-resize items-center justify-center"
      style={{ touchAction: 'none' }}
    >
      <div className="h-14 w-1 rounded-full bg-neutral-400 transition-all group-hover:h-16 group-hover:bg-neutral-600" />
    </div>
  );
}

/** Which of the two panes either side of a grab bar it has shut, if either. */
export type PaneShut = 'start' | 'end' | null;

/** How thick a shut pane's bar is: the assistant's folded width. */
export const SHUT_BAR_SIZE = 42;

/**
 * The two panes either side of a grab bar that can shut them. Dragged under
 * its floor a pane holds there, and dragged on to under half of it, it shuts:
 * the host draws its {@link ShutPaneBar} in its place, which opens it again at
 * the size it had before the drag. Sizes are the end pane's, under or right of
 * the bar, out of the `total` the two share.
 */
export function useShuttingSplit({
  chosen,
  onChosenChange,
  shut,
  onShutChange,
  total,
  floors,
  preferred,
}: {
  /** The end pane's size as last dragged; null until it is. */
  chosen: number | null;
  onChosenChange: (size: number | null) => void;
  shut: PaneShut;
  /** Without it the panes only stop at their floors. */
  onShutChange?: (shut: PaneShut) => void;
  total: number;
  /** What the start pane and the end pane each keep while open. */
  floors: readonly [number, number];
  /** The end pane's size until the bar is dragged. */
  preferred: number;
}) {
  // What a pane this drag shuts is opened at again.
  const before = useRef<number | null>(null);
  return {
    /** The end pane's size while both are open. */
    size: keepToFloors(chosen ?? preferred, total, floors),
    shut: onShutChange ? shut : null,
    onDragChange: (dragging: boolean) => {
      if (dragging) before.current = chosen;
    },
    onResize: (end: number) => {
      const at = Math.min(total, Math.max(0, end));
      const next = onShutChange ? shutBy(at, total, floors) : null;
      onChosenChange(next ? before.current : at);
      onShutChange?.(next);
    },
    open: () => onShutChange?.(null),
  };
}

/**
 * The end pane's size kept to both floors. In a span too short for the two the
 * bounds cross, and the bar stays live between them.
 */
function keepToFloors(
  end: number,
  total: number,
  [startFloor, endFloor]: readonly [number, number]
) {
  const lo = Math.max(0, Math.min(endFloor, total - startFloor));
  const hi = Math.min(total, Math.max(endFloor, total - startFloor));
  return Math.round(Math.min(hi, Math.max(lo, end)));
}

/** The pane a bar at `end` shuts: one dragged under half its floor. */
function shutBy(end: number, total: number, [startFloor, endFloor]: readonly [number, number]) {
  if (total - end < startFloor / 2) return 'start';
  if (end < endFloor / 2) return 'end';
  return null;
}

/**
 * A pane its grab bar has shut: a white bar like the assistant's when folded,
 * naming the pane, which opens it again. `upright` for a column shut on its
 * side, one bar naming each of its panes.
 */
export function ShutPaneBar({
  title,
  onOpen,
  upright = false,
  className,
}: {
  title: string | readonly string[];
  onOpen: () => void;
  upright?: boolean;
  className?: string;
}) {
  const titles = typeof title === 'string' ? [title] : title;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${titles.join(' and ')}`}
      className={cn(
        'text-primary-9 flex min-h-0 min-w-0 shrink-0 cursor-pointer items-center gap-[1em] overflow-hidden rounded-full bg-white text-xl font-bold whitespace-nowrap shadow-md ring-1 ring-black/5 transition-colors hover:bg-neutral-50',
        upright ? 'w-[42px] flex-col pt-[0.5em]' : 'h-[42px] px-[0.5em]',
        className
      )}
    >
      <IconPlus className="shrink-0" />
      {titles.map((name, i) => (
        <Fragment key={name}>
          {i > 0 && (
            <span aria-hidden className="size-1 shrink-0 rounded-full bg-current opacity-30" />
          )}
          <span className={cn(upright && '[writing-mode:vertical-rl]')}>{name}</span>
        </Fragment>
      ))}
    </button>
  );
}

/** Reports every pointer move of a drag begun on a grab bar, until the button comes up. */
function followDrag(
  e: React.PointerEvent<HTMLDivElement>,
  onMove: (ev: PointerEvent) => void,
  onEnd?: () => void
) {
  e.currentTarget.setPointerCapture(e.pointerId);
  function onPointerUp(ev: PointerEvent) {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    try {
      (ev.target as Element | null)?.releasePointerCapture?.(ev.pointerId);
    } catch {}
    onEnd?.();
  }
  // A move with no button down is a release that never came: the drag ends there, rather than
  // following the pointer from then on.
  function onPointerMove(ev: PointerEvent) {
    if (ev.buttons === 0) onPointerUp(ev);
    else onMove(ev);
  }
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}
