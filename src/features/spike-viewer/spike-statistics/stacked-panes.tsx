'use client';

import { RiArrowRightLine } from '@remixicon/react';
import { Spin } from 'antd';
import { atom, useAtom } from 'jotai';
import { useLayoutEffect, useRef, useState } from 'react';

import { KeptNodesGridPlaceholder } from '@/features/circuit-nodes/components/kept-nodes-grid';
import {
  PaneResizeHandle,
  SHUT_BAR_SIZE,
  ShutPaneBar,
  useShuttingSplit,
} from '@/features/circuit-viewer/pane-resize-handle';
import { useResultsSidePanel } from '@/features/scan-config/components/shared/results-layout';
import { BOX_CLASS } from '@/features/spike-viewer/spike-statistics/statistics-plots';
import { PILL_CLASS } from '@/ui/molecules/select/pill-select';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/** Either side of the grab bar between the panes. */
const GUTTER = 12;
/** What each pane keeps while open, until dragged on under half of it: its box and the gutter. */
const DEFAULT_FLOORS = [GUTTER + 200, GUTTER + 160] as const;
/** The panel's: the 3D player over the statistics, whose plot needs room under its controls. */
export const PANEL_FLOORS = [GUTTER + 200, GUTTER + 220] as const;

/**
 * The bottom pane's room as last dragged, by split: kept for the next file, as
 * a pick from the bar over the panel mounts it anew.
 */
const bottomRoomAtoms = {
  file: atom<number | null>(null),
  panel: atom<number | null>(null),
};

export type StackedPane = {
  /** What its bar says once it is shut. */
  title: string;
  content: ReactNode;
  /**
   * For a WebGL view: shut, it keeps its size out of sight rather than leave
   * the layout, so nothing in it is squeezed or torn down.
   */
  keepsSize?: boolean;
  /** The box's own padding, and anything else it needs, such as clipping a scene to its corners. */
  boxClassName?: string;
};

/**
 * Two views of a results layout's file or panel, each in a white box, one over
 * the other either side of a grab bar. Dragged far enough, the bar shuts a box
 * into a bar naming it, which the layout keeps (`split` is its name there),
 * and the other takes the room. Without a bottom pane the top one has it all.
 */
export function StackedPanes({
  split,
  top,
  bottom = null,
  bottomShare = 0.5,
  floors = DEFAULT_FLOORS,
  header,
}: {
  split: 'file' | 'panel';
  top: StackedPane;
  bottom?: StackedPane | null;
  /** The bottom pane's share of the room until the bar is dragged. */
  bottomShare?: number;
  /** What the top pane and the bottom one keep while open, the gutter included. */
  floors?: readonly [number, number];
  /** Over the panes, such as the population on show and the button opening the panel. */
  header?: ReactNode;
}) {
  const sidePanel = useResultsSidePanel();
  // A layout effect, seeded by hand: the observer's first report only lands a
  // frame after `observe`, and the panes would be sized off a zero height.
  const areaRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    setHeight(area.getBoundingClientRect().height);
    const observer = new ResizeObserver(([entry]) => setHeight(entry.contentRect.height));
    observer.observe(area);
    return () => observer.disconnect();
  }, []);
  const [chosen, setChosen] = useAtom(bottomRoomAtoms[split]);
  const panes = useShuttingSplit({
    chosen,
    onChosenChange: setChosen,
    shut: sidePanel?.shuts[split] ?? null,
    onShutChange: sidePanel && bottom ? (shut) => sidePanel.setShut(split, shut) : undefined,
    total: height,
    floors,
    preferred: Math.round(height * bottomShare),
  });
  const topShut = panes.shut === 'start';
  const bottomShut = panes.shut === 'end';
  // The bottom pane's room, the gutter over it included: a shut pane is its
  // bar, and the other takes the rest.
  const room = !bottom
    ? 0
    : topShut
      ? height - (SHUT_BAR_SIZE + GUTTER)
      : bottomShut
        ? GUTTER + SHUT_BAR_SIZE
        : panes.size;

  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      {header}
      <div className="flex min-h-0 flex-1">
        <div ref={areaRef} className="relative min-h-0 min-w-0 flex-1">
          <div
            className={cn(
              BOX_CLASS,
              'absolute inset-x-0 top-0 flex flex-col',
              top.boxClassName,
              topShut && (top.keepsSize ? 'pointer-events-none invisible' : 'hidden')
            )}
            style={{ bottom: bottom ? (topShut ? panes.size : room) + GUTTER : 0 }}
            aria-hidden={topShut || undefined}
            inert={topShut || undefined}
          >
            {top.content}
          </div>
          {bottom && (
            <div
              className={cn(
                BOX_CLASS,
                'absolute inset-x-0 bottom-0 flex flex-col',
                bottom.boxClassName,
                bottomShut && (bottom.keepsSize ? 'pointer-events-none invisible' : 'hidden')
              )}
              style={{ height: (bottomShut ? panes.size : room) - GUTTER }}
              aria-hidden={bottomShut || undefined}
              inert={bottomShut || undefined}
            >
              {bottom.content}
            </div>
          )}
          {topShut && (
            <ShutPaneBar
              title={top.title}
              className="absolute inset-x-0 top-0"
              onOpen={panes.open}
            />
          )}
          {bottom && bottomShut && (
            <ShutPaneBar
              title={bottom.title}
              className="absolute inset-x-0 bottom-0"
              onOpen={panes.open}
            />
          )}
          {bottom && (
            // Over the bottom pane, or its bar. The floors live in the split,
            // which knows when the room is too short to honour them.
            <div className="absolute inset-x-0" style={{ bottom: room }}>
              <PaneResizeHandle
                containerRef={areaRef}
                minHeight={0}
                onResize={panes.onResize}
                onDragChange={panes.onDragChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A results view's file column while its report loads, laid out as it will be:
 * the plot's box waiting, and the nodes table the view before kept in its own,
 * so a table over the same cells stays where it is.
 */
export function LoadingFilePanes({
  title,
  panelTitles,
}: {
  /** What the plot over the table is called, for its bar if it is shut. */
  title: string;
  panelTitles: readonly string[];
}) {
  const sidePanel = useResultsSidePanel();
  return (
    <StackedPanes
      split="file"
      header={
        sidePanel &&
        !sidePanel.open && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <Skeleton className="h-9 w-56 rounded-full" />
            <OpenPanelButton titles={panelTitles} onOpen={() => sidePanel.setOpen(true)} />
          </div>
        )
      }
      top={{
        title,
        content: (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <Spin />
          </div>
        ),
      }}
      bottom={{
        title: 'Neuron Table',
        boxClassName: 'px-3 pt-1 pb-2',
        content: (
          <KeptNodesGridPlaceholder
            fallback={<Skeleton className="my-2 min-h-0 flex-1 rounded-lg" />}
          />
        ),
      }}
    />
  );
}

/** Over a file's panes while the panel is not up: opens it, naming what it holds. */
export function OpenPanelButton({
  titles,
  onOpen,
}: {
  titles: readonly string[];
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(PILL_CLASS, 'shrink-0 bg-purple-600 text-white hover:bg-purple-700')}
    >
      {titles.join(' · ')}
      <RiArrowRightLine className="size-4" />
    </button>
  );
}
