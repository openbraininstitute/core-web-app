'use client';

import { AgGridReact } from 'ag-grid-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import { registerDataGridModules } from '../renderers/aggrid/register-modules';
import { dataGridTheme } from '../renderers/aggrid/theme';
import { InMemoryGrid } from './in-memory-grid';

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
import type { ColumnModel, OperatorRegistry, SortModel } from '../core';

registerDataGridModules();

/**
 * A column for {@link SimpleGrid}. Extends the renderer-agnostic
 * {@link ColumnModel} from `core` with the two extras a static/nested table needs
 * that the server grid resolves through its registry instead:
 *
 * - `renderCell` — an inline React cell renderer (there is no cell-renderer
 *   registry in a static grid), and
 * - `headerNode` — a rich header node (multi-line labels, tooltips, …) used in
 *   place of the plain `header` string.
 *
 * `pinned` maps to AG Grid column pinning (antd's `fixed: 'left' | 'right'`).
 */
export interface SimpleColumn<Row = unknown> extends ColumnModel<Row> {
  /** Pin the column to an edge (antd `fixed`). */
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
 * Row-selection config for {@link SimpleGrid}. Renders a pinned checkbox
 * (`multi`) / radio (`single`) selection column via AG Grid's native
 * `rowSelection` options. Selection is controlled when `selectedIds` is
 * provided (kept in sync with the grid); leave it undefined for an uncontrolled
 * grid that only emits through `onSelectionChange`.
 */
export interface SimpleRowSelection<Row> {
  /** `single` renders radio buttons; `multi` renders checkboxes. */
  mode: 'single' | 'multi';
  /**
   * Controlled selection by row id (matched against `getRowId`, falling back to
   * AG Grid's internal node id). Omit for an uncontrolled grid.
   */
  selectedIds?: string[];
  /** Emitted on user-driven selection changes with the selected ids and rows. */
  onSelectionChange?: (ids: string[], rows: Row[]) => void;
}

export interface SimpleGridProps<Row> {
  /** Column definitions, typed via the shared {@link SimpleColumn}/`ColumnModel`. */
  columns: Array<SimpleColumn<Row>>;
  /** Row data — passed straight to AG Grid's client-side row model. */
  rows: Row[];
  /** Stable row identity. Omit to let AG Grid assign internal ids. */
  getRowId?: (row: Row) => string;
  /** Enable client-side pagination (default: false). */
  pagination?: boolean;
  /** Page size when pagination is enabled (default: 20). */
  pageSize?: number;
  /** Enable client-side sorting (default: false). Per-column via `column.sortable`. */
  sortable?: boolean;
  /** Hide the column header row (antd `showHeader={false}`). */
  hideHeader?: boolean;
  /** Enable a pinned checkbox/radio selection column. Omit to disable selection. */
  rowSelection?: SimpleRowSelection<Row>;
  /** Extra classes for the grid wrapper. */
  className?: string;

  // ── opt-in parity features (default off → existing consumers are unchanged) ──

  /**
   * Enable per-column custom header filter popovers (same Radix UX as the entity
   * grid). Only columns that declare a `filter` show the filter icon. Turning this
   * on activates the enhanced engine (store-driven sort + in-memory filtering).
   */
  filterable?: boolean;
  /** Show the column show/hide chooser above the grid. Activates the enhanced engine. */
  showColumnChooser?: boolean;
  /** Default sort applied (enhanced engine only) when the user has set none. */
  defaultSort?: SortModel;
  /** Page-size choices for the enhanced engine's pagination size changer. */
  pageSizeOptions?: number[];
  /** Operator catalog for the filter editors (default: the standard registry). */
  operators?: OperatorRegistry;
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
 * Map {@link SimpleColumn}s to AG Grid `ColDef`s for the client-side row model.
 * Pure (no hooks, no side effects) so it is unit-testable in isolation. Mirrors
 * the approach in `renderers/aggrid/col-def-mapper.ts`, minus the server-grid
 * concerns (custom sort header, filter popovers, expand column).
 */
export function buildSimpleColDefs<Row>(
  columns: Array<SimpleColumn<Row>>,
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
      // resizable by default (parity with the browse-entity renderer); opt out per column
      resizable: c.width?.resizable ?? true,
      // client-side sorting is opt-in; a column may still opt out via `sortable`
      sortable: options.sortable && (c.sortable ?? true),
      pinned: c.pinned,
      autoHeight: c.autoHeight,
      wrapText: c.wrapText,
      // auto-height cells hold tall content (code blocks, wrapped text) — top-align
      // them instead of vertically centring (the default col def centres cells).
      cellStyle: c.autoHeight ? { display: 'flex', alignItems: 'flex-start' } : undefined,
      cellClass:
        c.align === 'right'
          ? 'ag-right-aligned-cell'
          : c.align === 'center'
            ? 'ag-center-aligned-cell'
            : undefined,
      headerClass: c.align === 'right' ? 'ag-right-aligned-header' : undefined,
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

    return colDef;
  });
}

/** Vertically centre cell content (matches the main grid's default col def). */
const DEFAULT_COL_DEF: ColDef = {
  cellStyle: { display: 'flex', alignItems: 'center' },
};

/**
 * A light-weight grid preset for STATIC / nested tables (non-entitycore): AG Grid's
 * client-side row model with the shared {@link dataGridTheme}, optional client-side
 * pagination and sorting. No controller, no data source, no React Query — pass
 * `rows` directly.
 *
 * The grid auto-sizes to its content (`domLayout="autoHeight"`), which suits
 * embedding inside an expanded row. AG Grid is client-only, so the component
 * renders a placeholder until mounted (mirrors the main renderer's SSR guard).
 */
/**
 * The pinned selection column: fixed width, non-movable, checkbox/radio centred
 * to line up with the flex-centred data cells. Mirrors the main renderer.
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
 * Backward-compatible lightweight grid: AG Grid's client-side row model with the
 * shared theme, optional native sorting/pagination/selection. This is the ORIGINAL
 * `SimpleGrid` body, unchanged — used whenever no opt-in parity feature is
 * requested, so every existing consumer behaves exactly as before.
 */
function SimpleGridBasic<Row>({
  columns,
  rows,
  getRowId,
  pagination = false,
  pageSize = 20,
  sortable = false,
  hideHeader = false,
  rowSelection,
  className,
}: SimpleGridProps<Row>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const colDefs = useMemo(() => buildSimpleColDefs(columns, { sortable }), [columns, sortable]);

  const getRowIdCb = useMemo(
    () => (getRowId ? (p: GetRowIdParams<Row>) => getRowId(p.data) : undefined),
    [getRowId]
  );

  const apiRef = useRef<GridApi<Row> | null>(null);

  const agRowSelection = useMemo<RowSelectionOptions<Row> | undefined>(() => {
    if (!rowSelection) return undefined;
    if (rowSelection.mode === 'single') {
      return { mode: 'singleRow', checkboxes: true, enableClickSelection: false };
    }
    return {
      mode: 'multiRow',
      checkboxes: true,
      headerCheckbox: true,
      selectAll: 'currentPage',
      enableClickSelection: false,
    };
  }, [rowSelection]);

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

  // store → grid: apply the controlled `selectedIds` onto the grid nodes. Only
  // runs in controlled mode (selectedIds provided); uncontrolled grids are left
  // to manage their own selection.
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

  if (!mounted) return <div className={cn('ag-data-grid w-full', className)} />;

  return (
    <div className={cn('ag-data-grid w-full', className)}>
      <AgGridReact<Row>
        theme={dataGridTheme}
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
 * A light-weight grid preset for STATIC / nested tables (non-entitycore). By default
 * it is the original lightweight grid (AG Grid client-side model). Opt in to
 * `filterable`/`showColumnChooser` to activate the ENHANCED engine, which gives it
 * the SAME feature set as the browse-entity grid — per-column custom header filter
 * popovers, a column chooser, store-driven sorting, column resizing and pagination —
 * all reusing the shared components. Every existing call site (which passes none of
 * the opt-in props) keeps the original behaviour.
 */
export function SimpleGrid<Row>(props: SimpleGridProps<Row>) {
  const enhanced = Boolean(props.filterable || props.showColumnChooser);
  if (!enhanced) return <SimpleGridBasic {...props} />;

  return (
    <InMemoryGrid<Row>
      columns={props.columns}
      rows={props.rows}
      getRowId={props.getRowId}
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
      className={props.className}
    />
  );
}
