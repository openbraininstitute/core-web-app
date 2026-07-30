'use client';

import { AgGridReact } from 'ag-grid-react';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/utils/css-class';

import { registerDataGridModules } from '../renderers/aggrid/register-modules';
import { dataGridTheme } from '../renderers/aggrid/theme';

import type { ColDef, GetRowIdParams, ICellRendererParams, IHeaderParams } from 'ag-grid-community';
import type { ReactNode } from 'react';
import type { ColumnModel } from '../core';

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
  /** Extra classes for the grid wrapper. */
  className?: string;
}

/** Inline cell renderer host — invokes the column's `renderCell` with the row. */
function SimpleRenderCell<Row>(
  props: ICellRendererParams<Row> & { render: (row: Row) => ReactNode }
) {
  return props.data != null ? <>{props.render(props.data)}</> : null;
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
      resizable: c.width?.resizable ?? false,
      // client-side sorting is opt-in; a column may still opt out via `sortable`
      sortable: options.sortable && (c.sortable ?? true),
      pinned: c.pinned,
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
export function SimpleGrid<Row>({
  columns,
  rows,
  getRowId,
  pagination = false,
  pageSize = 20,
  sortable = false,
  className,
}: SimpleGridProps<Row>) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const colDefs = useMemo(() => buildSimpleColDefs(columns, { sortable }), [columns, sortable]);

  const getRowIdCb = useMemo(
    () => (getRowId ? (p: GetRowIdParams<Row>) => getRowId(p.data) : undefined),
    [getRowId]
  );

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
        headerHeight={48}
      />
    </div>
  );
}
