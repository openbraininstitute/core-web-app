import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { Modal } from 'antd';

ModuleRegistry.registerModules([AllCommunityModule]);

import { RiCheckLine, RiResetLeftLine, RiSubtractLine } from '@remixicon/react';
import capitalize from 'es-toolkit/compat/capitalize';
import isEqual from 'es-toolkit/compat/isEqual';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { CategoricalFilter } from '@/features/circuit-nodes/components/categorical-filter';
import { ColumnChooser } from '@/features/circuit-nodes/components/column-chooser';
import { ColumnHeader } from '@/features/circuit-nodes/components/column-header';
import { NumericFilter } from '@/features/circuit-nodes/components/numeric-filter';
import { TextFilter } from '@/features/circuit-nodes/components/text-filter';
import { PREFERRED_COLUMNS } from '@/features/circuit-nodes/types';
import { PaneSideResizeHandle } from '@/features/circuit-viewer/pane-resize-handle';
import { PILL_CLASS, PillToggle } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

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
  /** Called with a clicked row's node id. */
  onRowClick?: (nodeId: number) => void;
  /**
   * The rows to draw as selected, by node id. Held by the host rather than the
   * grid: the infinite row model drops selection with every page it reloads,
   * and a host picking cells wants them kept through sorts and filters.
   */
  selectedNodeIds?: ReadonlySet<number>;
  /** Adds a tick column, for hosts whose clicks pick several rows at once. */
  pickColumn?: boolean;
  /**
   * A tick atop that column for every row the table shows at once: whether all,
   * some or none of them are picked, and what a click on it should do.
   */
  pickAll?: { state: PickAllState; onToggle: () => void };
  /** Called with the node id of the row under the pointer, once per row, and null when it leaves the grid. */
  onRowHover?: (nodeId: number | null) => void;
  /** Said beside the count above the rows, such as how to use them. */
  headerNote?: React.ReactNode;
  /** Right after the count, before the quick filters: what else narrows the rows, say. */
  headerExtra?: React.ReactNode;
  /**
   * A Reset above the rows while a filter is on, or while `picked` says the host
   * holds a pick to undo: it clears the filters and calls `onReset`.
   */
  reset?: { picked: boolean; onReset: () => void };
  /**
   * Filters a click puts on beside the count, and a second click takes off,
   * leaving the other columns' filters as they are.
   */
  quickFilters?: readonly QuickFilter[];
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

/** What the cell renderers, row classes and the tick column's header read off the grid's context. */
type GridContext = {
  visibleColumns: string[];
  isPicked: (nodeId: number) => boolean;
  pickAll: () => { state: PickAllState; onToggle: () => void } | undefined;
};

const PICKED_ROW_CLASS = 'nodes-row-picked';
const FLASHED_ROW_CLASS = 'nodes-row-flashed';
const MARKED_ROW_CLASS = 'nodes-row-marked';
/** As long as the flash's fade in the stylesheet. */
const FLASH_MS = 1600;

function nodeIdOf(data: unknown): number {
  return Number((data as Record<string, unknown> | undefined)?.[NODE_ID_COLUMN]);
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
  const picked = (params.context as GridContext | undefined)?.isPicked(nodeIdOf(params.data));
  return (
    <span aria-hidden className="flex h-full items-center justify-center">
      <PickBox state={picked ? 'all' : 'none'} />
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

const NO_SELECTION: ReadonlySet<number> = new Set();

type BuildArgs = {
  orderedColumns: ColumnMeta[];
  visible: Set<string>;
  pinned: readonly PinnedColumn[];
  pinnedLook: PinnedLook;
  onReset: () => void;
  onOpenChooser: () => void;
};

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
}: BuildArgs): ColDef[] {
  const fileColumns = orderedColumns.map((c) => {
    const isNumeric = c.kind === 'numeric';
    const useSetFilter =
      c.kind === 'categorical' && (c.library?.length ?? 0) < CATEGORICAL_SET_FILTER_MAX;
    const width = PREFERRED_WIDTH_BY_NAME.get(c.name) ?? (isNumeric ? 100 : 120);
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
  headerNote,
  headerExtra,
  reset,
  quickFilters,
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
  const pickAllRef = useRef(pickAll);
  const readPickAll = useCallback(() => pickAllRef.current, []);
  const gridContext = useMemo<GridContext>(
    () => ({ visibleColumns: requestedColumns, isPicked, pickAll: readPickAll }),
    [requestedColumns, isPicked, readPickAll]
  );
  const pickAllState = pickAll?.state;
  useEffect(() => {
    pickAllRef.current = pickAll;
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: pickAllState redraws the tick atop the column
  useEffect(() => {
    gridRef.current?.api?.refreshHeader();
  }, [pickAllState]);
  const flashedRef = useRef<number | null>(null);
  const markedRef = useRef(markedNodeId);
  const rowClassRules = useMemo(
    () => ({
      [PICKED_ROW_CLASS]: (p: RowClassParams) => isPicked(nodeIdOf(p.data)),
      [FLASHED_ROW_CLASS]: (p: RowClassParams) => nodeIdOf(p.data) === flashedRef.current,
      [MARKED_ROW_CLASS]: (p: RowClassParams) => nodeIdOf(p.data) === markedRef.current,
    }),
    [isPicked]
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
    gridRef.current?.api?.redrawRows();
  }, [selectedNodeIds]);

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

  const columnDefs = useMemo(() => {
    const defs = buildColumnDefs({
      orderedColumns,
      visible: visibleColumns,
      pinned: pinnedColumns,
      pinnedLook,
      onReset: resetAll,
      onOpenChooser: openChooser,
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
  const [gridSource] = useState<IDatasource>(() => ({
    rowCount: datasource.rowCount,
    getRows: (params) => {
      const askedOf = rowCountRef.current;
      datasourceRef.current.getRows({
        ...params,
        successCallback: (rows, lastRow) => {
          params.successCallback(rows, lastRow);
          setLandedTotal(askedOf);
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
    const nodeId = nodeIdOf(e.data);
    if (Number.isFinite(nodeId)) onRowClick?.(nodeId);
  };

  // Cells report the pointer one by one; the host hears about rows.
  const hoveredRef = useRef<number | null>(null);
  const reportHover = (nodeId: number | null) => {
    if (nodeId === hoveredRef.current) return;
    hoveredRef.current = nodeId;
    onRowHover?.(nodeId);
  };
  const onCellMouseOver = (e: CellMouseOverEvent) => {
    const nodeId = nodeIdOf(e.data);
    reportHover(Number.isFinite(nodeId) ? nodeId : null);
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

  return (
    <div className={styles.gridWrapper}>
      <div className={styles.gridHeader}>
        <div className="flex min-w-0 items-center gap-2">
          <span className={styles.gridStat}>
            {pickColumn ? (
              // Ticks and the filter each narrow what is drawn, ticks first, so both are told.
              <>
                Nodes:{' '}
                <span className={selectedNodeIds.size > 0 ? styles.gridStatHighlight : undefined}>
                  {selectedNodeIds.size.toLocaleString()}
                </span>
                /{total.toLocaleString()} selected,{' '}
                <span className={filteredCount !== null ? styles.gridStatHighlight : undefined}>
                  {(filteredCount ?? total).toLocaleString()}
                </span>
                /{total.toLocaleString()} showing
              </>
            ) : filteredCount === null ? (
              <>{total.toLocaleString()} nodes</>
            ) : (
              <>
                <strong className={styles.gridStatHighlight}>
                  {filteredCount.toLocaleString()}
                </strong>{' '}
                of {total.toLocaleString()} nodes
              </>
            )}
          </span>
          {headerExtra}
        </div>
        {headerNote && (
          <span className={styles.gridNote}>
            <span>{headerNote}</span>
          </span>
        )}
        <div className="flex shrink-0 items-center gap-2">
          {/* First, so the switches after it stay put at the end as it comes and goes. */}
          {reset && (filtering || reset.picked) && (
            <button
              type="button"
              onClick={onResetClick}
              title={reset.picked ? 'Clear the filters and the ticks' : 'Clear the filters'}
              className={PILL_CLASS}
            >
              <RiResetLeftLine className="size-4" />
              Reset
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
        </div>
      </div>
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
