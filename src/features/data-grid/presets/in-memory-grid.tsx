'use client';

import { RiArrowDownSLine, RiArrowRightSLine } from '@remixicon/react';
import { keepPreviousData, QueryClient, useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import { computeInMemoryFacets, runInMemoryQuery } from '../bindings/inmemory/data-source';
import {
  buildGridQuery,
  type ColumnModel,
  createDefaultOperatorRegistry,
  type Facets,
  type GridContext,
  GridController,
  type GridDataSource,
  type GridPage,
  type GridSchema,
  type OperatorRegistry,
  type SortModel,
} from '../core';
import { CellRendererRegistry } from '../react/cell-renderer-registry';
import { ColumnChooser } from '../react/column-chooser';
import { GridPagination } from '../react/pagination';
import { isExpanderClick } from '../renderers/aggrid/expand-cell';
import { AgHeader } from '../renderers/aggrid/header';
import { registerDataGridModules } from '../renderers/aggrid/register-modules';
import { dataGridTheme } from '../renderers/aggrid/theme';
import { useGridState } from '../renderers/aggrid/use-grid-state';

import type {
  ColDef,
  ColumnMovedEvent,
  ColumnResizedEvent,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  RowSelectionOptions,
  SelectionChangedEvent,
} from 'ag-grid-community';
import type { ReactNode } from 'react';
import type { AgGridContext } from '../renderers/aggrid/ag-context';
import type { SimpleColumn, SimpleRowSelection } from './simple-grid';

registerDataGridModules();

const EXPAND_COL_ID = '__im_expand';
const DETAIL_ID_PREFIX = 'im-detail:';
const SYNTHETIC_COL_IDS = new Set([EXPAND_COL_ID, 'ag-Grid-SelectionColumn']);

/** Shared empty registry — the in-memory grid renders cells inline, not via keys. */
const EMPTY_CELL_RENDERERS = new CellRendererRegistry();

/** Stable empty base query key so client-mode consumers add no extra key segments. */
const EMPTY_QUERY_KEY: ReadonlyArray<unknown> = [];

/**
 * Fallback React Query client used ONLY in client mode, so the always-called
 * `useQuery` (rules of hooks) never requires a `QueryClientProvider` in the tree —
 * keeping every existing client-mode consumer working unchanged. Server mode uses
 * the app's real provider client (passing `undefined` reads it from context).
 */
let fallbackQueryClient: QueryClient | undefined;
function getFallbackQueryClient(): QueryClient {
  if (!fallbackQueryClient) {
    fallbackQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  }
  return fallbackQueryClient;
}

/** Synthetic full-width row hosting a column's expandable detail content. */
interface InMemoryDetailRow<Row> {
  readonly __imDetail: true;
  readonly forRow: Row;
  readonly forRowId: string;
}

type DisplayRow<Row> = Row | InMemoryDetailRow<Row>;

function isDetailRow<Row>(row: unknown): row is InMemoryDetailRow<Row> {
  return typeof row === 'object' && row !== null && '__imDetail' in row;
}

/**
 * Configurable expander. When {@link columnId} is given the chevron renders INSIDE
 * that column's cell (right by default, vertically centred); otherwise it falls
 * back to a fixed leading column. `render` overrides the default chevron.
 */
export interface ExpandColumnConfig<Row> {
  /** id of the data column that hosts the expander; omit for a leading column. */
  columnId?: string;
  /** within-cell alignment when {@link columnId} is set (default: 'right'). */
  align?: 'left' | 'right';
  /** whether a row can expand (default: always). */
  isExpandable?: (row: Row) => boolean;
  /** full-width detail content shown below an expanded row. */
  renderDetail: (row: Row) => ReactNode;
  /** initial detail-row height in px before it measures itself (default: 96). */
  initialHeight?: number;
  /** custom expander glyph; receives the open state. */
  renderExpander?: (open: boolean) => ReactNode;
}

export interface InMemoryGridProps<Row> {
  columns: Array<SimpleColumn<Row>>;
  /** Client-side rows. Ignored in server mode (`dataSource` set); defaults to `[]`. */
  rows?: Row[];
  getRowId?: (row: Row) => string;
  // ── server mode (opt-in) ──────────────────────────────────────────────────────
  /**
   * When provided, the grid switches to SERVER mode: sort/filter/pagination
   * dispatch to the store → the serialized {@link GridQuery} changes → React Query
   * refetches via `dataSource.fetch(query, signal)`. The data source owns
   * filtering/sorting/paging; `rows` is ignored and `computeInMemoryFacets`/
   * `runInMemoryQuery` are NOT run. Absent → the existing client behavior.
   */
  dataSource?: GridDataSource<Row>;
  /** Stable base React Query key; the built query is appended so changes refetch. */
  queryKey?: ReadonlyArray<unknown>;
  /** Opaque host params merged into the request (brain-region, scope, …). */
  serverParams?: Record<string, unknown>;
  /** Gate the server fetch (default: true when a `dataSource` is set). */
  enabled?: boolean;
  /** Total row count fallback when the data source doesn't return one. */
  total?: number;
  /** enable the per-column custom header filter popovers (default: false). */
  filterable?: boolean;
  /** show the column show/hide chooser control (default: false). */
  showColumnChooser?: boolean;
  /**
   * Notified whenever the user shows/hides columns (via the chooser). Lets a host
   * (e.g. a recursive grid) mirror the hidden set into nested grids so the whole
   * tree stays column-consistent.
   */
  onHiddenColumnsChange?: (hidden: string[]) => void;
  /** enable store-driven sorting via the custom header (default: false). */
  sortable?: boolean;
  /** default sort applied when the user has set none. */
  defaultSort?: SortModel;
  /** enable client-side pagination (default: false). */
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  hideHeader?: boolean;
  headerHeight?: number;
  rowSelection?: SimpleRowSelection<Row>;
  /** operator catalog for the filter editors (default: the standard registry). */
  operators?: OperatorRegistry;
  /** expandable detail rows + configurable expander position. */
  expansion?: ExpandColumnConfig<Row>;
  /** per-row class hook (e.g. hierarchy filtered-in/out styling). */
  getRowClass?: (row: Row) => string | undefined;
  onRowClick?: (row: Row) => void;
  /** AG Grid `domLayout` (default: 'autoHeight' so it embeds in expanded rows). */
  autoHeight?: boolean;
  className?: string;
  /** wrapper class for the grid element itself (excludes chooser/pagination chrome). */
  gridClassName?: string;
}

/** Strip the presentation-only extras so `SimpleColumn` fits the pure schema. */
function toColumnModel<Row>(c: SimpleColumn<Row>): ColumnModel<Row> {
  const { renderCell: _r, headerNode: _h, pinned: _p, autoHeight: _a, wrapText: _w, ...model } = c;
  return model;
}

/** Inline cell renderer host — invokes the column's `renderCell` with the row. */
function InMemoryRenderCell<Row>(
  props: ICellRendererParams<DisplayRow<Row>> & { render: (row: Row) => ReactNode }
) {
  const data = props.data;
  return data != null && !isDetailRow(data) ? props.render(data as Row) : null;
}

/** Detail render + measured-height config threaded through AG Grid's `context`. */
interface InMemoryDetailContext<Row> {
  render?: (row: Row) => ReactNode;
  initialHeight: number;
}

/**
 * Full-width detail cell (module-level so its hooks are top-level). Reads its
 * render fn from `context.imDetail`, mounts the content and forwards the measured
 * height to the AG Grid row node so nested grids never clip or jitter.
 */
function InMemoryDetailCell<Row>(props: ICellRendererParams<DisplayRow<Row>>) {
  const ref = useRef<HTMLDivElement>(null);
  const cfg = (props.context as { imDetail?: InMemoryDetailContext<Row> }).imDetail;
  const data = props.data;
  useEffect(() => {
    const el = ref.current;
    if (!el || !cfg) return undefined;
    const measure = () => {
      const target = Math.max(el.scrollHeight, cfg.initialHeight);
      if (props.node.rowHeight !== target) {
        props.node.setRowHeight(target);
        props.api.onRowHeightChanged();
      }
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [props.api, props.node, cfg]);
  if (!isDetailRow<Row>(data) || !cfg?.render) return null;
  return <div ref={ref}>{cfg.render(data.forRow)}</div>;
}

/**
 * A depth-limited, headless in-memory grid engine shared by `SimpleGrid`'s
 * enhanced mode and `CircuitRecursiveGrid`. Builds a {@link GridController} + an
 * in-memory query over `rows` and renders through AG Grid with the SAME custom
 * header filters, column chooser, sorting, resizing and pagination as the
 * entity grid — no AG-native filter/menu UI.
 */
export function InMemoryGrid<Row>({
  columns,
  rows = [],
  getRowId,
  dataSource,
  queryKey,
  serverParams,
  enabled,
  total,
  filterable = false,
  showColumnChooser = false,
  onHiddenColumnsChange,
  sortable = false,
  defaultSort,
  pagination = false,
  pageSize = 20,
  pageSizeOptions,
  hideHeader = false,
  headerHeight = 48,
  rowSelection,
  operators,
  expansion,
  getRowClass,
  onRowClick,
  autoHeight = true,
  className,
  gridClassName,
}: InMemoryGridProps<Row>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const apiRef = useRef<GridApi<DisplayRow<Row>> | null>(null);
  const operatorRegistry = useMemo(() => operators ?? createDefaultOperatorRegistry(), [operators]);

  // Stable row-id resolver: use the caller's accessor, else a per-object fallback.
  const fallbackIds = useRef(new WeakMap<object, string>());
  const idCounter = useRef(0);
  const rowId = useCallback(
    (row: Row): string => {
      if (getRowId) return getRowId(row);
      if (row != null && typeof row === 'object') {
        const map = fallbackIds.current;
        let id = map.get(row);
        if (!id) {
          id = `row-${idCounter.current++}`;
          map.set(row, id);
        }
        return id;
      }
      return String(row);
    },
    [getRowId]
  );

  // Structural signature: rebuild the controller (and reset its state) only when the
  // columns' identity/order or the sort/page config change — not on every render.
  const signature = useMemo(
    () =>
      [
        columns.map((c) => `${c.id}:${c.filter ? 1 : 0}:${c.hiddenByDefault ? 1 : 0}`).join('|'),
        sortable ? 1 : 0,
        (defaultSort ?? []).map((s) => `${s.columnId}:${s.direction}`).join(','),
        pageSize,
      ].join('#'),
    [columns, sortable, defaultSort, pageSize]
  );

  const context = useMemo<GridContext>(() => ({ dataType: 'in-memory-grid' }), []);
  const controllerRef = useRef<{ sig: string; controller: GridController<Row> } | null>(null);
  if (!controllerRef.current || controllerRef.current.sig !== signature) {
    const schema: GridSchema<Row> = {
      id: 'in-memory-grid',
      getRowId: rowId,
      columns: columns.map(toColumnModel),
      defaultSort,
      pageSizeOptions,
    };
    controllerRef.current = {
      sig: signature,
      controller: new GridController<Row>({ schema, context, defaultPageSize: pageSize }),
    };
  }
  const controller = controllerRef.current.controller;

  const state = useGridState(controller);
  const isServerMode = Boolean(dataSource);
  const query = buildGridQuery(state, serverParams);

  // Server mode: fetch via React Query keyed on the serialized query so sort/filter/
  // page changes refetch. The hook is ALWAYS called (rules of hooks) and gated by
  // `enabled`; in client mode it stays disabled and never touches the network. The
  // fallback client (client mode) means no `QueryClientProvider` is required.
  const serverResult = useQuery(
    {
      queryKey: [...(queryKey ?? EMPTY_QUERY_KEY), query],
      queryFn: ({ signal }): Promise<GridPage<Row>> =>
        dataSource ? dataSource.fetch(query, signal) : Promise.resolve({ rows: [], total: 0 }),
      enabled: isServerMode && (enabled ?? true),
      placeholderData: keepPreviousData,
    },
    isServerMode ? undefined : getFallbackQueryClient()
  );

  // Facets: client mode computes from the FULL row set so set-filter options stay
  // stable as the grid narrows; server mode reads them off the fetched page.
  const clientFacets = useMemo(
    () => (filterable && !isServerMode ? computeInMemoryFacets(rows, columns) : undefined),
    [filterable, isServerMode, rows, columns]
  );
  const facets: Facets | undefined = isServerMode ? serverResult.data?.facets : clientFacets;

  // Page: client mode filters/sorts/paginates in memory; server mode uses the
  // fetched page (the data source already did it) with a `total` fallback.
  const clientPage = useMemo(
    () => runInMemoryQuery(rows, query, { columns, disablePagination: !pagination }),
    [rows, query, columns, pagination]
  );
  const page: GridPage<Row> = isServerMode
    ? { rows: serverResult.data?.rows ?? [], total: serverResult.data?.total ?? total ?? 0 }
    : clientPage;

  const agContext = useMemo<AgGridContext<Row>>(
    () => ({
      controller,
      operators: operatorRegistry,
      facets,
      cellRenderers: EMPTY_CELL_RENDERERS,
    }),
    [controller, operatorRegistry, facets]
  );

  // AG Grid doesn't re-render headers when `context` changes; refresh so the filter
  // popovers read live facet options.
  useEffect(() => {
    const api = apiRef.current;
    if (facets && api && !api.isDestroyed()) api.refreshHeader();
  }, [facets]);

  // Report column show/hide changes so a host can mirror them into nested grids.
  // Guard on the serialized set so we don't re-notify (or loop) on unrelated renders.
  const lastHiddenKey = useRef<string | null>(null);
  useEffect(() => {
    if (!onHiddenColumnsChange) return;
    const key = state.hiddenColumns.join('|');
    if (key === lastHiddenKey.current) return;
    lastHiddenKey.current = key;
    onHiddenColumnsChange(state.hiddenColumns);
  }, [state.hiddenColumns, onHiddenColumnsChange]);

  // ── column defs ──────────────────────────────────────────────────────────────
  const hidden = useMemo(() => new Set(state.hiddenColumns), [state.hiddenColumns]);
  const orderedColumns = useMemo(() => {
    const order = state.columnOrder;
    if (!order?.length) return columns;
    const idx = new Map(order.map((id, i) => [id, i] as const));
    return [...columns].sort((a, b) => (idx.get(a.id) ?? 1e6) - (idx.get(b.id) ?? 1e6));
  }, [columns, state.columnOrder]);

  const isExpandable = expansion?.isExpandable ?? (() => true);
  const toggleExpand = useCallback(
    (row: Row) => controller.store.dispatch({ type: 'toggleExpanded', id: rowId(row) }),
    [controller, rowId]
  );
  const expandedSet = useMemo(() => new Set(state.expanded), [state.expanded]);

  const renderExpander = useCallback(
    (row: Row) => {
      if (!expansion || !isExpandable(row)) return null;
      const open = expandedSet.has(rowId(row));
      return (
        <button
          type="button"
          // same rounded pill + hover/focus (primary-8 bg, white glyph) as the shared
          // ExpandToggleButton, so the expander looks identical at every table level.
          data-grid-expander=""
          aria-label={open ? 'Collapse row' : 'Expand row'}
          aria-expanded={open}
          className="flex size-6 items-center justify-center rounded-full text-gray-500 outline-none transition-colors hover:bg-primary-8 focus-visible:bg-primary-8 [&:hover_svg]:fill-white [&:focus-visible_svg]:fill-white"
          onClick={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            toggleExpand(row);
          }}
        >
          {expansion.renderExpander ? (
            expansion.renderExpander(open)
          ) : open ? (
            <RiArrowDownSLine size={16} />
          ) : (
            <RiArrowRightSLine size={16} />
          )}
        </button>
      );
    },
    [expansion, isExpandable, expandedSet, rowId, toggleExpand]
  );

  const colDefs = useMemo<Array<ColDef<DisplayRow<Row>>>>(() => {
    const expandInside = expansion?.columnId;
    const expandAlign = expansion?.align ?? 'right';

    const defs = orderedColumns.map((c) => {
      const userWidth = state.columnWidths[c.id];
      const filterParams =
        filterable && c.filter
          ? {
              facetKey: c.filter.facetKey ?? c.filter.field ?? c.field ?? c.id,
              operatorIds: c.filter.operators,
              optionsSource: c.filter.options,
              description: c.filter.description,
            }
          : undefined;

      const colDef: ColDef<DisplayRow<Row>> = {
        colId: c.id,
        headerName: c.header,
        hide: hidden.has(c.id),
        sortable: false,
        headerComponent: AgHeader,
        headerComponentParams: {
          columnId: c.id,
          unit: c.unit,
          sortable: sortable && (c.sortable ?? true),
          headerNode: c.headerNode,
          filter: filterParams,
        },
        width: userWidth ?? c.width?.width,
        minWidth: c.width?.minWidth,
        flex: userWidth != null || c.width?.width != null ? undefined : c.width?.flex,
        // resizable by default (parity with the legacy table + the basic path); opt out per column
        resizable: c.width?.resizable ?? true,
        pinned: c.pinned,
        autoHeight: c.autoHeight,
        wrapText: c.wrapText,
        cellStyle: c.autoHeight ? { display: 'flex', alignItems: 'flex-start' } : undefined,
        cellClass:
          c.align === 'right'
            ? 'ag-right-aligned-cell'
            : c.align === 'center'
              ? 'ag-center-aligned-cell'
              : undefined,
        headerClass: c.align === 'right' ? 'ag-right-aligned-header' : undefined,
      };
      if (filterParams) colDef.suppressHeaderMenuButton = true;

      const isHost = expandInside === c.id;
      const baseRender = c.renderCell;

      if (baseRender || isHost) {
        // Wrap the cell so the expander can render at the cell's edge, centred.
        colDef.cellRenderer = InMemoryRenderCell;
        colDef.cellRendererParams = {
          render: (row: Row): ReactNode => {
            const content = baseRender
              ? baseRender(row)
              : c.getValue
                ? (c.getValue(row) ?? null)
                : ((row as unknown as Record<string, ReactNode>)[c.field ?? c.id] ?? null);
            if (!isHost) return content;
            return (
              <div className="flex h-full w-full items-center gap-1">
                {expandAlign === 'left' && <span className="shrink-0">{renderExpander(row)}</span>}
                <span className="min-w-0 flex-1">{content}</span>
                {expandAlign === 'right' && <span className="shrink-0">{renderExpander(row)}</span>}
              </div>
            );
          },
        };
      } else if (c.getValue) {
        const getValue = c.getValue;
        colDef.valueGetter = (p) =>
          p.data && !isDetailRow(p.data) ? (getValue(p.data as Row) ?? null) : null;
      } else {
        colDef.field = (c.field ?? c.id) as ColDef<DisplayRow<Row>>['field'];
      }

      return colDef;
    });

    // Fixed leading expander column when no host column was named.
    if (expansion && !expandInside) {
      const leading: ColDef<DisplayRow<Row>> = {
        colId: EXPAND_COL_ID,
        headerName: '',
        width: 44,
        minWidth: 44,
        maxWidth: 44,
        resizable: false,
        sortable: false,
        suppressMovable: true,
        lockPosition: 'left',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: InMemoryRenderCell,
        cellRendererParams: { render: (row: Row) => renderExpander(row) },
      };
      return [leading, ...defs];
    }
    return defs;
  }, [orderedColumns, hidden, state.columnWidths, sortable, filterable, expansion, renderExpander]);

  // ── display rows (interleave synthetic detail rows after expanded rows) ────────
  const displayRows = useMemo<Array<DisplayRow<Row>>>(() => {
    if (!expansion || state.expanded.length === 0) return page.rows;
    const expanded = new Set(state.expanded);
    const out: Array<DisplayRow<Row>> = [];
    for (const row of page.rows) {
      out.push(row);
      const id = rowId(row);
      if (expanded.has(id) && isExpandable(row)) {
        out.push({ __imDetail: true, forRow: row, forRowId: id });
      }
    }
    return out;
  }, [page.rows, expansion, state.expanded, rowId, isExpandable]);

  const getDisplayRowId = useCallback(
    (p: GetRowIdParams<DisplayRow<Row>>) =>
      isDetailRow<Row>(p.data) ? `${DETAIL_ID_PREFIX}${p.data.forRowId}` : rowId(p.data as Row),
    [rowId]
  );

  const initialDetailHeight = expansion?.initialHeight ?? 96;
  const detailRender = expansion?.renderDetail;
  // Thread the detail config through AG Grid's context so the module-level
  // full-width cell (with its own hooks) can read it.
  const gridContext = useMemo(
    () => ({
      ...agContext,
      imDetail: { render: detailRender, initialHeight: initialDetailHeight },
    }),
    [agContext, detailRender, initialDetailHeight]
  );

  // ── selection ──────────────────────────────────────────────────────────────
  const agRowSelection = useMemo<RowSelectionOptions<DisplayRow<Row>> | undefined>(() => {
    if (!rowSelection) return undefined;
    if (rowSelection.mode === 'single') {
      return {
        mode: 'singleRow',
        checkboxes: (p) => !isDetailRow(p.data),
        enableClickSelection: false,
      };
    }
    return {
      mode: 'multiRow',
      checkboxes: (p) => !isDetailRow(p.data),
      headerCheckbox: true,
      selectAll: 'currentPage',
      enableClickSelection: false,
    };
  }, [rowSelection]);

  const onSelectionChange = rowSelection?.onSelectionChange;
  const onSelectionChanged = useCallback(
    (e: SelectionChangedEvent<DisplayRow<Row>>) => {
      if (e.source === 'api') return;
      const selectedRows = e.api.getSelectedRows().filter((r): r is Row => !isDetailRow(r));
      const ids = selectedRows.map(rowId);
      onSelectionChange?.(ids, selectedRows);
    },
    [rowId, onSelectionChange]
  );

  const selectedIds = rowSelection?.selectedIds;
  const applySelection = useCallback(() => {
    const api = apiRef.current;
    if (!api || api.isDestroyed() || selectedIds === undefined) return;
    const selected = new Set(selectedIds);
    api.forEachNode((node) => {
      if (node.data == null || isDetailRow(node.data)) return;
      const id = rowId(node.data as Row);
      const shouldSelect = selected.has(id);
      if (node.isSelected() !== shouldSelect) node.setSelected(shouldSelect, false, 'api');
    });
  }, [selectedIds, rowId]);
  useEffect(() => {
    applySelection();
  }, [applySelection]);

  // ── layout persistence ────────────────────────────────────────────────────────
  const onColumnMoved = useCallback(
    (e: ColumnMovedEvent) => {
      if (!e.finished) return;
      const order = e.api
        .getColumnState()
        .map((s) => s.colId)
        .filter((id): id is string => typeof id === 'string' && !SYNTHETIC_COL_IDS.has(id));
      controller.store.dispatch({ type: 'setColumnOrder', order });
    },
    [controller]
  );
  const onColumnResized = useCallback(
    (e: ColumnResizedEvent) => {
      if (!e.finished || e.source !== 'uiColumnResized') return;
      for (const col of e.columns ?? []) {
        const id = col.getColId();
        if (SYNTHETIC_COL_IDS.has(id)) continue;
        controller.store.dispatch({
          type: 'setColumnWidth',
          columnId: id,
          width: col.getActualWidth(),
        });
      }
    },
    [controller]
  );

  const showChooser = showColumnChooser;
  // server mode paginates via the data source → always show the pager; client mode
  // keeps the opt-in `pagination` flag.
  const showPagination = pagination || isServerMode;

  if (!mounted) return <div className={cn('ag-data-grid w-full', className)} />;

  return (
    <div className={cn('flex w-full flex-col', className)}>
      {showChooser && (
        <div className="mb-2 flex items-center justify-end">
          <ColumnChooser controller={controller} state={state} />
        </div>
      )}
      <div className={cn('ag-data-grid w-full', gridClassName)}>
        <AgGridReact<DisplayRow<Row>>
          theme={dataGridTheme}
          columnDefs={colDefs}
          rowData={displayRows}
          getRowId={getDisplayRowId}
          context={gridContext}
          domLayout={autoHeight ? 'autoHeight' : 'normal'}
          headerHeight={hideHeader ? 0 : headerHeight}
          suppressCellFocus
          suppressDragLeaveHidesColumns
          maintainColumnOrder
          animateRows={false}
          isFullWidthRow={(p) => isDetailRow(p.rowNode.data)}
          fullWidthCellRenderer={InMemoryDetailCell}
          getRowHeight={(p) => (isDetailRow(p.data) ? initialDetailHeight : undefined)}
          getRowClass={(p) =>
            !isDetailRow(p.data) && getRowClass ? getRowClass(p.data as Row) : undefined
          }
          rowSelection={agRowSelection}
          onSelectionChanged={rowSelection ? onSelectionChanged : undefined}
          onColumnMoved={onColumnMoved}
          onColumnResized={onColumnResized}
          onCellClicked={(e) => {
            if (!onRowClick) return;
            // expander click (here or bubbled from a nested grid) must not open the row
            if (isExpanderClick(e.event)) return;
            const colId = e.column.getColId();
            if (SYNTHETIC_COL_IDS.has(colId)) return;
            // the column hosting the in-cell expander never opens the row
            if (expansion?.columnId && colId === expansion.columnId) return;
            if (e.data == null || isDetailRow(e.data)) return;
            onRowClick(e.data as Row);
          }}
          onGridReady={(e: GridReadyEvent<DisplayRow<Row>>) => {
            apiRef.current = e.api;
            applySelection();
          }}
          onRowDataUpdated={applySelection}
        />
      </div>
      {showPagination && (
        <div className="flex w-full items-center justify-center pt-3">
          <GridPagination
            controller={controller}
            total={page.total}
            page={state.page}
            pageSize={state.pageSize}
          />
        </div>
      )}
    </div>
  );
}
