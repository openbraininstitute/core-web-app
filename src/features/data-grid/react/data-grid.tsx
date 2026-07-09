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
import type { DetailRuntime, GridRenderer, GridRendererProps } from './renderer';
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

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <DataGridToolbar
        slots={{ ...toolbarSlots, bulkActions: bulkActions ?? toolbarSlots?.bulkActions }}
        count={renderCount?.({ total, loading, error })}
        columnChooser={
          showColumnChooser ? <ColumnChooser controller={controller} state={state} /> : undefined
        }
      />
      <div className={cn('min-h-0 flex-1', gridClassName)}>{renderer(rendererProps)}</div>
      <GridPagination
        controller={controller}
        total={total}
        page={state.page}
        pageSize={state.pageSize}
      />
    </div>
  );
}
