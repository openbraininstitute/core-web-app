'use client';

import { RiArrowLeftLine, RiCloseLine } from '@remixicon/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { tablePaneTitle } from '@/features/circuit-nodes/types';
import { PaneSideResizeHandle, ShutPaneBar } from '@/features/circuit-viewer/pane-resize-handle';
import {
  SceneTablePaneProvider,
  useSceneTablePaneHost,
} from '@/features/circuit-viewer/scene-table-pane';
import { BOX_CLASS } from '@/features/scan-config/components/shared/box-class';
import { Right } from '@/features/scan-config/components/ui-columns';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { StackedPanes } from '@/features/spike-viewer/spike-statistics/stacked-panes';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/utils/css-class';

import { useCollapsingColumns } from './collapsing-columns';
import { LeftColumn, MiddleColumn } from './columns';

import type { ReactNode, RefObject } from 'react';
import type { ScanConfigTemplateProps } from './types';
import type { ScanConfigTemplateState } from './use-scan-config-template';

type Props = {
  props: ScanConfigTemplateProps;
  state: ScanConfigTemplateState;
};

/**
 * Default scan-config layout: Left tabs, Middle form, Right preview in a
 * `1fr 1fr 2fr` grid. Dragging the preview's left edge left narrows the middle
 * column, then shuts it into a Parameters bar, then shuts the left one into the
 * same bar, so the preview, the 3D view and its table, has the width; the bar
 * opens them again. It never drags right of the middle, so the preview keeps
 * half the width at least.
 */
export function DefaultConfigColumns({ props, state }: Props) {
  const boxed = props.activity === ScanConfigActivity.Simulate;
  // the form dragged shut leaves no Parameters bar: it comes back on a block selected or added (the user asked)
  const { gridRef, template, shut, onEdgeDrag, reset } = useCollapsingColumns({ middleBar: false });
  // Opening a block, from the list or the table's Neuron Set, shows its form again.
  const opened = `${state.selectedRootElement}/${state.selectedEntry}`;
  const lastOpened = useRef(opened);
  // The blocks' list alone in a slim window on the left, the form folded away and the preview, the 3D view and its
  // table, spread over the rest, until there is a form to fill: a block with a form of its own selected, one of a
  // block's entries opened, or a new one added ("Add …"). Then the form opens out beside the list and the preview
  // narrows to make room; opening a block that is only a list of entries (Stimuli) folds it away again (the user
  // asked). The form open on the page's first block at the start waits for a click.
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (lastOpened.current === opened) return;
    lastOpened.current = opened;
    setRevealed(true);
    if (shut !== 'none') reset();
  }, [opened, shut, reset]);
  const alone = shut === 'none' && (!revealed || !state.editing);
  const phone = useMediaQuery('(max-width: 767px)', false);
  if (phone) return <PhoneConfigColumns props={props} state={state} />;
  return (
    <div
      ref={gridRef}
      className="grid h-full min-h-0 w-full gap-1.25 *:min-w-0"
      style={
        template
          ? { gridTemplateColumns: template }
          : {
              // the default tracks, the form's folded to nothing while the list is alone; eased between the two
              gridTemplateColumns: alone ? ALONE_TRACKS : DEFAULT_TRACKS,
              transition: `grid-template-columns ${REVEAL_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            }
      }
    >
      {/* The blocks and their form in one window, as the preview's views are: its ring a pixel
          under the page's clip, its foot level with theirs. The form keeps only the rule between
          the two, and a subgrid keeps both on the grid's tracks as they are dragged. */}
      <div
        className={cn(
          BOX_CLASS,
          // a pixel in for its ring, which then meets the project selector's left edge
          'mt-px mb-3 ml-px grid min-h-0 grid-rows-1 gap-x-0 overflow-hidden py-3',
          shut === 'none' ? 'col-span-2 grid-cols-subgrid' : 'grid-cols-1',
          shut === 'both' && 'hidden'
        )}
      >
        {/* any click on a block, an entry or "Add …" lets the form show, if the block has one to fill */}
        <div
          className="h-full min-h-0"
          onClickCapture={(e) => {
            if (
              (e.target as Element).closest(
                'button, a, [role="button"], [data-testid^="scan-config-root-element-"]'
              )
            ) {
              setRevealed(true);
              // a block selected, even the one that already is, or added, opens a form dragged shut
              if (shut === 'middle') reset();
            }
          }}
        >
          <LeftColumn props={props} state={state} />
        </div>
        {shut === 'none' && (
          <div
            className={cn('h-full min-h-0 min-w-0', alone && 'pointer-events-none')}
            aria-hidden={alone || undefined}
            style={{
              opacity: alone ? 0 : 1,
              transition: `opacity ${REVEAL_MS}ms ease ${alone ? 0 : 160}ms`,
            }}
          >
            <MiddleColumn props={props} state={state} className="border-r-0" />
          </div>
        )}
      </div>
      {shut === 'middle' && (
        // the form's track, nothing in it, so the preview keeps its own
        <div aria-hidden />
      )}
      {shut === 'both' && (
        // Its ring a pixel under the page's clip, and its foot level with the preview's boxes: with the list shut
        // too, the one way back.
        <ShutPaneBar upright title="Parameters" onOpen={reset} className="mt-px mb-3 ml-px" />
      )}
      <PreviewColumn boxed={boxed} edge={{ gridRef, onDrag: onEdgeDrag, onReset: reset }}>
        <Right
          activity={props.activity}
          entityType={props.entityType}
          entity={props.entity}
          selectedEntry={state.selectedEntry}
          selectedRootElement={state.selectedRootElement}
          onCreateEntry={state.createEntry}
          config={state.config}
          setConfig={state.setConfig}
          schema={props.schema}
          schemaMappingConfig={props.schemaMappingConfig}
          locked={state.editingLocked}
          inset={boxed}
        />
      </PreviewColumn>
    </div>
  );
}

/** How long the form takes to open out beside the list (ms). */
const REVEAL_MS = 650;
/** How long a loading preview keeps its table's box before deciding none is coming (ms). */
const TABLE_WAIT_MS = 8000;
/** The columns as DEFAULT_COLUMNS_GRID has them, and with the form folded to nothing and the preview the wider. */
const DEFAULT_TRACKS = 'minmax(0,1fr) minmax(0,1fr) minmax(0,2fr)';
const ALONE_TRACKS = 'minmax(0,1fr) minmax(0,0fr) minmax(0,3fr)';

/**
 * The right column. A simulation's is boxed as its results' views are, so its
 * Configuration and Simulations tabs read as one: the preview in a box, and the
 * 3D view's nodes table in one of its own under it, either side of the same
 * grab bar, which shuts either one into a bar.
 */
export function PreviewColumn({
  boxed,
  edge,
  children,
}: {
  boxed: boolean;
  /** The grab bar on its left edge, which the columns before it give way to. */
  edge?: {
    gridRef: RefObject<HTMLDivElement | null>;
    onDrag: (x: number) => void;
    onReset: () => void;
  };
  children: ReactNode;
}) {
  const table = useSceneTablePaneHost();
  // While the scene loads, its table's box is kept, empty, so the preview has its final shape from the start (the
  // user asked the loading page to match it), until the table claims it; with none coming, it goes after a while.
  const [awaitingTable, setAwaitingTable] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setAwaitingTable(false), TABLE_WAIT_MS);
    return () => window.clearTimeout(t);
  }, []);
  const handle = edge && (
    // A double click puts the columns back as they were. Boxed, the bar sits halfway between the
    // column before and the box: past the grid's gap (0.3125rem) the box is inset 0.75rem.
    <div
      onDoubleClick={edge.onReset}
      className={cn('absolute inset-y-0 left-0', boxed && 'left-[0.21875rem]')}
    >
      <PaneSideResizeHandle containerRef={edge.gridRef} minWidth={0} onResize={edge.onDrag} />
    </div>
  );
  if (!boxed) {
    return (
      <div className="relative h-full min-h-0 min-w-0">
        {handle}
        <div className="h-full min-h-0 overflow-hidden">{children}</div>
      </div>
    );
  }
  return (
    <SceneTablePaneProvider value={table.value}>
      <div className="relative h-full min-h-0 min-w-0">
        {handle}
        <StackedPanes
          split="config"
          bottomShare={0.4}
          top={{
            title: '3D View',
            keepsSize: true,
            boxClassName: 'overflow-hidden',
            content: children,
          }}
          bottom={
            table.shown
              ? {
                  title: tablePaneTitle(table.view),
                  boxClassName: 'px-3 pt-1 pb-2',
                  content: <div ref={table.setTarget} className="flex h-full min-h-0 flex-col" />,
                }
              : awaitingTable
                ? {
                    title: tablePaneTitle(table.view),
                    boxClassName: 'px-3 pt-1 pb-2',
                    content: (
                      <div className="flex h-full min-h-0 flex-col gap-3 pt-2" aria-hidden>
                        {['w-full', 'w-full', 'w-4/5', 'w-3/5'].map((w, i) => (
                          // eslint-disable-next-line react/no-array-index-key -- fixed placeholder lines
                          <div key={i} className={cn('h-4 animate-pulse rounded-full bg-gray-100', w)} />
                        ))}
                      </div>
                    ),
                  }
                : null
          }
        />
      </div>
    </SceneTablePaneProvider>
  );
}

export const DEFAULT_COLUMNS_GRID = 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]';

/** How much smaller than the screen a preview is drawn in its small tile. */
const TILE_SCALE = 0.4;

type TRect = { left: number; top: number; width: number; height: number };

/**
 * Where `anchor` is on the screen, and whether it shows: followed every frame while `live` (a pane being dragged or
 * shut), else on resizes and scrolls.
 */
function useAnchorRect(anchor: HTMLElement | null, live: boolean) {
  const [rect, setRect] = useState<(TRect & { shown: boolean }) | null>(null);
  useEffect(() => {
    if (!anchor) return;
    const measure = () => {
      const r = anchor.getBoundingClientRect();
      const shown = r.width > 1 && r.height > 1 && getComputedStyle(anchor).visibility !== 'hidden';
      setRect((was) =>
        was &&
        was.left === r.left &&
        was.top === r.top &&
        was.width === r.width &&
        was.height === r.height &&
        was.shown === shown
          ? was
          : { left: r.left, top: r.top, width: r.width, height: r.height, shown }
      );
    };
    measure();
    if (live) {
      let frame = requestAnimationFrame(function loop() {
        measure();
        frame = requestAnimationFrame(loop);
      });
      return () => cancelAnimationFrame(frame);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(anchor);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [anchor, live]);
  return rect;
}

/**
 * A preview on a phone, at the page's top (a portal), laid over `anchor`: a small tile at the top of the config,
 * drawn as on the whole screen and shrunk (the user asked), which a tap opens; or, open, its pane in the stacked
 * panes over the screen. The same element throughout, so a 3D view is not drawn anew.
 */
function PhoneTile({
  title,
  anchor,
  open,
  onOpen,
  children,
}: {
  title: string;
  anchor: HTMLElement | null;
  open: boolean;
  onOpen: () => void;
  children: ReactNode;
}) {
  const rect = useAnchorRect(anchor, open);
  const tile = (
    <div
      className={cn(
        'fixed overflow-hidden',
        open ? 'z-[70] rounded-3xl' : 'ring-primary-9/10 z-30 rounded-2xl bg-white ring-1',
        (!rect || !rect.shown) && 'invisible'
      )}
      style={rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : undefined}
    >
      <div
        className={cn('min-h-0', open ? 'h-full' : 'pointer-events-none absolute top-0 left-0 origin-top-left')}
        style={
          open
            ? undefined
            : {
                width: `${100 / TILE_SCALE}%`,
                height: `${100 / TILE_SCALE}%`,
                transform: `scale(${TILE_SCALE})`,
              }
        }
      >
        {children}
      </div>
      {!open && (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Open the ${title.toLowerCase()}`}
          className="absolute inset-0 flex items-end justify-start p-2"
        >
          <span className="text-primary-9 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold shadow">
            {title}
          </span>
        </button>
      )}
    </div>
  );
  return typeof document === 'undefined' ? null : createPortal(tile, document.body);
}

/**
 * The scan config on a phone (the user asked): the 3D view and its table as small tiles side by side at the top; a
 * tap on either opens both over the screen, stacked as on a wide screen, the grab bar between them dragging and
 * shutting either into a bar. Under the tiles one of the two config columns at a time: the blocks, then the form of
 * the one tapped (a group's entries opening in the list first), with the way back to the blocks.
 */
function PhoneConfigColumns({ props, state }: Props) {
  const boxed = props.activity === ScanConfigActivity.Simulate;
  const table = useSceneTablePaneHost();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(false);
  // where the previews sit: their small slots, and their panes while open
  const [viewSlot, setViewSlot] = useState<HTMLDivElement | null>(null);
  const [tableSlot, setTableSlot] = useState<HTMLDivElement | null>(null);
  const [viewPane, setViewPane] = useState<HTMLDivElement | null>(null);
  const [tablePane, setTablePane] = useState<HTMLDivElement | null>(null);
  const withTable = boxed && table.shown;
  // a block tapped in the list, or one made there, shows its form (even the one already selected)
  const toForm =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      fn(...args);
      setForm(true);
    };
  const listState: ScanConfigTemplateState = {
    ...state,
    setSelectedRootElement: toForm(state.setSelectedRootElement),
    setSelectedEntry: toForm(state.setSelectedEntry),
  };
  return (
    <SceneTablePaneProvider value={table.value}>
      <div className="flex h-full min-h-0 w-full flex-col gap-2 px-1 pb-2">
        <div className="flex shrink-0 gap-2">
          <div ref={setViewSlot} className="h-28 min-w-0 flex-1" />
          {withTable && <div ref={setTableSlot} className="h-28 min-w-0 flex-1" />}
        </div>
        <div className={cn(BOX_CLASS, 'min-h-0 flex-1 overflow-hidden py-3')}>
          {form && state.editing && state.selectedSchema !== undefined ? (
            <div className="flex h-full min-h-0 flex-col">
              <button
                type="button"
                onClick={() => setForm(false)}
                className="text-primary-9 border-neutral-2 mx-3 mb-2 flex h-9 shrink-0 items-center gap-1.5 self-start rounded-full border bg-white px-3 text-[13px] font-semibold"
              >
                <RiArrowLeftLine className="size-4" />
                Blocks
              </button>
              <MiddleColumn props={props} state={state} className="min-h-0 flex-1 border-r-0 border-l-0" />
            </div>
          ) : (
            <div className="h-full min-h-0">
              <LeftColumn props={props} state={listState} />
            </div>
          )}
        </div>
      </div>
      {/* open: both stacked over the screen, the previews laid over their panes */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[65] flex flex-col bg-[#f5f7fa]">
            <div className="flex h-12 shrink-0 items-center justify-between px-4">
              <span className="text-primary-9 text-[16px] font-bold">Preview</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close the preview"
                className="text-primary-9 relative z-[71] flex size-9 items-center justify-center rounded-full hover:bg-neutral-200"
              >
                <RiCloseLine className="size-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 pr-2">
              <StackedPanes
                split="config"
                bottomShare={0.4}
                top={{ title: '3D View', keepsSize: true, content: <div ref={setViewPane} className="h-full" /> }}
                bottom={
                  withTable
                    ? {
                        title: tablePaneTitle(table.view),
                        content: <div ref={setTablePane} className="h-full" />,
                      }
                    : null
                }
              />
            </div>
          </div>,
          document.body
        )}
      <PhoneTile title="3D View" anchor={open ? viewPane : viewSlot} open={open} onOpen={() => setOpen(true)}>
        <div className="h-full min-h-0 overflow-hidden">
          <Right
            activity={props.activity}
            entityType={props.entityType}
            entity={props.entity}
            selectedEntry={state.selectedEntry}
            selectedRootElement={state.selectedRootElement}
            onCreateEntry={state.createEntry}
            config={state.config}
            setConfig={state.setConfig}
            schema={props.schema}
            schemaMappingConfig={props.schemaMappingConfig}
            locked={state.editingLocked}
            inset={boxed}
          />
        </div>
      </PhoneTile>
      {withTable && (
        <PhoneTile
          title={tablePaneTitle(table.view)}
          anchor={open ? tablePane : tableSlot}
          open={open}
          onOpen={() => setOpen(true)}
        >
          <div ref={table.setTarget} className="flex h-full min-h-0 flex-col bg-white px-3 pt-1 pb-2" />
        </PhoneTile>
      )}
    </SceneTablePaneProvider>
  );
}
