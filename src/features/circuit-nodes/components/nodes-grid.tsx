import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Modal } from 'antd';

ModuleRegistry.registerModules([AllCommunityModule]);

import {
  RiArrowRightSLine,
  RiCheckLine,
  RiDownload2Line,
  RiLoader4Line,
  RiResetLeftLine,
  RiSubtractLine,
  RiTable3,
} from '@remixicon/react';
import capitalize from 'es-toolkit/compat/capitalize';
import isEqual from 'es-toolkit/compat/isEqual';
import { saveAs } from 'file-saver';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { CategoricalFilter } from '@/features/circuit-nodes/components/categorical-filter';
import { ColumnChooser } from '@/features/circuit-nodes/components/column-chooser';
import { ColumnHeader } from '@/features/circuit-nodes/components/column-header';
import { NumericFilter } from '@/features/circuit-nodes/components/numeric-filter';
import { TextFilter } from '@/features/circuit-nodes/components/text-filter';
import { readAllRows, toCsv } from '@/features/circuit-nodes/nodes-csv';
import { PREFERRED_COLUMNS } from '@/features/circuit-nodes/types';
import { PaneSideResizeHandle } from '@/features/circuit-viewer/pane-resize-handle';
import { PillToggle, ROUND_PILL_CLASS } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';
import { logError } from '@/utils/logger';

import type {
  CellMouseOverEvent,
  ColDef,
  ColumnMovedEvent,
  FilterChangedEvent,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  IDatasource,
  IHeaderParams,
  RowClassParams,
  RowClickedEvent,
  ValueFormatterParams,
} from 'ag-grid-community';
import type {
  ColumnMeta,
  FilterModel,
  SortDirection,
  SortItem,
} from '@/features/circuit-nodes/types';

const PREFERRED_NAME_SET = new Set(PREFERRED_COLUMNS.map((p) => p.name));

const CATEGORICAL_SET_FILTER_MAX = 100;

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

/**
 * A numeric column held against the grid's right edge, such as a spike
 * statistic. Always shown and left out of the column chooser: it is what the
 * host put the table up for, not one of the file's columns. The grid sizes
 * them, sharing part of its width between them as it resizes.
 */
export type PinnedColumn = {
  /** The column's name in the nodes session. */
  name: string;
  headerName: string;
  /**
   * The header in a column too narrow for `headerName`, which is then shown
   * over it, with what the values are in small and muted after it.
   */
  short?: { headerName: string; unit?: string };
  /** Text for a value; `NaN` renders blank without asking. */
  format?: (value: number) => string;
  /** Text for a value in a column too narrow for `format`'s. */
  compactFormat?: (value: number) => string;
};

type Props = {
  columns: ColumnMeta[];
  rowCount: number;
  filteredCount: number | null;
  datasource: IDatasource;
  visibleColumns: Set<string>;
  onVisibleColumnsChange: (next: Set<string>) => void;
  pinnedColumns?: readonly PinnedColumn[];
  /** Changes whenever the pinned columns' values do, so the rows are paged in again. */
  pinnedVersion?: unknown;
  onFilterModelChange?: (model: FilterModel) => void;
  /**
   * Filters to start with, kept from an earlier grid over the same rows. They go
   * back on once every column they name is in, unless the filters change first.
   */
  initialFilterModel?: FilterModel;
  /**
   * Whose filters these are, where views take the grid over in turn: a new
   * scope's `initialFilterModel` replaces the last one's filters.
   */
  filterScope?: string;
  /** Called with a clicked row's node id, and a nested row's key after its row's. */
  onRowClick?: (nodeId: number, nested?: number) => void;
  /**
   * The rows to draw as selected, by node id. Held by the host rather than the
   * grid: the infinite row model drops selection with every page it reloads,
   * and a host picking cells wants them kept through sorts and filters.
   */
  selectedNodeIds?: PickedRows;
  /** Adds a tick column, for hosts whose clicks pick several rows at once. */
  pickColumn?: boolean;
  /**
   * A tick atop that column for every row the table shows at once: whether all,
   * some or none of them are picked, and what a click on it should do.
   */
  pickAll?: { state: PickAllState; onToggle: () => void };
  /**
   * Called with the node id of the row under the pointer, and a nested row's key after its
   * row's, once per row, and null when it leaves the grid.
   */
  onRowHover?: (nodeId: number | null, nested?: number) => void;
  /**
   * Opens or shuts the rows nested under a row, by its node id: rows the datasource serves
   * right after it, marked {@link NESTED_ROW}, where it is marked {@link NESTING_ROW}. The
   * node id column then carries a chevron on such a row, and its nested rows' labels.
   */
  onNestingToggle?: (nodeId: number) => void;
  /** Nested rows to draw as selected, by key. */
  selectedNestedRows?: PickedRows;
  /** At the header's start, before the count: what the rows are of, such as the population on show. */
  headerStart?: React.ReactNode;
  /** Right after the count, before the quick filters: what else narrows the rows, say. */
  headerExtra?: React.ReactNode;
  /** The name of the CSV the rows on show download as, without its extension; `nodes` by default. */
  downloadName?: string;
  /**
   * A host's place for the header, such as its toolbar, in place of a row of its own over the
   * rows: the count stacks there to keep it short. Null until that place is mounted.
   */
  headerSlot?: HTMLElement | null;
  /**
   * A Reset above the rows while a filter is on, or while `picked` says the host
   * holds a pick to undo: it clears the filters and calls `onReset`.
   */
  reset?: { picked: boolean; onReset: () => void };
  /** A reset asked for from outside the table, such as a 3D view's: a new number each time. */
  resetRequest?: number;
  /**
   * Filters a click puts on beside the count, and a second click takes off,
   * leaving the other columns' filters as they are.
   */
  quickFilters?: readonly QuickFilter[];
  /**
   * A switch over which of its cells the host lists, such as Recorded | All,
   * after the quick filters: the host applies it to the rows it serves.
   */
  scope?: {
    value: string;
    options: { value: string; label: string; title?: string }[];
    onChange: (value: string) => void;
  };
  /**
   * A row to bring into view and flash, by node id, such as a cell clicked in
   * a scene beside the table; a new `key` asks again for the same one.
   * `rowIndexOf` says where that node falls among the rows the grid's sort and
   * filter show, or -1 where the filter leaves it out.
   */
  focusRow?: { nodeId: number; key: number };
  rowIndexOf?: (nodeId: number, sort: SortItem[], filter: FilterModel) => Promise<number>;
  /** A row to keep marked, by node id, such as the cell picked in a view beside the table. */
  markedNodeId?: number | null;
};

export type QuickFilter = { label: string; title?: string; model: FilterModel };

/** How long a new filter scope waits for its columns before the grid's changes count again. */
const SCOPE_SWITCH_MS = 2000;

/** File columns kept in view beside the pinned ones, however far their edge is dragged. */
const MIN_FILE_COLUMNS_WIDTH = 120;

/** Share of the grid the pinned columns take, against its right edge, until their edge is dragged. */
const PINNED_SHARE = 0.5;
/** Room a pinned column needs for its full header; with less it goes by its short one. */
const PINNED_LABEL_WIDTH = 128;
/**
 * Narrowest a pinned column goes, short header and all: little enough that
 * their edge drags well over to the right, giving the file's columns the room,
 * at the cost of values cut short there.
 */
const PINNED_MIN_WIDTH = 36;
/** Under this a pinned column's values go by its compact format, so more of them fit. */
const COMPACT_VALUES_WIDTH = 52;

/** How the pinned columns read at the width they have: by short headers, by compact values. */
type PinnedLook = { narrow: boolean; compactValues: boolean };

const WIDE: PinnedLook = { narrow: false, compactValues: false };

/** Each of `count` pinned columns' width in a grid `width` wide, at `share` of it, and how it reads there. */
function pinnedFit(width: number, share: number, count: number) {
  const each = Math.floor((width * share) / count);
  const columnWidth = Math.max(PINNED_MIN_WIDTH, each);
  const look: PinnedLook = {
    narrow: each < PINNED_LABEL_WIDTH,
    compactValues: columnWidth < COMPACT_VALUES_WIDTH,
  };
  return { width: columnWidth, look };
}

/** The synthetic row-index column, which names a clicked row. */
const NODE_ID_COLUMN = 'node_id';

export type PickAllState = 'all' | 'some' | 'none';
/** Picked rows by node id: a set, or what answers as one without holding every id. */
export type PickedRows = Pick<ReadonlySet<number>, 'has' | 'size'>;

/**
 * On a row nested under another, such as one of a cell's compartments under the cell: its
 * key, its label and whether it is the last under its row. It carries its row's node id.
 */
export const NESTED_ROW = '__nested';
/** On a row with rows nested under it: how many, and whether they are open. */
export const NESTING_ROW = '__nesting';

/**
 * A row of the table nested under a row: its key, its cells, the nested table's columns as
 * a CSS grid template every row under the same row shares, whether it is the last there,
 * and whether it is the nested table's header, which nothing picks.
 */
export type NestedRowMark = {
  key: number;
  cells: readonly string[];
  template: string;
  last: boolean;
  header?: boolean;
};
export type NestingRowMark = { count: number; open: boolean };

/** What the cell renderers, row classes and the tick column's header read off the grid's context. */
type GridContext = {
  visibleColumns: string[];
  isPicked: (nodeId: number) => boolean;
  isNestedPicked: (key: number) => boolean;
  toggleNesting: (nodeId: number) => void;
  pickAll: () => { state: PickAllState; onToggle: () => void } | undefined;
};

const PICKED_ROW_CLASS = 'nodes-row-picked';
const FLASHED_ROW_CLASS = 'nodes-row-flashed';
const MARKED_ROW_CLASS = 'nodes-row-marked';
const NESTED_ROW_CLASS = 'nodes-row-nested';
/** As long as the flash's fade in the stylesheet. */
const FLASH_MS = 1600;

function nodeIdOf(data: unknown): number {
  return Number((data as Record<string, unknown> | undefined)?.[NODE_ID_COLUMN]);
}

function nestedOf(data: unknown): NestedRowMark | undefined {
  return (data as Record<string, unknown> | undefined)?.[NESTED_ROW] as NestedRowMark | undefined;
}

function nestingOf(data: unknown): NestingRowMark | undefined {
  return (data as Record<string, unknown> | undefined)?.[NESTING_ROW] as NestingRowMark | undefined;
}

/** Whether a row is drawn picked: a nested row by its own key, any other by its node id. */
function isRowPicked(context: GridContext | undefined, data: unknown): boolean {
  const nested = nestedOf(data);
  return nested ? !!context?.isNestedPicked(nested.key) : !!context?.isPicked(nodeIdOf(data));
}

function PickBox({ state }: { state: PickAllState }) {
  return (
    <span
      className={cn(
        'flex size-4 items-center justify-center rounded border transition-colors',
        state === 'none' ? 'border-neutral-3 bg-white' : 'border-primary-8 bg-primary-8 text-white'
      )}
    >
      {state === 'all' && <RiCheckLine className="size-3" />}
      {state === 'some' && <RiSubtractLine className="size-3" />}
    </span>
  );
}

function PickCell(params: ICellRendererParams) {
  if (nestedOf(params.data)?.header) return null;
  const picked = isRowPicked(params.context as GridContext | undefined, params.data);
  return (
    <span aria-hidden className="flex h-full items-center justify-center">
      <PickBox state={picked ? 'all' : 'none'} />
    </span>
  );
}

/**
 * The node id column while rows nest: a chevron on a row with rows under it, which opens or
 * shuts them, and under it each nested row's label on a branch of the tree.
 */
function NodeIdCell(params: ICellRendererParams) {
  const context = params.context as GridContext | undefined;
  const nested = nestedOf(params.data);
  if (nested) {
    // A row of the table under its row, over the file columns it spans: its cells on the
    // nested table's columns, the header's set small and muted.
    return (
      <span className="flex h-full min-w-0 items-center gap-1.5">
        <span aria-hidden className="relative ml-[7px] h-full w-2.5 shrink-0">
          <span
            className={cn(
              'absolute top-0 left-0 border-l border-neutral-300',
              nested.last ? 'h-1/2' : 'h-full'
            )}
          />
          {!nested.header && (
            <span className="absolute top-1/2 left-0 w-full border-t border-neutral-300" />
          )}
        </span>
        {/* The template's widths are in the rows' own characters, header and all, so the
            header's smaller type is set on its cells rather than here. */}
        <span
          className={cn('grid min-w-0', !nested.header && 'text-neutral-600')}
          style={{ gridTemplateColumns: nested.template }}
        >
          {nested.cells.map((cell, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: a row's cells are its columns, in order
              key={i}
              title={cell}
              className={cn(
                'truncate pr-[2ch]',
                nested.header && 'text-[11px] font-semibold tracking-wide text-neutral-400'
              )}
            >
              {cell}
            </span>
          ))}
        </span>
      </span>
    );
  }
  const nesting = nestingOf(params.data);
  return (
    <span className="flex h-full items-center justify-between gap-1">
      {nesting ? (
        <button
          type="button"
          data-nesting-toggle
          aria-expanded={nesting.open}
          aria-label={nesting.open ? 'Hide the rows under it' : 'Show the rows under it'}
          title={
            nesting.open
              ? 'Hide the rows under it'
              : `Show the ${nesting.count.toLocaleString()} rows under it`
          }
          onClick={() => context?.toggleNesting(nodeIdOf(params.data))}
          className="text-primary-8 -ml-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-neutral-100"
        >
          <RiArrowRightSLine
            className={cn(
              'size-4 transition-transform duration-200 ease-out motion-reduce:transition-none',
              nesting.open && 'rotate-90'
            )}
          />
        </button>
      ) : (
        <span aria-hidden className="w-4 shrink-0" />
      )}
      <span className="truncate">{params.valueFormatted ?? params.value}</span>
    </span>
  );
}

/** The tick atop the tick column: all the rows on show, some, or none. */
function PickHeader(params: IHeaderParams) {
  const context = params.context as GridContext | undefined;
  const pickAll = context?.pickAll();
  if (!pickAll) return null;
  return (
    <button
      type="button"
      // The latest handler, not the one this header was drawn with: it only
      // redraws when the state changes.
      onClick={() => context?.pickAll()?.onToggle()}
      aria-label={pickAll.state === 'all' ? 'Untick every row' : 'Tick every row'}
      title={pickAll.state === 'all' ? 'Untick every row' : 'Tick every row'}
      className="flex h-full w-full cursor-pointer items-center justify-center"
    >
      <PickBox state={pickAll.state} />
    </button>
  );
}

const PICK_COLUMN: ColDef = {
  colId: '__pick',
  headerName: '',
  width: 44,
  minWidth: 44,
  maxWidth: 44,
  pinned: 'left',
  lockPinned: true,
  lockPosition: 'left',
  sortable: false,
  filter: false,
  resizable: false,
  suppressMovable: true,
  suppressHeaderMenuButton: true,
  headerComponent: PickHeader,
  cellRenderer: PickCell,
};

const NO_SELECTION: PickedRows = new Set<number>();

type BuildArgs = {
  orderedColumns: ColumnMeta[];
  visible: Set<string>;
  pinned: readonly PinnedColumn[];
  pinnedLook: PinnedLook;
  onReset: () => void;
  onOpenChooser: () => void;
  /** Rows nest under others: the node id column shows the tree. */
  nesting: boolean;
};

/** The node id column's width while it shows the tree, room for a nested row's label. */
const NESTING_NODE_ID_WIDTH = 130;

const NO_PINNED_COLUMNS: readonly PinnedColumn[] = [];

const PREFERRED_WIDTH_BY_NAME = new Map(
  PREFERRED_COLUMNS.filter((p) => p.width !== undefined).map((p) => [p.name, p.width as number])
);

function buildColumnDefs({
  orderedColumns,
  visible,
  pinned,
  pinnedLook,
  onReset,
  onOpenChooser,
  nesting,
}: BuildArgs): ColDef[] {
  const fileColumns = orderedColumns.map((c) => {
    const isNumeric = c.kind === 'numeric';
    const useSetFilter =
      c.kind === 'categorical' && (c.library?.length ?? 0) < CATEGORICAL_SET_FILTER_MAX;
    const width = PREFERRED_WIDTH_BY_NAME.get(c.name) ?? (isNumeric ? 100 : 120);
    if (nesting && c.name === NODE_ID_COLUMN) {
      return {
        field: c.name,
        headerName: c.label ?? capitalize(c.name.replace(/_/g, ' ')),
        headerComponent: ColumnHeader,
        headerComponentParams: { onReset, isNumeric, onOpenChooser },
        sortable: true,
        resizable: true,
        hide: !visible.has(c.name),
        filter: NumericFilter,
        suppressHeaderMenuButton: true,
        minWidth: 60,
        width: NESTING_NODE_ID_WIDTH,
        cellRenderer: NodeIdCell,
        // A nested row has none of its own node's values: its label runs on over their columns.
        colSpan: (params) => {
          if (!nestedOf(params.data)) return 1;
          const shown = params.api.getDisplayedCenterColumns();
          const at = shown.indexOf(params.column);
          return at < 0 ? 1 : shown.length - at;
        },
      } satisfies ColDef;
    }
    return {
      field: c.name,
      headerName: c.label ?? capitalize(c.name.replace(/_/g, ' ')),
      headerComponent: ColumnHeader,
      headerComponentParams: {
        onReset,
        isNumeric,
        onOpenChooser,
      },
      sortable: true,
      resizable: true,
      hide: !visible.has(c.name),
      filter: useSetFilter ? CategoricalFilter : isNumeric ? NumericFilter : TextFilter,
      filterParams: useSetFilter ? { library: c.library } : undefined,
      suppressHeaderMenuButton: true,
      minWidth: 60,
      width,
      cellClass: isNumeric ? 'ag-right-aligned-cell' : undefined,
      valueFormatter: isNumeric
        ? (p: ValueFormatterParams) =>
            typeof p.value === 'number' ? formatNumber(p.value) : p.value
        : undefined,
    } satisfies ColDef;
  });

  const { narrow, compactValues } = pinnedLook;
  const pinnedColumns = pinned.map((p) => {
    const short = narrow ? p.short : undefined;
    const format = (compactValues ? p.compactFormat : undefined) ?? p.format ?? formatNumber;
    return {
      field: p.name,
      headerName: short?.headerName ?? p.headerName,
      headerComponent: ColumnHeader,
      headerComponentParams: {
        onReset,
        isNumeric: true,
        onOpenChooser,
        tooltip: short ? p.headerName : undefined,
        unit: short?.unit,
        // Only a label of two words, such as Spike Count, can take a second line.
        wrapLabel: short !== undefined && /\s/.test(short.headerName),
      },
      // Tighter padding when narrow, so the numbers fit.
      headerClass: narrow ? [styles.pinned, styles.compact] : styles.pinned,
      sortable: true,
      resizable: true,
      pinned: 'right',
      lockPinned: true,
      filter: NumericFilter,
      suppressHeaderMenuButton: true,
      minWidth: PINNED_MIN_WIDTH,
      // Only until the grid fits them to its width, which it keeps doing as it resizes.
      initialWidth: PINNED_LABEL_WIDTH,
      cellClass: narrow
        ? ['ag-right-aligned-cell', styles.pinned, styles.compact]
        : ['ag-right-aligned-cell', styles.pinned],
      valueFormatter: (params: ValueFormatterParams) => {
        if (typeof params.value !== 'number') return params.value;
        return Number.isNaN(params.value) ? '' : format(params.value);
      },
    } satisfies ColDef;
  });

  return [...fileColumns, ...pinnedColumns];
}

function formatNumber(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (Number.isInteger(v)) return String(v);
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) return v.toExponential(3);
  return v.toFixed(4);
}

export function NodesGrid({
  columns,
  rowCount,
  filteredCount,
  datasource,
  visibleColumns,
  onVisibleColumnsChange,
  pinnedColumns = NO_PINNED_COLUMNS,
  pinnedVersion,
  onFilterModelChange,
  initialFilterModel,
  filterScope,
  onRowClick,
  selectedNodeIds = NO_SELECTION,
  pickColumn = false,
  pickAll,
  onRowHover,
  onNestingToggle,
  selectedNestedRows = NO_SELECTION,
  headerStart,
  headerExtra,
  downloadName = 'nodes',
  headerSlot,
  reset,
  resetRequest,
  quickFilters,
  scope,
  focusRow,
  rowIndexOf,
  markedNodeId = null,
}: Props) {
  const gridRef = useRef<AgGridReact>(null);

  // The pinned columns' widths are set on the grid itself, from their share of
  // its width, on each resize and each move of their edge. Handed down in the
  // column definitions they were applied in an effect, and on every frame of a
  // drag each was an update nested in the last, a run React stops as a loop.
  // Only how they read is state, which changes at a few widths.
  const gridBoxRef = useRef<HTMLDivElement>(null);
  const shareRef = useRef(PINNED_SHARE);
  const pinnedCountRef = useRef(pinnedColumns.length);
  useLayoutEffect(() => {
    pinnedCountRef.current = pinnedColumns.length;
  });
  const [pinnedLook, setPinnedLook] = useState(WIDE);
  const fitPinned = useCallback(() => {
    const box = gridBoxRef.current;
    const count = pinnedCountRef.current;
    if (!box || count === 0) return;
    const { width, look } = pinnedFit(box.getBoundingClientRect().width, shareRef.current, count);
    setPinnedLook((previous) =>
      previous.narrow === look.narrow && previous.compactValues === look.compactValues
        ? previous
        : look
    );
    const api = gridRef.current?.api;
    if (!api || api.isDestroyed()) return;
    const resized = api.getDisplayedRightColumns().filter((c) => c.getActualWidth() !== width);
    if (resized.length > 0) api.setColumnWidths(resized.map((c) => ({ key: c, newWidth: width })));
  }, []);

  // Where the pinned columns start and end across the grid, read back off it:
  // the grid lays them out, with its scrollbar beside them, and builds their
  // header only once it is ready, so it is looked for until it is there.
  const [pinnedSpan, setPinnedSpan] = useState<{ left: number; right: number } | null>(null);
  const hasPinned = pinnedColumns.length > 0;
  useLayoutEffect(() => {
    const box = gridBoxRef.current;
    if (!hasPinned || !box) return;
    let frame = 0;
    let watched: Element | null = null;
    const observer = new ResizeObserver(() => {
      fitPinned();
      measure();
    });
    function measure() {
      if (!box) return;
      const pinned = box.querySelector('.ag-pinned-right-header');
      if (!pinned) {
        frame = requestAnimationFrame(measure);
        return;
      }
      if (pinned !== watched) {
        observer.observe(pinned);
        watched = pinned;
      }
      const outer = box.getBoundingClientRect();
      const inner = pinned.getBoundingClientRect();
      setPinnedSpan(
        inner.width > 0 ? { left: inner.left - outer.left, right: inner.right - outer.left } : null
      );
    }
    observer.observe(box);
    fitPinned();
    measure();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [hasPinned, fitPinned]);
  const autoSizedKeyRef = useRef<string>('');

  // What the datasource reads per page: the chosen file columns and the pinned
  // ones. Keyed on the pinned names, not the array, which a host may build
  // anew for the same columns - and each new array would page every row again.
  // A clicked or selected row is named by its node id, so that is read even
  // when hidden.
  const pinnedNames = pinnedColumns.map((p) => p.name).join('\n');
  const clickable = onRowClick !== undefined;
  const requestedColumns = useMemo(() => {
    const names = [...visibleColumns, ...(pinnedNames ? pinnedNames.split('\n') : [])];
    if (clickable && !visibleColumns.has(NODE_ID_COLUMN)) names.push(NODE_ID_COLUMN);
    return names;
  }, [visibleColumns, pinnedNames, clickable]);

  // Read through a ref by the row classes and the tick column, so a new
  // selection redraws the rows on show rather than rebuilding the columns.
  const selectedRef = useRef(selectedNodeIds);
  const isPicked = useCallback((nodeId: number) => selectedRef.current.has(nodeId), []);
  const selectedNestedRef = useRef(selectedNestedRows);
  const isNestedPicked = useCallback((key: number) => selectedNestedRef.current.has(key), []);
  const nestingToggleRef = useRef(onNestingToggle);
  const toggleNesting = useCallback((nodeId: number) => nestingToggleRef.current?.(nodeId), []);
  const pickAllRef = useRef(pickAll);
  const readPickAll = useCallback(() => pickAllRef.current, []);
  const gridContext = useMemo<GridContext>(
    () => ({
      visibleColumns: requestedColumns,
      isPicked,
      isNestedPicked,
      toggleNesting,
      pickAll: readPickAll,
    }),
    [requestedColumns, isPicked, isNestedPicked, toggleNesting, readPickAll]
  );
  const pickAllState = pickAll?.state;
  useEffect(() => {
    pickAllRef.current = pickAll;
    nestingToggleRef.current = onNestingToggle;
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: pickAllState redraws the tick atop the column
  useEffect(() => {
    gridRef.current?.api?.refreshHeader();
  }, [pickAllState]);
  const flashedRef = useRef<number | null>(null);
  const markedRef = useRef(markedNodeId);
  const rowClassRules = useMemo(
    () => ({
      [PICKED_ROW_CLASS]: (p: RowClassParams) =>
        isRowPicked(p.context as GridContext | undefined, p.data),
      [FLASHED_ROW_CLASS]: (p: RowClassParams) => nodeIdOf(p.data) === flashedRef.current,
      [MARKED_ROW_CLASS]: (p: RowClassParams) => nodeIdOf(p.data) === markedRef.current,
      [NESTED_ROW_CLASS]: (p: RowClassParams) => nestedOf(p.data) !== undefined,
    }),
    []
  );
  useEffect(() => {
    if (markedRef.current === markedNodeId) return;
    markedRef.current = markedNodeId;
    gridRef.current?.api?.redrawRows();
  }, [markedNodeId]);
  // Asked again once the grid is up: a focus can arrive before it, with the table.
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const shownCountRef = useRef(filteredCount ?? rowCount);
  useEffect(() => {
    shownCountRef.current = filteredCount ?? rowCount;
  });
  useEffect(() => {
    const api = gridApi;
    if (!focusRow || !rowIndexOf || !api) return;
    let cancelled = false;
    const sort: SortItem[] = api
      .getColumnState()
      .filter((c) => c.sort)
      .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
      .map((c) => ({ column: c.colId, direction: c.sort as SortDirection }));
    rowIndexOf(focusRow.nodeId, sort, api.getFilterModel() as FilterModel)
      .then((index) => {
        if (cancelled || index < 0) return;
        flashedRef.current = focusRow.nodeId;
        // Rows past the pages read so far are not counted yet, so there is nowhere to scroll.
        if (index >= api.getDisplayedRowCount()) api.setRowCount(shownCountRef.current, true);
        api.ensureIndexVisible(index, 'middle');
        api.redrawRows();
      })
      .catch(() => {});
    const timer = setTimeout(() => {
      flashedRef.current = null;
      gridRef.current?.api?.redrawRows();
    }, FLASH_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [focusRow, rowIndexOf, gridApi]);
  useEffect(() => {
    selectedRef.current = selectedNodeIds;
    selectedNestedRef.current = selectedNestedRows;
    gridRef.current?.api?.redrawRows();
  }, [selectedNodeIds, selectedNestedRows]);

  const [orderedNames, setOrderedNames] = useState<string[]>(() => defaultColumnOrder(columns));
  const [chooserOpen, setChooserOpen] = useState(false);
  const openChooser = useCallback(() => setChooserOpen(true), []);

  useEffect(() => {
    setOrderedNames(defaultColumnOrder(columns));
    autoSizedKeyRef.current = '';
  }, [columns]);

  const orderedColumns = useMemo(() => {
    const byName = new Map(columns.map((c) => [c.name, c]));
    const known = orderedNames.map((n) => byName.get(n)).filter((c): c is ColumnMeta => Boolean(c));
    const knownSet = new Set(known.map((c) => c.name));
    const rest = columns.filter((c) => !knownSet.has(c.name));
    return [...known, ...rest];
  }, [columns, orderedNames]);

  const resetAll = useCallback(() => {
    const api = gridRef.current?.api;
    if (api) api.resetColumnState();
    // The reset puts the pinned columns back at their first widths, not their share.
    fitPinned();
    setOrderedNames(defaultColumnOrder(columns));
    onVisibleColumnsChange(defaultVisibleColumnSet(columns));
  }, [columns, onVisibleColumnsChange, fitPinned]);

  const nesting = onNestingToggle !== undefined;
  const columnDefs = useMemo(() => {
    const defs = buildColumnDefs({
      orderedColumns,
      visible: visibleColumns,
      pinned: pinnedColumns,
      pinnedLook,
      onReset: resetAll,
      onOpenChooser: openChooser,
      nesting,
    });
    return pickColumn ? [PICK_COLUMN, ...defs] : defs;
  }, [
    orderedColumns,
    visibleColumns,
    pinnedColumns,
    pinnedLook,
    resetAll,
    openChooser,
    pickColumn,
    nesting,
  ]);

  const onColumnMoved = (e: ColumnMovedEvent) => {
    if (!e.finished) return;
    const nextOrder = e.api
      .getColumnState()
      .map((s): string | undefined => s.colId)
      .filter((id): id is string => typeof id === 'string');
    setOrderedNames((prev) => (isEqual(prev, nextOrder) ? prev : nextOrder));
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: new pinned values are a reason to page the rows in again
  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api || api.isDestroyed()) return;
    api.setGridOption('context', gridContext);
    api.refreshInfiniteCache();
  }, [gridContext, pinnedVersion]);

  useEffect(() => {
    // A grid torn down under a column change, as its table is swapped, takes no more calls.
    const api = gridRef.current?.api;
    if (!api || api.isDestroyed()) return;
    api.applyColumnState({
      state: orderedNames.map((colId) => ({ colId })),
      applyOrder: true,
    });
  }, [orderedNames]);

  // Derived columns can arrive after the grid is up, and a kept filter may name one.
  const pendingFiltersRef = useRef(
    initialFilterModel && Object.keys(initialFilterModel).length > 0 ? initialFilterModel : null
  );
  const restoreFilters = (api: GridApi) => {
    const model = pendingFiltersRef.current;
    if (!model || !Object.keys(model).every((colId) => api.getColumn(colId))) return;
    pendingFiltersRef.current = null;
    api.setFilterModel(model);
  };

  // The total the rows on show were asked against: the count line moves with
  // the rows rather than ahead of them, a new total landing with its first page.
  const rowCountRef = useRef(rowCount);
  useEffect(() => {
    rowCountRef.current = rowCount;
  });
  const [landedTotal, setLandedTotal] = useState<number | null>(null);
  const total = landedTotal ?? rowCount;

  // One datasource for the grid's life, reading through to the host's latest:
  // a new one pages the rows in again over the old ones rather than blanking them.
  const datasourceRef = useRef(datasource);
  // A nested row's label spans the file columns, which the grid works out only as it draws a
  // row: drawn while its page loaded, it is drawn again once its data is in.
  const redrawNested = (startRow: number, rows: unknown[]) => {
    const api = gridRef.current?.api;
    if (!api || api.isDestroyed() || !rows.some((row) => nestedOf(row))) return;
    const rowNodes = rows.flatMap((row, i) => {
      const node = nestedOf(row) ? api.getDisplayedRowAtIndex(startRow + i) : undefined;
      return node ? [node] : [];
    });
    api.redrawRows({ rowNodes });
  };
  const [gridSource] = useState<IDatasource>(() => ({
    rowCount: datasource.rowCount,
    getRows: (params) => {
      const askedOf = rowCountRef.current;
      datasourceRef.current.getRows({
        ...params,
        successCallback: (rows, lastRow) => {
          params.successCallback(rows, lastRow);
          setLandedTotal(askedOf);
          redrawNested(params.startRow, rows);
        },
      });
    },
  }));
  useEffect(() => {
    if (datasourceRef.current === datasource) return;
    datasourceRef.current = datasource;
    const api = gridRef.current?.api;
    if (!api || api.isDestroyed()) return;
    // The count is found again from the pages, however many there were before.
    api.setRowCount(api.getDisplayedRowCount(), false);
    api.refreshInfiniteCache();
  }, [datasource]);

  const onGridReady = (e: GridReadyEvent) => {
    e.api.setGridOption('context', gridContext);
    // Before the datasource, so the first page asked for is already filtered.
    restoreFilters(e.api);
    e.api.setGridOption('datasource', gridSource);
    setGridApi(e.api);
    fitPinned();
  };

  // A new scope's filters, on their way: until they are on, the grid's changes -
  // the last scope's filters coming off - are not its host's to hear about. A
  // filter whose columns never come stops holding the grid's changes back.
  const scopeRef = useRef(filterScope);
  const switchingRef = useRef<{ model: FilterModel; until: number } | null>(null);
  useEffect(() => {
    if (scopeRef.current === filterScope) return;
    scopeRef.current = filterScope;
    const model = initialFilterModel ?? {};
    pendingFiltersRef.current = Object.keys(model).length > 0 ? model : null;
    const api = gridRef.current?.api;
    if (!api || api.isDestroyed() || isEqual(api.getFilterModel(), model)) return;
    switchingRef.current = { model, until: performance.now() + SCOPE_SWITCH_MS };
    if (pendingFiltersRef.current) restoreFilters(api);
    else api.setFilterModel(null);
  });

  const [filters, setFilters] = useState<FilterModel>({});
  const filtering = Object.keys(filters).length > 0;
  const onFilterChanged = (e: FilterChangedEvent) => {
    const model = e.api.getFilterModel() as FilterModel;
    setFilters(model);
    const switching = switchingRef.current;
    if (switching && performance.now() < switching.until) {
      if (isEqual(model, switching.model)) switchingRef.current = null;
      return;
    }
    switchingRef.current = null;
    pendingFiltersRef.current = null;
    onFilterModelChange?.(model);
  };
  const onResetClick = () => {
    pendingFiltersRef.current = null;
    gridRef.current?.api.setFilterModel(null);
    reset?.onReset();
  };
  // Only a request made while the grid is up resets it: one from before it mounted, such as
  // while the host showed a view of its own in its place, was seen to then.
  const seenResetRef = useRef(resetRequest);
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new request resets, with the reset as it stands
  useEffect(() => {
    if (resetRequest === seenResetRef.current) return;
    seenResetRef.current = resetRequest;
    if (resetRequest) onResetClick();
  }, [resetRequest]);

  // The rows the filter keeps, in the sort and columns on show, every one of them rather
  // than those paged in so far: read from the host's datasource as the grid reads them.
  const [downloading, setDownloading] = useState(false);
  const downloadCsv = async () => {
    const api = gridRef.current?.api;
    if (!api || downloading) return;
    setDownloading(true);
    try {
      const shown = api
        .getAllDisplayedColumns()
        .map((c) => c.getColId())
        .filter((id) => id !== PICK_COLUMN.colId);
      const sortModel = api
        .getColumnState()
        .filter((c) => c.sort)
        .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
        .map((c) => ({ colId: c.colId, sort: c.sort as SortDirection }));
      const rows = await readAllRows({
        datasource: datasourceRef.current,
        api,
        context: gridContext,
        sortModel,
        filterModel: api.getFilterModel(),
      });
      // The rows of the table's own nodes: nested rows are a view of theirs.
      const listed = rows.filter((row) => !(NESTED_ROW in row));
      saveAs(
        new Blob([toCsv(shown, listed)], { type: 'text/csv;charset=utf-8' }),
        `${downloadName}.csv`
      );
    } catch (error) {
      logError('The rows on show could not be downloaded:', error);
    } finally {
      setDownloading(false);
    }
  };
  const isOn = (quick: QuickFilter) =>
    Object.entries(quick.model).every(([colId, f]) => isEqual(filters[colId], f));
  const toggleQuickFilter = (quick: QuickFilter) => {
    const api = gridRef.current?.api;
    if (!api) return;
    pendingFiltersRef.current = null;
    const next: FilterModel = { ...(api.getFilterModel() as FilterModel) };
    if (isOn(quick)) for (const colId of Object.keys(quick.model)) delete next[colId];
    else Object.assign(next, quick.model);
    api.setFilterModel(next);
  };

  const onRowClicked = (e: RowClickedEvent) => {
    // A row's chevron opens or shuts the rows under it, and picks nothing.
    const target = e.event?.target;
    if (target instanceof Element && target.closest('[data-nesting-toggle]')) return;
    const nodeId = nodeIdOf(e.data);
    if (!Number.isFinite(nodeId)) return;
    const nested = nestedOf(e.data);
    // A nested table's header is no row of its own to pick.
    if (nested?.header) return;
    if (nested) onRowClick?.(nodeId, nested.key);
    else onRowClick?.(nodeId);
  };

  // Cells report the pointer one by one; the host hears about rows.
  const hoveredRef = useRef<string | null>(null);
  const reportHover = (nodeId: number | null, nested?: number) => {
    const key = nodeId === null ? null : `${nodeId}:${nested ?? ''}`;
    if (key === hoveredRef.current) return;
    hoveredRef.current = key;
    if (nodeId !== null && nested !== undefined) onRowHover?.(nodeId, nested);
    else onRowHover?.(nodeId);
  };
  const onCellMouseOver = (e: CellMouseOverEvent) => {
    const nodeId = nodeIdOf(e.data);
    const nested = nestedOf(e.data);
    // Over a nested table's header, its row's.
    reportHover(Number.isFinite(nodeId) ? nodeId : null, nested?.header ? undefined : nested?.key);
  };

  const onModelUpdated = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    const key = columns.map((c) => c.name).join('|');
    if (autoSizedKeyRef.current === key) return;
    // autoSizeColumns measures already-rendered cell content; wait until at
    // least the first row has real data (infinite model shows placeholders first).
    const first = api.getDisplayedRowAtIndex(0);
    if (!first?.data) return;
    const toAutoSize = columns
      .filter((c) => !PREFERRED_NAME_SET.has(c.name) && visibleColumns.has(c.name))
      .map((c) => c.name);
    autoSizedKeyRef.current = key;
    if (toAutoSize.length > 0) api.autoSizeColumns(toAutoSize, false);
  }, [columns, visibleColumns]);

  // The header: a row of its own over the rows, or the host's slot, where the count stacks.
  const stacked = headerSlot !== undefined;
  const count = (
    <span className={cn(styles.gridStat, 'shrink-0', stacked && styles.gridStatStacked)}>
      {pickColumn ? (
        // Ticks and the filter each narrow what is drawn, ticks first, so both are told.
        <>
          <span>
            {stacked ? null : 'Nodes: '}
            <span className={selectedNodeIds.size > 0 ? styles.gridStatHighlight : undefined}>
              {selectedNodeIds.size.toLocaleString()}
            </span>
            /{total.toLocaleString()} selected{stacked ? null : ', '}
          </span>
          <span>
            <span className={filteredCount !== null ? styles.gridStatHighlight : undefined}>
              {(filteredCount ?? total).toLocaleString()}
            </span>
            /{total.toLocaleString()} showing
          </span>
        </>
      ) : filteredCount === null ? (
        <>{total.toLocaleString()} nodes</>
      ) : (
        <>
          <strong className={styles.gridStatHighlight}>{filteredCount.toLocaleString()}</strong> of{' '}
          {total.toLocaleString()} nodes
        </>
      )}
    </span>
  );
  // Some of the columns hidden; none at all is the table before its defaults are in.
  const columnsHidden =
    visibleColumns.size > 0 && columns.some((column) => !visibleColumns.has(column.name));
  const actions = (
    <>
      {/* First, so the switches after it stay put at the end as it comes and goes. */}
      {reset && (filtering || reset.picked) && (
        <button
          type="button"
          onClick={onResetClick}
          title={reset.picked ? 'Clear the filters and the ticks' : 'Clear the filters'}
          aria-label={reset.picked ? 'Clear the filters and the ticks' : 'Clear the filters'}
          className={ROUND_PILL_CLASS}
        >
          <RiResetLeftLine className="size-4" />
        </button>
      )}
      {/* Each a switch between every row and the ones it keeps: All | Spiking. */}
      {quickFilters?.map((quick) => (
        <PillToggle
          key={quick.label}
          value={isOn(quick)}
          onChange={(on) => {
            if (on !== isOn(quick)) toggleQuickFilter(quick);
          }}
          options={[
            { value: false, label: 'All', title: 'Every row' },
            { value: true, label: quick.label, title: quick.title },
          ]}
        />
      ))}
      {scope && (
        <PillToggle value={scope.value} options={scope.options} onChange={scope.onChange} />
      )}
      <button
        type="button"
        onClick={openChooser}
        title={columnsHidden ? 'Show or hide columns: some are hidden' : 'Show or hide columns'}
        aria-label={columnsHidden ? 'Show or hide columns, some hidden' : 'Show or hide columns'}
        className={cn(ROUND_PILL_CLASS, 'relative')}
      >
        <RiTable3 className="size-4" />
        {columnsHidden && (
          // The dot a column's filter shows while it is on.
          <span
            aria-hidden
            className="pointer-events-none absolute top-0.5 right-0.5 size-[8px] rounded-full bg-(--color-green-main) shadow-[0_0_0_1.5px_#fff]"
          />
        )}
      </button>
      <button
        type="button"
        onClick={downloadCsv}
        disabled={downloading}
        title={downloading ? 'Preparing the CSV…' : 'Download the rows on show as CSV'}
        aria-label="Download the rows on show as CSV"
        className={cn(ROUND_PILL_CLASS, 'disabled:opacity-60')}
      >
        {downloading ? (
          <RiLoader4Line className="size-4 animate-spin" />
        ) : (
          <RiDownload2Line className="size-4" />
        )}
      </button>
    </>
  );

  return (
    <div className={styles.gridWrapper}>
      {headerSlot === undefined ? (
        <div className={styles.gridHeader}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {headerStart}
            {count}
            {headerExtra}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>
        </div>
      ) : (
        headerSlot &&
        createPortal(
          <div className="flex min-w-0 items-center gap-2">
            {headerStart}
            {count}
            {headerExtra}
            {actions}
          </div>,
          headerSlot
        )
      )}
      <div
        ref={gridBoxRef}
        className={styles.grid}
        onMouseLeave={onRowHover ? () => reportHover(null) : undefined}
      >
        <AgGridReact
          ref={gridRef}
          columnDefs={columnDefs}
          rowModelType="infinite"
          cacheBlockSize={200}
          maxBlocksInCache={10}
          infiniteInitialRowCount={Math.min(rowCount, 200)}
          rowBuffer={50}
          blockLoadDebounceMillis={75}
          suppressMultiSort={false}
          suppressColumnVirtualisation
          suppressCellFocus
          maintainColumnOrder
          headerHeight={60}
          onGridReady={onGridReady}
          onNewColumnsLoaded={(e) => restoreFilters(e.api)}
          // New pinned columns come in at their first width, and are fitted at once.
          onDisplayedColumnsChanged={fitPinned}
          onColumnMoved={onColumnMoved}
          onModelUpdated={onModelUpdated}
          onFilterChanged={onFilterChanged}
          onRowClicked={clickable ? onRowClicked : undefined}
          onCellMouseOver={onRowHover ? onCellMouseOver : undefined}
          rowClassRules={rowClassRules}
          rowClass={clickable ? styles.clickableRow : undefined}
          context={gridContext}
        />
        {hasPinned && pinnedSpan && (
          <div className="absolute inset-y-0 z-10 w-0" style={{ left: pinnedSpan.left }}>
            <PaneSideResizeHandle
              containerRef={gridBoxRef}
              minWidth={MIN_FILE_COLUMNS_WIDTH}
              onResize={(left) => {
                const width = gridBoxRef.current?.getBoundingClientRect().width ?? 0;
                if (width > 0) shareRef.current = (pinnedSpan.right - left) / width;
                fitPinned();
              }}
            />
          </div>
        )}
      </div>
      <Modal
        title="Choose columns"
        open={chooserOpen}
        onCancel={() => setChooserOpen(false)}
        footer={null}
        width={360}
      >
        <ColumnChooser
          columns={columns}
          orderedNames={orderedNames}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={onVisibleColumnsChange}
          onOrderedNamesChange={setOrderedNames}
        />
      </Modal>
    </div>
  );
}

export function defaultVisibleColumnSet(columns: ColumnMeta[]): Set<string> {
  return new Set(columns.map((c) => c.name));
}

function defaultColumnOrder(columns: ColumnMeta[]): string[] {
  const names = new Set(columns.map((c) => c.name));
  const preferred = PREFERRED_COLUMNS.map((p) => p.name).filter((n) => names.has(n));
  const preferredSet = new Set(preferred);
  const rest = columns.map((c) => c.name).filter((n) => !preferredSet.has(n));
  return [...preferred, ...rest];
}
