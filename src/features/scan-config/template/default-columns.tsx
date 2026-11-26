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
import {
  BLOCKS_AND_FORM_COLUMNS_CLASS,
  BOX_CLASS,
} from '@/features/scan-config/components/shared/box-class';
import { Right } from '@/features/scan-config/components/ui-columns';
import { ScanConfigActivity } from '@/features/scan-config/types';
import { StackedPanes } from '@/features/spike-viewer/spike-statistics/stacked-panes';
import { StackedSplit } from '@/features/spike-viewer/types';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/utils/css-class';

import { useCollapsingColumns } from './collapsing-columns';
import { LeftColumn, MiddleColumn } from './columns';

import type { FocusEvent as ReactFocusEvent, ReactNode, RefObject } from 'react';
import type { TStackedSplit } from '@/features/spike-viewer/types';
import type { ScanConfigTemplateProps } from './types';
import type { ScanConfigTemplateState } from './use-scan-config-template';

type Props = {
  props: ScanConfigTemplateProps;
  state: ScanConfigTemplateState;
};

/**
 * Default scan-config layout: Left tabs, Middle form, Right preview in a
 * `1fr 1fr 2fr` grid.
 *
 * The page opens on the blocks' list alone, in a slim window on the left, the form folded away
 * and the preview spread over the rest. The form opens out beside the list, the preview
 * narrowing to make room, when a block is picked, and folds away again when there is no form to
 * show, or by the × at its top right.
 *
 * Dragging the preview's left edge left narrows the middle column, then shuts it, then shuts the
 * left one too, into a Parameters bar, so the preview, the 3D view and its table, has the width.
 * The form shut alone leaves no bar: picking a block opens it again. The bar opens both. The edge
 * never drags right of the middle, so the preview keeps half the width at least.
 */
export function DefaultConfigColumns({ props, state }: Props) {
  const boxed = props.activity === ScanConfigActivity.Simulate;
  const { gridRef, template, shut, onEdgeDrag, reset } = useCollapsingColumns();
  // Opening a block, from the list or the table's Neuron Set, shows its form again.
  const opened = `${state.selectedRootElement}/${state.selectedEntry}`;
  const lastOpened = useRef(opened);
  useEffect(() => {
    if (lastOpened.current === opened) return;
    lastOpened.current = opened;
    if (shut !== 'none') reset();
  }, [opened, shut, reset]);
  // A pick in the list counts even where it changes nothing: the block already selected.
  const picking =
    <A extends unknown[]>(set: (...args: A) => void) =>
    (...args: A) => {
      set(...args);
      state.setFormRevealed(true);
      if (shut === 'middle') reset();
    };
  const listState: ScanConfigTemplateState = {
    ...state,
    setSelectedRootElement: picking(state.setSelectedRootElement),
    setSelectedEntry: picking(state.setSelectedEntry),
  };
  const alone = shut === 'none' && (!state.formRevealed || !state.editing);
  // Folded, the list is alone whatever width the form had been dragged to: that width is back
  // when it opens again.
  const dragged = template !== null && !alone;
  const phone = useMediaQuery('(max-width: 767px)', false);
  if (phone) return <PhoneConfigColumns props={props} state={state} />;
  return (
    <div
      ref={gridRef}
      className={cn(
        'grid h-full min-h-0 w-full gap-1.25 *:min-w-0',
        !dragged && [COLUMNS_EASE, alone ? ALONE_COLUMNS_GRID : DEFAULT_COLUMNS_GRID]
      )}
      style={dragged ? { gridTemplateColumns: template } : undefined}
    >
      {/* The blocks and their form in one window, as the preview's views are: its ring a pixel
          under the page's clip, its foot level with theirs. The form keeps only the rule between
          the two, and a subgrid keeps both on the grid's tracks as they are dragged. */}
      <div
        className={cn(
          BOX_CLASS,
          // a pixel in for its ring, which then meets the project selector's left edge
          'mt-px mb-3 ml-px grid min-h-0 grid-rows-1 gap-x-0 overflow-hidden py-3',
          shut === 'none' ? cn('col-span-2', BLOCKS_AND_FORM_COLUMNS_CLASS) : 'grid-cols-1',
          shut === 'both' && 'hidden'
        )}
      >
        <div className="h-full min-h-0">
          {/* folded, a form is not showing even for a block picked: a click on it opens it */}
          <LeftColumn props={props} state={listState} formShown={!alone && shut === 'none'} />
        </div>
        {shut === 'none' && (
          <div
            className={cn(
              'h-full min-h-0 min-w-0 border-l border-gray-200',
              alone ? 'opacity-0' : 'opacity-100 transition-opacity delay-160 duration-650'
            )}
            // folded away, it is not there to read, to click or to tab into either
            inert={alone}
          >
            <MiddleColumn
              props={props}
              state={state}
              // scrolls to the window's edges, over its padding
              className="-my-3 h-[calc(100%+1.5rem)] border-x-0 py-3"
              // the × at the form's top right folds it away again, until a block is next picked
              onClose={() => state.setFormRevealed(false)}
            />
          </div>
        )}
      </div>
      {shut === 'middle' && (
        // the form's track with nothing in it, so the preview keeps its own
        <div aria-hidden />
      )}
      {shut === 'both' && (
        // Its ring a pixel under the page's clip, and its foot level with the preview's boxes:
        // with the list shut too, the one way back.
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

/** How long a loading preview keeps its table's box before deciding none is coming (ms). */
const TABLE_WAIT_MS = 8000;
/**
 * The right column. A simulation's is boxed as its results' views are, so its
 * Configuration and Simulations tabs read as one: the preview in a box, and the
 * 3D view's nodes table in one of its own under it, either side of the same
 * grab bar, which shuts either one into a bar.
 */
export function PreviewColumn({
  boxed,
  split = StackedSplit.Config,
  edge,
  children,
}: {
  boxed: boolean;
  split?: Extract<TStackedSplit, typeof StackedSplit.Config | typeof StackedSplit.Isolated>;
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
          split={split}
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
                          <div
                            key={i}
                            className={cn('h-4 animate-pulse rounded-full bg-gray-100', w)}
                          />
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
/** The same with the form's track folded to nothing and the preview the wider for it. */
const ALONE_COLUMNS_GRID = 'grid-cols-[minmax(0,1fr)_minmax(0,0fr)_minmax(0,3fr)]';
/** The form opening out beside the list, and folding away. */
const COLUMNS_EASE =
  'transition-[grid-template-columns] duration-650 ease-[cubic-bezier(0.22,1,0.36,1)]';

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
  away = false,
  children,
}: {
  title: string;
  anchor: HTMLElement | null;
  open: boolean;
  onOpen: () => void;
  /** faded out and untouchable, while a field of the form is typed into */
  away?: boolean;
  children: ReactNode;
}) {
  const rect = useAnchorRect(anchor, open);
  const tile = (
    <div
      className={cn(
        'fixed overflow-hidden transition-opacity duration-200 ease-out',
        open ? 'z-[70] rounded-3xl' : 'ring-primary-9/10 z-30 rounded-2xl bg-white ring-1',
        away && !open && 'pointer-events-none opacity-0',
        (!rect || !rect.shown) && 'invisible'
      )}
      style={
        rect
          ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
          : undefined
      }
    >
      <div
        className={cn(
          'min-h-0',
          open ? 'h-full' : 'pointer-events-none absolute top-0 left-0 origin-top-left'
        )}
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
 * The scan config on a phone (the user asked): the 3D view as a small tile at the top; a tap opens it and its table
 * over the screen, stacked as on a wide screen, the grab bar between them dragging and shutting either into a bar.
 * Under the tile one of the two config columns at a time: the blocks, then the form of the one tapped (a group's
 * entries opening in the list first), with the way back to the blocks.
 */
function PhoneConfigColumns({ props, state }: Props) {
  const boxed = props.activity === ScanConfigActivity.Simulate;
  const table = useSceneTablePaneHost();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(false);
  // where the previews sit: their small slots, and their panes while open
  const [viewSlot, setViewSlot] = useState<HTMLDivElement | null>(null);
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
  const typing = usePhoneTyping();
  return (
    <SceneTablePaneProvider value={table.value}>
      {/* the tabs along the foot step aside too, as the keyboard takes their place */}
      {typing.on && <style>{'nav[aria-label="Project"] { display: none; }'}</style>}
      <div className="flex h-full min-h-0 w-full flex-col gap-2 px-1 pb-2">
        {/* The 3D view alone over the config, its table only with it once it is opened (the user asked). While a
            field is typed into it folds away, smoothly, so the form has the screen over the keyboard (the user
            asked); it comes back as the keyboard goes. */}
        <div
          className={cn(
            'flex shrink-0 overflow-hidden transition-[height,opacity,margin] duration-300 ease-out',
            typing.on ? '-mb-2 h-0 opacity-0' : 'h-36 opacity-100'
          )}
        >
          <div ref={setViewSlot} className="h-36 min-w-0 flex-1" />
        </div>
        <div
          className={cn(BOX_CLASS, 'min-h-0 flex-1 overflow-hidden py-3')}
          onFocus={typing.onFocus}
          onBlur={typing.onBlur}
        >
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
              <MiddleColumn
                props={props}
                state={state}
                className="min-h-0 flex-1 border-r-0 border-l-0"
              />
            </div>
          ) : (
            <div className="h-full min-h-0">
              {/* the form takes the list's place here, so a tap in the list always opens it */}
              <LeftColumn props={props} state={listState} formShown={false} />
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
                top={{
                  title: '3D View',
                  keepsSize: true,
                  content: <div ref={setViewPane} className="h-full" />,
                }}
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
      <PhoneTile
        title="3D View"
        anchor={open ? viewPane : viewSlot}
        open={open}
        onOpen={() => setOpen(true)}
        away={typing.on}
      >
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
          anchor={open ? tablePane : null}
          open={open}
          onOpen={() => setOpen(true)}
          // no tile of its own over the config: shown only with the 3D view, opened
          away={typing.on || !open}
        >
          <div
            ref={table.setTarget}
            className="flex h-full min-h-0 flex-col bg-white px-3 pt-1 pb-2"
          />
        </PhoneTile>
      )}
    </SceneTablePaneProvider>
  );
}

/** What raises a phone's keyboard: a text field that can be typed into, not a checkbox or a read-only picker. */
const TYPED_FIELD =
  'input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]):not([readonly]), textarea:not([readonly]), [contenteditable="true"]';
/** How long after the keyboard starts opening a field is brought up into view (ms). */
const KEYBOARD_MS = 350;
/** How far under the top of its scrolling box a field typed into is put (px). */
const FIELD_TOP_GAP = 56;

/** The nearest box `el` scrolls in, up to and including `limit`. */
function scrollBoxOf(el: HTMLElement, limit: HTMLElement): HTMLElement | null {
  for (let s = el.parentElement; s; s = s.parentElement) {
    const { overflowY } = getComputedStyle(s);
    if ((overflowY === 'auto' || overflowY === 'scroll') && s.scrollHeight > s.clientHeight)
      return s;
    if (s === limit) return null;
  }
  return null;
}

/**
 * Whether a field of the phone's form is being typed into, from focus going in and out of it: on as one takes the
 * focus, off a moment after the last lets it go, so going from one field to the next does not bring the previews
 * back between them. The field is brought up near the top of its box once the keyboard is up, above it.
 */
function usePhoneTyping() {
  const [on, setOn] = useState(false);
  const leaving = useRef<number | null>(null);
  const raising = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (leaving.current) window.clearTimeout(leaving.current);
      if (raising.current) window.clearTimeout(raising.current);
    },
    []
  );
  const onFocus = (e: ReactFocusEvent<HTMLElement>) => {
    const field = e.target as HTMLElement;
    // its own fields only: a dialog opened from it (the campaign's name) is portalled out of it, its focus still
    // passing through here
    if (!field.matches?.(TYPED_FIELD) || !e.currentTarget.contains(field)) return;
    if (leaving.current) window.clearTimeout(leaving.current);
    leaving.current = null;
    setOn(true);
    const box = e.currentTarget;
    if (raising.current) window.clearTimeout(raising.current);
    raising.current = window.setTimeout(() => {
      const scroller = scrollBoxOf(field, box);
      if (!scroller || document.activeElement !== field) return;
      const top =
        field.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop -
        FIELD_TOP_GAP;
      scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }, KEYBOARD_MS);
  };
  const onBlur = (e: ReactFocusEvent<HTMLElement>) => {
    if (
      !(e.target as HTMLElement).matches?.(TYPED_FIELD) ||
      !e.currentTarget.contains(e.target as Node)
    )
      return;
    if (leaving.current) window.clearTimeout(leaving.current);
    leaving.current = window.setTimeout(() => {
      leaving.current = null;
      const now = document.activeElement as HTMLElement | null;
      if (!now?.matches?.(TYPED_FIELD)) setOn(false);
    }, 200);
  };
  return { on, onFocus, onBlur };
}
