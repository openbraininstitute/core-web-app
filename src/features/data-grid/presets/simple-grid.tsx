'use client';

import { AgGridReact } from 'ag-grid-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Align, SelectionMode } from '@/features/data-grid/core';
import { InMemoryGrid } from '@/features/data-grid/presets/in-memory-grid';
import {
  keepsBlankWhenEmpty,
  withEmptyPlaceholder,
} from '@/features/data-grid/renderers/aggrid/empty-cell';
import { registerDataGridModules } from '@/features/data-grid/renderers/aggrid/register-modules';
import { DATA_GRID_LOCALE_TEXT, dataGridTheme } from '@/features/data-grid/renderers/aggrid/theme';
import { cn } from '@/utils/css-class';

import type { UseQueryOptions } from '@tanstack/react-query';
import type {
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  ICellRendererParams,
  IHeaderParams,
  RowSelectionOptions,
  SelectionChangedEvent,
} from 'ag-grid-community';
import type { ReactNode } from 'react';
import type {
  IColumnModel,
  IGridDataSource,
  IGridPage,
  OperatorRegistry,
  TSelectionMode,
  TSortModel,
} from '@/features/data-grid/core';

registerDataGridModules();

/**
 * A column for {@link SimpleGrid}: the renderer-agnostic {@link IColumnModel} plus
 * the extras a static/nested table needs in place of the server grid's registries —
 * an inline `renderCell`, a rich `headerNode`, and AG Grid column pinning.
 */
export interface ISimpleColumn<Row = unknown> extends IColumnModel<Row> {
  /** Pin the column to an edge. */
  pinned?: 'left' | 'right';
  /** Inline React cell renderer. Wins over `getValue`/`field` when present. */
  renderCell?: (row: Row) => ReactNode;
  /** Rich header node; falls back to the plain `header` string when omitted. */
  headerNode?: ReactNode;
  /** Grow the row height to fit this cell's content (AG Grid `autoHeight`). */
  autoHeight?: boolean;
  /** Wrap long cell text instead of truncating (AG Grid `wrapText`). */
  wrapText?: boolean;
}

/**
 * Row-selection config for {@link SimpleGrid}, rendering a pinned checkbox/radio
 * column. Controlled when `selectedIds` is provided; otherwise the grid manages its
 * own selection and only emits through `onSelectionChange`.
 */
export interface ISimpleRowSelection<Row> {
  /** `Single` renders radio buttons; `Multi` renders checkboxes. */
  mode: TSelectionMode;
  /**
   * Controlled selection by row id (matched against `getRowId`, falling back to
   * AG Grid's internal node id). Omit for an uncontrolled grid.
   */
  selectedIds?: string[];
  /** Emitted on user-driven selection changes with the selected ids and rows. */
  onSelectionChange?: (ids: string[], rows: Row[]) => void;
}

/**
 * Server-side config for {@link SimpleGrid}. When set, header sort/filter and the
 * pager dispatch to the store and React Query refetches via `dataSource.fetch`; the
 * data source owns filtering/sorting/paging and `rows` is ignored.
 */
export interface ISimpleServerSide<Row> {
  /** Resolves a {@link IGridQuery} into a `{ rows, total, facets }` page. */
  dataSource: IGridDataSource<Row>;
  /** Stable base React Query key; the built query is appended so changes refetch. */
  queryKey: ReadonlyArray<unknown>;
  /** Opaque host params merged into the request (brain-region, scope, …). */
  params?: Record<string, unknown>;
  /** Gate the fetch (default: true). */
  enabled?: boolean;
  /** Total row count fallback when the data source doesn't return one. */
  total?: number;
  /** pass-through React Query options (refetchOnWindowFocus, staleTime, retry, …). */
  queryOptions?: Omit<UseQueryOptions<IGridPage<Row>>, 'queryKey' | 'queryFn'>;
}

export interface ISimpleGridProps<Row> {
  /** Column definitions. */
  columns: Array<ISimpleColumn<Row>>;
  /** Row data. Ignored when {@link ISimpleGridProps.serverSide} is set. */
  rows?: Row[];
  /** Stable row identity. Omit to let AG Grid assign internal ids. */
  getRowId?: (row: Row) => string;
  /** Enable client-side pagination (default: false). */
  pagination?: boolean;
  /** Page size when pagination is enabled (default: 20). */
  pageSize?: number;
  /** Enable client-side sorting (default: false). Per-column via `column.sortable`. */
  sortable?: boolean;
  /** Hide the column header row. */
  hideHeader?: boolean;
  /** Enable a pinned checkbox/radio selection column. Omit to disable selection. */
  rowSelection?: ISimpleRowSelection<Row>;
  /** Draw the divider border on pinned columns (default: true). */
  pinnedColumnBorder?: boolean;
  /** noun shown in the server-mode loading overlay as `loading {label}` (default: `entities`). */
  loadingLabel?: string;
  /** Extra classes for the grid wrapper. */
  className?: string;

  /**
   * Enable per-column header filter popovers; only columns declaring a `filter` show
   * the icon. Activates the enhanced engine (store-driven sort + in-memory filtering).
   */
  filterable?: boolean;
  /** Show the column show/hide chooser above the grid. Activates the enhanced engine. */
  showColumnChooser?: boolean;
  /** Default sort applied (enhanced engine only) when the user has set none. */
  defaultSort?: TSortModel;
  /** Page-size choices for the enhanced engine's pagination size changer. */
  pageSizeOptions?: number[];
  /** Operator catalog for the filter editors (default: the standard registry). */
  operators?: OperatorRegistry;
  /**
   * Opt into server mode: sort/filter/pagination are resolved by the data source
   * rather than in memory. Routes to the enhanced engine.
   */
  serverSide?: ISimpleServerSide<Row>;
}

/** Inline cell renderer host — invokes the column's `renderCell` with the row. */
function SimpleRenderCell<Row>(
  props: ICellRendererParams<Row> & { render: (row: Row) => ReactNode }
) {
  return props.data != null ? props.render(props.data) : null;
}

/** Rich header host — renders the column's `headerNode`. */
function SimpleHeaderCell(props: IHeaderParams & { node: ReactNode }) {
  return <>{props.node}</>;
}

/**
 * Map {@link ISimpleColumn}s to AG Grid `ColDef`s for the client-side row model —
 * `renderers/aggrid/col-def-mapper.ts` minus the server-grid concerns (custom sort
 * header, filter popovers, expand column).
 */
export function buildSimpleColDefs<Row>(
  columns: Array<ISimpleColumn<Row>>,
  options: { sortable: boolean }
): Array<ColDef<Row>> {
  return columns.map((c) => {
    const colDef: ColDef<Row> = {
      colId: c.id,
      headerName: c.header,
      width: c.width?.width,
      minWidth: c.width?.minWidth,
      // an explicit width wins over flex sizing
      flex: c.width?.width != null ? undefined : c.width?.flex,
      resizable: c.width?.resizable ?? true,
      sortable: options.sortable && (c.sortable ?? true),
      pinned: c.pinned,
      autoHeight: c.autoHeight,
      wrapText: c.wrapText,
      // top-align tall auto-height content instead of centring it
      cellStyle: c.autoHeight ? { display: 'flex', alignItems: 'flex-start' } : undefined,
      cellClass:
        c.align === Align.Right
          ? 'ag-right-aligned-cell'
          : c.align === Align.Center
            ? 'ag-center-aligned-cell'
            : undefined,
      headerClass: c.align === Align.Right ? 'ag-right-aligned-header' : undefined,
    };

    if (c.headerNode !== undefined) {
      colDef.headerComponent = SimpleHeaderCell;
      colDef.headerComponentParams = { node: c.headerNode };
    }

    if (c.renderCell) {
      colDef.cellRenderer = SimpleRenderCell;
      colDef.cellRendererParams = { render: c.renderCell };
    } else if (c.getValue) {
      const getValue = c.getValue;
      colDef.valueGetter = (p) => (p.data ? (getValue(p.data) ?? null) : null);
    } else {
      // `field` may be a dotted path; cast past AG Grid's keyof-based field type
      colDef.field = (c.field ?? c.id) as ColDef<Row>['field'];
    }

    // A column with its own `renderCell` owns its empty state.
    if (!c.renderCell && !keepsBlankWhenEmpty(c)) withEmptyPlaceholder(colDef);

    return colDef;
  });
}

/** Vertically centre cell content (matches the main grid's default col def). */
const DEFAULT_COL_DEF: ColDef = {
  cellStyle: { display: 'flex', alignItems: 'center' },
};

/**
 * Removes the divider border AG Grid draws on pinned columns (cells + headers, both
 * edges). Applied to the grid wrapper when `pinnedColumnBorder` is false.
 */
const NO_PINNED_BORDER_CLASS = cn(
  '[&_.ag-cell.ag-cell-last-left-pinned]:border-r-0!',
  '[&_.ag-cell.ag-cell-first-right-pinned]:border-l-0!',
  '[&_.ag-header-cell.ag-header-cell-last-left-pinned]:border-r-0!',
  '[&_.ag-header-cell.ag-header-cell-first-right-pinned]:border-l-0!',
  '[&_.ag-pinned-left-header]:border-r-0! [&_.ag-pinned-right-header]:border-l-0!',
  '[&_.ag-pinned-left-cols-container]:border-r-0! [&_.ag-pinned-right-cols-container]:border-l-0!'
);

/** Wrapper class for a SimpleGrid, folding in the pinned-border toggle. */
function simpleGridWrapperClass(className?: string, pinnedColumnBorder = true): string {
  return cn(
    'ag-data-grid w-full',
    // center/right aligned cells must justify (our flex cells ignore text-align)
    '[&_.ag-cell.ag-center-aligned-cell]:justify-center! [&_.ag-cell.ag-right-aligned-cell]:justify-end!',
    pinnedColumnBorder ? undefined : NO_PINNED_BORDER_CLASS,
    className
  );
}

/**
 * The pinned selection column: fixed width, non-movable, checkbox/radio centred to
 * line up with the flex-centred data cells.
 */
const SELECTION_COLUMN_DEF: ColDef = {
  width: 48,
  maxWidth: 48,
  pinned: 'left',
  resizable: false,
  suppressMovable: true,
  lockPosition: 'left',
  cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  headerClass: 'flex items-center justify-center',
};

/**
 * Lightweight grid body: AG Grid's client-side row model with the shared theme and
 * optional native sorting/pagination/selection. Used when no opt-in feature is
 * requested.
 */
function SimpleGridBasic<Row>({
  columns,
  rows = [],
  getRowId,
  pagination = false,
  pageSize = 20,
  sortable = false,
  hideHeader = false,
  rowSelection,
  pinnedColumnBorder = true,
  className,
}: ISimpleGridProps<Row>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const colDefs = useMemo(() => buildSimpleColDefs(columns, { sortable }), [columns, sortable]);

  const getRowIdCb = useMemo(
    () => (getRowId ? (p: GetRowIdParams<Row>) => getRowId(p.data) : undefined),
    [getRowId]
  );

  const apiRef = useRef<GridApi<Row> | null>(null);

  const selectionMode = rowSelection?.mode;
  const agRowSelection = useMemo<RowSelectionOptions<Row> | undefined>(() => {
    if (!selectionMode) return undefined;
    if (selectionMode === SelectionMode.Single) {
      return { mode: 'singleRow', checkboxes: true, enableClickSelection: false };
    }
    return {
      mode: 'multiRow',
      checkboxes: true,
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
    (e: SelectionChangedEvent<Row>) => {
      if (e.source === 'api') return; // our own store → grid sync
      const selectedRows = e.api.getSelectedRows();
      const ids = e.api
        .getSelectedNodes()
        .map((n) => (getRowId && n.data != null ? getRowId(n.data) : (n.id ?? '')));
      onSelectionChange?.(ids, selectedRows);
    },
    [getRowId, onSelectionChange]
  );

  // store → grid: apply the controlled `selectedIds` onto the grid nodes.
  const selectedIds = rowSelection?.selectedIds;
  const applySelection = useCallback(() => {
    const api = apiRef.current;
    if (!api || api.isDestroyed() || selectedIds === undefined) return;
    const selected = new Set(selectedIds);
    api.forEachNode((node) => {
      if (node.data == null) return;
      const id = getRowId ? getRowId(node.data) : node.id;
      const shouldSelect = id != null && selected.has(id);
      if (node.isSelected() !== shouldSelect) {
        node.setSelected(shouldSelect, false, 'api');
      }
    });
  }, [selectedIds, getRowId]);

  useEffect(() => {
    applySelection();
  }, [applySelection]);

  if (!mounted) return <div className={simpleGridWrapperClass(className, pinnedColumnBorder)} />;

  return (
    <div className={simpleGridWrapperClass(className, pinnedColumnBorder)}>
      <AgGridReact<Row>
        theme={dataGridTheme}
        localeText={DATA_GRID_LOCALE_TEXT}
        defaultColDef={DEFAULT_COL_DEF}
        columnDefs={colDefs}
        rowData={rows}
        getRowId={getRowIdCb}
        domLayout="autoHeight"
        pagination={pagination}
        paginationPageSize={pageSize}
        paginationPageSizeSelector={false}
        suppressCellFocus
        animateRows={false}
        headerHeight={hideHeader ? 0 : 48}
        rowSelection={agRowSelection}
        selectionColumnDef={rowSelection ? SELECTION_COLUMN_DEF : undefined}
        onSelectionChanged={rowSelection ? onSelectionChanged : undefined}
        onGridReady={(e: GridReadyEvent<Row>) => {
          apiRef.current = e.api;
          applySelection();
        }}
        onRowDataUpdated={applySelection}
      />
    </div>
  );
}

/**
 * A light-weight grid preset for static / nested tables (non-entitycore). By default
 * it is AG Grid's client-side model; opting into `filterable`/`showColumnChooser`
 * activates the enhanced engine, giving it the browse-entity grid's feature set
 * (header filter popovers, column chooser, store-driven sorting, pagination).
 */
export function SimpleGrid<Row>(props: ISimpleGridProps<Row>) {
  // Server mode also runs the enhanced engine: the store drives the query.
  const enhanced = Boolean(props.filterable || props.showColumnChooser || props.serverSide);
  if (!enhanced) return <SimpleGridBasic {...props} />;

  const { serverSide } = props;
  return (
    <InMemoryGrid<Row>
      columns={props.columns}
      rows={props.rows}
      getRowId={props.getRowId}
      dataSource={serverSide?.dataSource}
      queryKey={serverSide?.queryKey}
      serverParams={serverSide?.params}
      enabled={serverSide?.enabled}
      total={serverSide?.total}
      serverQueryOptions={serverSide?.queryOptions}
      loadingLabel={props.loadingLabel}
      filterable={props.filterable}
      showColumnChooser={props.showColumnChooser}
      sortable={props.sortable}
      defaultSort={props.defaultSort}
      pagination={props.pagination}
      pageSize={props.pageSize}
      pageSizeOptions={props.pageSizeOptions}
      hideHeader={props.hideHeader}
      rowSelection={props.rowSelection}
      operators={props.operators}
      className={cn(
        props.className,
        props.pinnedColumnBorder === false ? NO_PINNED_BORDER_CLASS : undefined
      )}
    />
  );
}
