'use client';

import { CloseOutlined } from '@ant-design/icons';
import { atom, useAtom } from 'jotai';
import { useLayoutEffect, useRef, useState } from 'react';

import {
  PaneSideResizeHandle,
  SHUT_BAR_SIZE,
  ShutPaneBar,
  useShuttingSplit,
} from '@/features/circuit-viewer/pane-resize-handle';
import { BOX_CLASS } from '@/features/scan-config/components/shared/box-class';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { CSSProperties, ReactNode } from 'react';
import type { PaneShut } from '@/features/circuit-viewer/pane-resize-handle';

/** Either side of the grab bar: the windows sit a rail's gap (1rem at 14px) apart. */
const GUTTER = 7;
/** What each window keeps while open; dragged on to under half of it, it shuts. */
const FLOORS = [GUTTER + 300, GUTTER + 300] as const;

// kept for the next edit, as each one mounts the windows anew
const endWidthAtom = atom<number | null>(null);
const shutAtom = atom<PaneShut>(null);

export type EditWindow = {
  /** Its title bar's name, and its bar's once shut. */
  title: string;
  /** Buttons in its title bar, before its close button. */
  actions?: ReactNode;
  content: ReactNode;
};

/**
 * Two windows side by side, the source and the report it makes, with a grab bar between them.
 * Either closes from its title bar, or by dragging the bar most of the way over it, and leaves a
 * bar naming it that opens it again at the width it had.
 */
export function EditWindows({
  start,
  end,
  actions,
}: {
  start: EditWindow;
  end: EditWindow;
  /** For both: in the first open window's title bar, after its own. */
  actions?: ReactNode;
}) {
  // seeded by hand in a layout effect: the observer's first report lands a frame late
  const areaRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    setWidth(area.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  const [chosen, setChosen] = useAtom(endWidthAtom);
  const [shut, setShut] = useAtom(shutAtom);
  const split = useShuttingSplit({
    chosen,
    onChosenChange: setChosen,
    shut,
    onShutChange: setShut,
    total: width,
    floors: FLOORS,
    preferred: Math.round(width / 2),
  });
  const startShut = split.shut === 'start';
  const endShut = split.shut === 'end';
  // the end window's room, its side of the gap included: a shut window is its bar
  const room = startShut
    ? width - SHUT_BAR_SIZE - GUTTER
    : endShut
      ? SHUT_BAR_SIZE + GUTTER
      : split.size;
  const measured = width > 0;

  return (
    <div ref={areaRef} className="relative min-h-0 min-w-0 flex-1">
      <Window
        window={start}
        shared={startShut ? undefined : actions}
        shut={startShut}
        onClose={endShut ? undefined : () => setShut('start')}
        className="absolute inset-y-0 left-0"
        style={{ right: measured ? room + GUTTER : '50%' }}
      />
      <Window
        window={end}
        shared={startShut ? actions : undefined}
        shut={endShut}
        onClose={startShut ? undefined : () => setShut('end')}
        className="absolute inset-y-0 right-0"
        style={{ width: measured ? room - GUTTER : '50%' }}
      />
      {startShut && (
        <ShutPaneBar
          upright
          title={start.title}
          onOpen={split.open}
          className="absolute inset-y-0 left-0"
        />
      )}
      {endShut && (
        <ShutPaneBar
          upright
          title={end.title}
          onOpen={split.open}
          className="absolute inset-y-0 right-0"
        />
      )}
      {measured && (
        // a zero-width rule down the middle of the gap, which the bar centres on
        <div
          className="pointer-events-none absolute inset-y-0 w-0 *:pointer-events-auto"
          style={{ right: room }}
        >
          <PaneSideResizeHandle
            containerRef={areaRef}
            minWidth={0}
            onResize={(left) => split.onResize(width - left)}
            onDragChange={split.onDragChange}
          />
        </div>
      )}
    </div>
  );
}

/**
 * One of the two: a white card with a title bar over content that scrolls. Shut, it stays mounted
 * out of sight, so the editor in it keeps its cursor and history.
 */
function Window({
  window: w,
  shared,
  shut,
  onClose,
  className,
  style,
}: {
  window: EditWindow;
  shared?: ReactNode;
  shut: boolean;
  /** None for the only window open. */
  onClose?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <section
      aria-label={w.title}
      aria-hidden={shut || undefined}
      inert={shut || undefined}
      className={cn(
        BOX_CLASS,
        'flex min-w-0 flex-col overflow-hidden',
        className,
        shut && 'hidden'
      )}
      style={style}
    >
      <div className="border-neutral-2 flex h-14 shrink-0 items-center gap-2 border-b pr-2 pl-6">
        <span className="text-neutral-4 text-xs font-semibold tracking-wider uppercase">
          {w.title}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {w.actions}
          {shared}
          {onClose && (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Close ${w.title}`}
                  onClick={onClose}
                  className="text-neutral-4 hover:bg-neutral-1 hover:text-primary-9 flex size-8 items-center justify-center rounded-full transition-colors"
                >
                  <CloseOutlined />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close {w.title.toLowerCase()}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">{w.content}</div>
    </section>
  );
}
