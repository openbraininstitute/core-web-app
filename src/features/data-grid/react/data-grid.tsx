'use client';

import { useMemo } from 'react';

import { cn } from '@/utils/css-class';

import { isSelectionEnabled } from '../core';
import { BulkActions } from './bulk-actions';
import { ColumnChooser } from './column-chooser';
import { GridPagination } from './pagination';
import { DataGridToolbar } from './toolbar';
import { useDataGrid } from './use-data-grid';

import type { ReactNode } from 'react';
import type { Facets, GridController, GridDataSource, OperatorRegistry } from '../core';
import type { BulkActionsRenderArgs } from './bulk-actions';
import type { CellRendererRegistry } from './cell-renderer-registry';
import type {
  DetailRuntime,
  ExpandColumnConfig,
  GridRenderer,
  GridRendererProps,
} from './renderer';
import type { DataGridToolbarSlots } from './toolbar';

export interface DataGridProps<Row> {
  controller: GridController<Row>;
  dataSource: GridDataSource<Row>;
  /** rendering strategy (e.g. the AG Grid adapter) */
  renderer: GridRenderer;
  operators: OperatorRegistry;
  cellRenderers: CellRendererRegistry;
  /** stable base query key for React Query */
  queryKey: ReadonlyArray<unknown>;
  /** opaque host params merged into the request (brain-region, scope, with_facets, …) */
  params?: Record<string, unknown>;
  enabled?: boolean;
  /** external facets override (when the host computes facets separately) */
  facets?: Facets;
  detail?: DetailRuntime<Row>;
  onRowClick?: (row: Row) => void;
  /** id of the row whose mini-detail view is open — highlighted in the grid */
  activeRowId?: string;
  /** optional per-row css class hook (e.g. hierarchy filtered-in/out styling) */
  getRowClass?: (row: Row) => string | undefined;
  /** optional placement of the expand control (default: fixed leading column) */
  expandColumn?: ExpandColumnConfig;
  toolbarSlots?: DataGridToolbarSlots;
  /** bulk actions rendered in the toolbar while rows are selected */
  renderBulkActions?: (args: BulkActionsRenderArgs<Row>) => ReactNode;
  renderCount?: (info: { total: number; loading: boolean; error: unknown }) => ReactNode;
  /** replaces the grid body when the fetch fails (host-owned error UI) */
  renderError?: (error: unknown) => ReactNode;
  showColumnChooser?: boolean;
  className?: string;
  gridClassName?: string;
}

/**
 * Generic, API-agnostic grid. Composes the headless controller (state + query
 * building), the data port (via React Query), and a rendering strategy. Knows
 * nothing about entitycore or AG Grid.
 */
export function DataGrid<Row>(props: DataGridProps<Row>) {
  const {
    controller,
    dataSource,
    renderer,
    operators,
    cellRenderers,
    queryKey,
    params,
    enabled,
    facets: externalFacets,
    detail,
    onRowClick,
    activeRowId,
    getRowClass,
    expandColumn,
    toolbarSlots,
    renderBulkActions,
    renderCount,
    renderError,
    showColumnChooser = true,
    className,
    gridClassName,
  } = props;

  const { state, rows, total, facets, loading, error } = useDataGrid<Row>({
    controller,
    dataSource,
    params,
    enabled,
    queryKey,
  });

  const columns = useMemo(() => controller.resolvedColumns(), [controller]);
  const selectionEnabled = isSelectionEnabled(controller.schema, controller.context);

  const rendererProps: GridRendererProps<Row> = {
    controller,
    columns,
    rows,
    total,
    loading,
    state,
    facets: facets ?? externalFacets,
    operators,
    cellRenderers,
    detail,
    selectionEnabled,
    onRowClick,
    activeRowId,
    getRowClass,
    expandColumn,
  };

  if (error && renderError) {
    return (
      <div className={cn('flex h-full min-h-0 flex-col', className)}>{renderError(error)}</div>
    );
  }

  const bulkActions =
    selectionEnabled && renderBulkActions ? (
      <BulkActions controller={controller} rows={rows} selection={state.selection}>
        {renderBulkActions}
      </BulkActions>
    ) : undefined;

  const selectionCount = state.selection.length;

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <DataGridToolbar
        slots={{ ...toolbarSlots, bulkActions: bulkActions ?? toolbarSlots?.bulkActions }}
        columnChooser={
          showColumnChooser ? <ColumnChooser controller={controller} state={state} /> : undefined
        }
      />
      <div className={cn('min-h-0 flex-1', gridClassName)}>{renderer(rendererProps)}</div>
      {/* footer: results + selection on the left, pagination centered (both on one row) */}
      <div className="relative flex min-h-[52px] items-center justify-center border-t border-gray-100 px-3 py-2">
        <div className="absolute left-3 flex flex-col gap-0.5">
          {renderCount?.({ total, loading, error })}
          {selectionEnabled && selectionCount > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-primary-8">{selectionCount} selected</span>
              <button
                type="button"
                onClick={() => controller.store.dispatch({ type: 'setSelection', ids: [] })}
                className="rounded-full px-1.5 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
        <GridPagination
          controller={controller}
          total={total}
          page={state.page}
          pageSize={state.pageSize}
        />
      </div>
    </div>
  );
}
