'use client';

import { RiArrowDownSLine, RiArrowRightSLine } from '@remixicon/react';
import { keepPreviousData, QueryClient, useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  computeInMemoryFacets,
  runInMemoryQuery,
} from '@/features/data-grid/bindings/inmemory/data-source';
import { DEFAULT_PAGE_SIZE_OPTIONS } from '@/features/data-grid/config';
import {
  Align,
  buildGridQuery,
  createDefaultOperatorRegistry,
  dropPinnedColumns,
  GridActionType,
  GridController,
  type IColumnModel,
  type IGridContext,
  type IGridDataSource,
  type IGridPage,
  type IGridQuery,
  type IGridSchema,
  type OperatorRegistry,
  reconcileColumnOrder,
  resolveFilterTargets,
  SelectionMode,
  type TFacets,
  type TSortModel,
} from '@/features/data-grid/core';
import { CellRendererRegistry } from '@/features/data-grid/react/cell-renderer-registry';
import { ColumnChooser } from '@/features/data-grid/react/column-chooser';
import { GridLoaderOverlay } from '@/features/data-grid/react/grid-loader';
import { GridPagination } from '@/features/data-grid/react/pagination';
import { useGridState } from '@/features/data-grid/react/use-grid-state';
import { AgCellHost } from '@/features/data-grid/renderers/aggrid/cell-host';
import {
  keepsBlankWhenEmpty,
  withEmptyPlaceholder,
} from '@/features/data-grid/renderers/aggrid/empty-cell';
import { isExpanderClick } from '@/features/data-grid/renderers/aggrid/expand-cell';
import { AgHeader } from '@/features/data-grid/renderers/aggrid/header';
import { isInteractiveClick } from '@/features/data-grid/renderers/aggrid/interactive-target';
import { registerDataGridModules } from '@/features/data-grid/renderers/aggrid/register-modules';
import {
  DATA_GRID_LOCALE_TEXT,
  dataGridTheme,
  SINGLE_SELECT_RADIO_CLASS,
} from '@/features/data-grid/renderers/aggrid/theme';
import { cn } from '@/utils/css-class';

import type { UseQueryOptions } from '@tanstack/react-query';
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
import type { ISimpleColumn, ISimpleRowSelection } from '@/features/data-grid/presets/simple-grid';
import type { IServerGridState } from '@/features/data-grid/react';
import type { IAgGridContext } from '@/features/data-grid/renderers/aggrid/ag-context';

registerDataGridModules();

const EXPAND_COL_ID = '__im_expand';
const DETAIL_ID_PREFIX = 'im-detail:';
const SYNTHETIC_COL_IDS = new Set([EXPAND_COL_ID, 'ag-Grid-SelectionColumn']);

/** Shared empty registry — the in-memory grid renders cells inline, not via keys. */
const EMPTY_CELL_RENDERERS = new CellRendererRegistry();

/**
 * Vertically-centre cells. Making them flex is also what lets `justify-content` (the
 * center/right alignment classes) work — a plain block cell ignores it.
 */
const IM_DEFAULT_COL_DEF: ColDef = {
  cellStyle: { display: 'flex', alignItems: 'center' },
};

/** Stable empty base query key so client-mode consumers add no extra key segments. */
const EMPTY_QUERY_KEY: ReadonlyArray<unknown> = [];

/** Default `expansion.isExpandable`; a module constant to keep its identity stable. */
const ALWAYS_EXPANDABLE = (): boolean => true;

/**
 * Fallback client used only in client mode, so the always-called `useQuery` (rules of
 * hooks) never requires a `QueryClientProvider`. Server mode passes `undefined` and
 * reads the app's real client from context.
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

type TDisplayRow<Row> = Row | InMemoryDetailRow<Row>;

function isDetailRow<Row>(row: unknown): row is InMemoryDetailRow<Row> {
  return typeof row === 'object' && row !== null && '__imDetail' in row;
}

/**
 * Configurable expander: with {@link columnId} the chevron renders inside that
 * column's cell, otherwise in a fixed leading column.
 */
export interface IExpansionConfig<Row> {
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

export interface IInMemoryGridProps<Row> {
  columns: Array<ISimpleColumn<Row>>;
  /** Client-side rows. Ignored in server mode (`dataSource` set); defaults to `[]`. */
  rows?: Row[];
  getRowId?: (row: Row) => string;
  // ── server mode (opt-in) ──────────────────────────────────────────────────────
  /**
   * Switches the grid to server mode: sort/filter/pagination changes the serialized
   * {@link IGridQuery} and React Query refetches via `dataSource.fetch`. `rows` is
   * ignored and the in-memory query/facet helpers are not run.
   */
  dataSource?: IGridDataSource<Row>;
  /** Stable base React Query key; the built query is appended so changes refetch. */
  queryKey?: ReadonlyArray<unknown>;
  /** Opaque host params merged into the request (brain-region, scope, …). */
  serverParams?: Record<string, unknown>;
  /** noun shown in the loading overlay as `loading {label}` (default: `entities`). */
  loadingLabel?: string;
  /** pass-through React Query options for the server fetch (refetchOnWindowFocus, …). */
  serverQueryOptions?: Omit<UseQueryOptions<IGridPage<Row>>, 'queryKey' | 'queryFn'>;
  /** Gate the server fetch (default: true when a `dataSource` is set). */
  enabled?: boolean;
  /**
   * Server mode only. Rendered in place of the grid when the fetch fails; omit to fall
   * back to an empty grid, which is indistinguishable from a listing with no rows.
   */
  renderError?: (error: unknown) => ReactNode;
  /**
   * Server mode only. Notified with the fetch's status and row total, derived from React
   * Query so a cache hit still reports. The reference need not be stable.
   */
  onServerStateChange?: (result: IServerGridState) => void;
  /** Total row count fallback when the data source doesn't return one. */
  total?: number;
  /** enable the per-column custom header filter popovers (default: false). */
  filterable?: boolean;
  /** show the column show/hide chooser control (default: false). */
  showColumnChooser?: boolean;
  /**
   * Notified when the user shows/hides columns, so a host can mirror the hidden set
   * into nested grids and keep the tree column-consistent.
   */
  onHiddenColumnsChange?: (hidden: string[]) => void;
  /** enable store-driven sorting via the custom header (default: false). */
  sortable?: boolean;
  /** default sort applied when the user has set none. */
  defaultSort?: TSortModel;
  /** enable client-side pagination (default: false). */
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  hideHeader?: boolean;
  headerHeight?: number;
  rowSelection?: ISimpleRowSelection<Row>;
  /** operator catalog for the filter editors (default: the standard registry). */
  operators?: OperatorRegistry;
  /**
   * Resolves a column's `cellRenderer` key to a component, as the top-level grid's
   * binding does. Omit for a grid whose columns render inline via `renderCell`.
   */
  cellRenderers?: CellRendererRegistry;
  /** expandable detail rows + configurable expander position. */
  expansion?: IExpansionConfig<Row>;
  /** per-row class hook (e.g. hierarchy filtered-in/out styling). */
  getRowClass?: (row: Row) => string | undefined;
  onRowClick?: (row: Row) => void;
  /** AG Grid `domLayout` (default: 'autoHeight' so it embeds in expanded rows). */
  autoHeight?: boolean;
  className?: string;
  /** wrapper class for the grid element itself (excludes chooser/pagination chrome). */
  gridClassName?: string;
}

/** Strip the presentation-only extras so `ISimpleColumn` fits the pure schema. */
function toColumnModel<Row>(c: ISimpleColumn<Row>): IColumnModel<Row> {
  const { renderCell: _r, headerNode: _h, pinned: _p, autoHeight: _a, wrapText: _w, ...model } = c;
  return model;
}

/** Inline cell renderer host — invokes the column's `renderCell` with the row. */
function InMemoryRenderCell<Row>(
  props: ICellRendererParams<TDisplayRow<Row>> & { render: (row: Row) => ReactNode }
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
 * Full-width detail cell (module-level so its hooks are top-level). Reads its render
 * fn from `context.imDetail` and forwards the measured height to the AG Grid row
 * node so nested grids never clip.
 */
function InMemoryDetailCell<Row>(props: ICellRendererParams<TDisplayRow<Row>>) {
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
 * A headless in-memory grid engine shared by `SimpleGrid`'s enhanced mode and
 * `CircuitRecursiveGrid`. Builds a {@link GridController} plus an in-memory query over
 * `rows` and renders through AG Grid with the entity grid's own header filters,
 * column chooser, sorting, resizing and pagination — no AG-native filter/menu UI.
 */
export function InMemoryGrid<Row>({
  columns,
  rows = [],
  getRowId,
  dataSource,
  loadingLabel,
  serverQueryOptions,
  queryKey,
  serverParams,
  enabled,
  renderError,
  onServerStateChange,
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
  cellRenderers = EMPTY_CELL_RENDERERS,
  expansion,
  getRowClass,
  onRowClick,
  autoHeight = true,
  className,
  gridClassName,
}: IInMemoryGridProps<Row>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const apiRef = useRef<GridApi<TDisplayRow<Row>> | null>(null);
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

  // Rebuild the controller only when the columns' identity/order or the sort/page
  // config change — not on every render.
  const signature = useMemo(
    () =>
      [
        columns.map((c) => `${c.id}:${c.filter ? 1 : 0}:${c.hiddenByDefault ? 1 : 0}`).join('|'),
        sortable ? 1 : 0,
        (defaultSort ?? []).map((s) => `${s.columnId}:${s.direction}`).join(','),
        pageSize,
        (pageSizeOptions ?? []).join(','),
      ].join('#'),
    [columns, sortable, defaultSort, pageSize, pageSizeOptions]
  );

  const context = useMemo<IGridContext>(() => ({ dataType: 'in-memory-grid' }), []);
  const controllerRef = useRef<{ sig: string; controller: GridController<Row> } | null>(null);
  if (!controllerRef.current || controllerRef.current.sig !== signature) {
    const schema: IGridSchema<Row> = {
      id: 'in-memory-grid',
      getRowId: rowId,
      columns: columns.map(toColumnModel),
      defaultSort,
      // Fold the preset size in, so the schema's own options always contain the size
      // the grid starts on — otherwise the pager offers a list it can never return to,
      // and the controller's hydration clamp would discard it.
      pageSizeOptions: [
        ...new Set([...(pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS), pageSize]),
      ].sort((a, b) => a - b),
    };
    controllerRef.current = {
      sig: signature,
      controller: new GridController<Row>({ schema, context, defaultPageSize: pageSize }),
    };
  }
  const controller = controllerRef.current.controller;

  const state = useGridState(controller);
  const isServerMode = Boolean(dataSource);
  // Keyed on the slices the query reads, NOT on `state`: selection/expansion changes
  // must not give `query` a new identity and re-run the in-memory filter/sort/slice.
  const { page: statePage, pageSize: statePageSize, sort, filters, freeTextSearch } = state;
  const query = useMemo<IGridQuery>(
    () =>
      buildGridQuery(
        { page: statePage, pageSize: statePageSize, sort, filters, freeTextSearch },
        serverParams
      ),
    [statePage, statePageSize, sort, filters, freeTextSearch, serverParams]
  );

  // Keyed on the serialized query so sort/filter/page changes refetch. Always called
  // (rules of hooks) and gated by `enabled`; in client mode it stays disabled.
  const serverResult = useQuery(
    {
      // host overrides first; the grid's key/fn and enabled default must win
      placeholderData: keepPreviousData,
      ...serverQueryOptions,
      queryKey: [...(queryKey ?? EMPTY_QUERY_KEY), query],
      queryFn: ({ signal }): Promise<IGridPage<Row>> =>
        dataSource ? dataSource.fetch(query, signal) : Promise.resolve({ rows: [], total: 0 }),
      enabled: isServerMode && (enabled ?? true),
    },
    isServerMode ? undefined : getFallbackQueryClient()
  );

  // Client mode computes facets from the full row set so set-filter options stay
  // stable as the grid narrows; server mode reads them off the fetched page.
  const clientFacets = useMemo(
    () => (filterable && !isServerMode ? computeInMemoryFacets(rows, columns) : undefined),
    [filterable, isServerMode, rows, columns]
  );
  const facets: TFacets | undefined = isServerMode ? serverResult.data?.facets : clientFacets;

  // Client mode filters/sorts/paginates in memory; server mode uses the fetched page.
  const clientPage = useMemo(
    () => runInMemoryQuery(rows, query, { columns, disablePagination: !pagination }),
    [rows, query, columns, pagination]
  );
  const page: IGridPage<Row> = isServerMode
    ? { rows: serverResult.data?.rows ?? [], total: serverResult.data?.total ?? total ?? 0 }
    : clientPage;

  // Derived from the query, not from `dataSource.fetch`: a cache hit never calls the
  // fetcher, so a fetcher-driven status would silently go stale.
  const serverStatus: IServerGridState['status'] = !isServerMode
    ? 'idle'
    : serverResult.isError
      ? 'error'
      : serverResult.isLoading
        ? 'loading'
        : serverResult.data !== undefined
          ? 'loaded'
          : 'idle';
  const serverTotal = page.total;
  // Via a ref so the callback's identity is NOT an effect dep: hosts pass `serverSide`
  // as an inline object, and an inline arrow setting state would loop.
  const onServerStateChangeRef = useRef(onServerStateChange);
  useEffect(() => {
    onServerStateChangeRef.current = onServerStateChange;
  }, [onServerStateChange]);
  useEffect(() => {
    if (!isServerMode) return;
    onServerStateChangeRef.current?.({ status: serverStatus, total: serverTotal });
  }, [isServerMode, serverStatus, serverTotal]);

  const agContext = useMemo<IAgGridContext<Row>>(
    () => ({
      controller,
      operators: operatorRegistry,
      facets,
      cellRenderers,
    }),
    [controller, operatorRegistry, facets, cellRenderers]
  );

  // AG Grid doesn't re-render headers when `context` changes; refresh so the filter
  // popovers read live facet options.
  useEffect(() => {
    const api = apiRef.current;
    if (facets && api && !api.isDestroyed()) api.refreshHeader();
  }, [facets]);

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
  // The store's `columnOrder` comes from the context-resolved schema while `columns`
  // are the props as declared, so a contextually-dropped column is missing from the
  // order yet still rendered; reconciling keeps it in its declared slot rather than
  // appended last. Non-movable columns are dropped from the stored order first
  // because AG Grid reports a position for them when a neighbour is dragged past.
  const orderedColumns = useMemo(() => {
    const byId = new Map(columns.map((c) => [c.id, c] as const));
    return reconcileColumnOrder(
      columns.map((c) => c.id),
      dropPinnedColumns(columns, state.columnOrder)
    )
      .map((id) => byId.get(id))
      .filter((c): c is ISimpleColumn<Row> => c !== undefined);
  }, [columns, state.columnOrder]);

  // Module constant, not an inline arrow: this feeds `renderExpander` → `colDefs`, and a
  // fresh identity each render would rebuild every AG Grid column.
  const isExpandable = expansion?.isExpandable ?? ALWAYS_EXPANDABLE;
  const toggleExpand = useCallback(
    (row: Row) =>
      controller.store.dispatch({ type: GridActionType.ToggleExpanded, id: rowId(row) }),
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

  const colDefs = useMemo<Array<ColDef<TDisplayRow<Row>>>>(() => {
    const expandInside = expansion?.columnId;
    const expandAlign = expansion?.align ?? 'right';

    const defs = orderedColumns.map((c) => {
      const userWidth = state.columnWidths[c.id];
      const targets = filterable ? resolveFilterTargets(c) : [];
      const filterParams = targets.length > 0 ? { targets } : undefined;

      const colDef: ColDef<TDisplayRow<Row>> = {
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
        resizable: c.width?.resizable ?? true,
        pinned: c.pinned,
        autoHeight: c.autoHeight,
        wrapText: c.wrapText,
        cellStyle: c.autoHeight ? { display: 'flex', alignItems: 'flex-start' } : undefined,
        cellClass:
          c.align === Align.Right
            ? 'ag-right-aligned-cell'
            : c.align === Align.Center
              ? 'ag-center-aligned-cell'
              : undefined,
        headerClass: c.align === Align.Right ? 'ag-right-aligned-header' : undefined,
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
                {expandAlign === Align.Left && (
                  <span className="shrink-0">{renderExpander(row)}</span>
                )}
                <span className="min-w-0 flex-1">{content}</span>
                {expandAlign === Align.Right && (
                  <span className="shrink-0">{renderExpander(row)}</span>
                )}
              </div>
            );
          },
        };
      } else {
        if (c.getValue) {
          const getValue = c.getValue;
          colDef.valueGetter = (p) =>
            p.data && !isDetailRow(p.data) ? (getValue(p.data as Row) ?? null) : null;
        } else {
          colDef.field = (c.field ?? c.id) as ColDef<TDisplayRow<Row>>['field'];
        }
        // Same wiring as the shared `buildColDefs`: `AgCellHost` resolves the key off
        // the AG context's registry, so a nested grid reusing a binding's schema
        // columns renders the same cells as the top-level grid.
        if (c.cellRenderer) {
          colDef.cellRenderer = AgCellHost;
          colDef.cellRendererParams = {
            rendererKey: c.cellRenderer,
            ...c.cellRendererParams,
          };
        }
      }

      // Inline-rendered, expander-host and deliberately-blank columns are left alone.
      if (!baseRender && !isHost && !keepsBlankWhenEmpty(c)) withEmptyPlaceholder(colDef);

      return colDef;
    });

    // Fixed leading expander column when no host column was named.
    if (expansion && !expandInside) {
      const leading: ColDef<TDisplayRow<Row>> = {
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
  const displayRows = useMemo<Array<TDisplayRow<Row>>>(() => {
    if (!expansion || state.expanded.length === 0) return page.rows;
    const expanded = new Set(state.expanded);
    const out: Array<TDisplayRow<Row>> = [];
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
    (p: GetRowIdParams<TDisplayRow<Row>>) =>
      isDetailRow<Row>(p.data) ? `${DETAIL_ID_PREFIX}${p.data.forRowId}` : rowId(p.data as Row),
    [rowId]
  );

  const initialDetailHeight = expansion?.initialHeight ?? 96;
  const detailRender = expansion?.renderDetail;
  // Threaded through AG Grid's context so the module-level full-width cell reads it.
  const gridContext = useMemo(
    () => ({
      ...agContext,
      imDetail: { render: detailRender, initialHeight: initialDetailHeight },
    }),
    [agContext, detailRender, initialDetailHeight]
  );

  // ── selection ──────────────────────────────────────────────────────────────
  const selectionMode = rowSelection?.mode;
  const agRowSelection = useMemo<RowSelectionOptions<TDisplayRow<Row>> | undefined>(() => {
    if (!selectionMode) return undefined;
    if (selectionMode === SelectionMode.Single) {
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
    // Depend on the MODE, not the object. Callers pass an inline literal, so a new
    // identity every render would hand AG Grid a "changed" rowSelection config, which
    // re-initialises its selection service and drops the user's selection.
  }, [selectionMode]);

  const onSelectionChange = rowSelection?.onSelectionChange;
  const onSelectionChanged = useCallback(
    (e: SelectionChangedEvent<TDisplayRow<Row>>) => {
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
      controller.store.dispatch({ type: GridActionType.SetColumnOrder, order });
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
          type: GridActionType.SetColumnWidth,
          columnId: id,
          width: col.getActualWidth(),
        });
      }
    },
    [controller]
  );

  const showChooser = showColumnChooser;
  // Server mode paginates via the data source, so the pager always shows.
  const showPagination = pagination || isServerMode;

  if (!mounted) return <div className={cn('ag-data-grid w-full', className)} />;

  if (isServerMode && serverResult.isError && renderError) {
    return <div className={cn('w-full', className)}>{renderError(serverResult.error)}</div>;
  }

  return (
    // `autoHeight` grows to fit every row, so the wrapper is content-sized. Without it
    // AG Grid needs a DEFINITE height: the wrapper fills its container and the grid
    // cell takes the space the chooser and pager leave, so the pager stays in view and
    // the rows scroll inside the grid.
    <div className={cn('flex w-full flex-col', !autoHeight && 'h-full min-h-0', className)}>
      {showChooser && (
        <div className="mb-2 flex shrink-0 items-center justify-end">
          <ColumnChooser controller={controller} state={state} />
        </div>
      )}
      <div
        className={cn(
          'ag-data-grid w-full',
          !autoHeight && 'min-h-0 flex-1',
          // strip the AG overlay's default card so our GridLoader blends in
          '[&_.ag-overlay-loading-center]:border-0! [&_.ag-overlay-loading-center]:bg-transparent! [&_.ag-overlay-loading-center]:shadow-none!',
          // center/right aligned cells must justify (flex cells ignore text-align)
          '[&_.ag-cell.ag-center-aligned-cell]:justify-center! [&_.ag-cell.ag-right-aligned-cell]:justify-end!',
          rowSelection?.mode === SelectionMode.Single && SINGLE_SELECT_RADIO_CLASS,
          gridClassName
        )}
      >
        <AgGridReact<TDisplayRow<Row>>
          theme={dataGridTheme}
          localeText={DATA_GRID_LOCALE_TEXT}
          defaultColDef={IM_DEFAULT_COL_DEF}
          columnDefs={colDefs}
          rowData={displayRows}
          getRowId={getDisplayRowId}
          context={gridContext}
          domLayout={autoHeight ? 'autoHeight' : 'normal'}
          headerHeight={hideHeader ? 0 : headerHeight}
          loading={isServerMode && serverResult.isLoading}
          loadingOverlayComponent={GridLoaderOverlay}
          loadingOverlayComponentParams={{ label: loadingLabel ?? 'entities' }}
          suppressCellFocus
          suppressDragLeaveHidesColumns
          // `maintainColumnOrder` is deliberately NOT set: this grid's column set
          // changes whenever the chooser is ticked, and AG Grid would append each
          // re-shown column after all the others.
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
            if (isExpanderClick(e.event)) return;
            // AG's own listener fires BEFORE any React handler, so a stopPropagation
            // inside an interactive cell can't protect us — guard here.
            if (isInteractiveClick(e.event)) return;
            const colId = e.column.getColId();
            if (SYNTHETIC_COL_IDS.has(colId)) return;
            // the column hosting the in-cell expander never opens the row
            if (expansion?.columnId && colId === expansion.columnId) return;
            if (e.data == null || isDetailRow(e.data)) return;
            onRowClick(e.data as Row);
          }}
          onGridReady={(e: GridReadyEvent<TDisplayRow<Row>>) => {
            apiRef.current = e.api;
            applySelection();
          }}
          onRowDataUpdated={applySelection}
        />
      </div>
      {showPagination && (
        <div className="flex w-full shrink-0 items-center justify-center pt-3">
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
