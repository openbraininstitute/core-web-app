'use client';

import { useEffect, useMemo, useRef } from 'react';

import { GridActionType, isSelectionEnabled, SelectionMode } from '@/features/data-grid/core';
import { ActiveFiltersButton } from '@/features/data-grid/react/active-filters';
import { BulkActions } from '@/features/data-grid/react/bulk-actions';
import { ColumnChooser } from '@/features/data-grid/react/column-chooser';
import { GridPagination } from '@/features/data-grid/react/pagination';
import { DataGridToolbar } from '@/features/data-grid/react/toolbar';
import { useDataGrid } from '@/features/data-grid/react/use-data-grid';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type {
  GridController,
  IGridDataSource,
  OperatorRegistry,
  TFacets,
  TSelectionMode,
} from '@/features/data-grid/core';
import type { IBulkActionsRenderArgs } from '@/features/data-grid/react/bulk-actions';
import type { CellRendererRegistry } from '@/features/data-grid/react/cell-renderer-registry';
import type {
  IDetailRuntime,
  IExpandColumnConfig,
  IGridRendererProps,
  TGridRenderer,
} from '@/features/data-grid/react/renderer';
import type { IDataGridToolbarSlots } from '@/features/data-grid/react/toolbar';
import type { TDataGridQueryOptions } from '@/features/data-grid/react/use-data-grid';

/**
 * Picker selection: renders a selection column independent of the schema's bulk-action
 * `selection` and emits chosen rows to `onChange`. Bulk actions and the selection-count
 * footer are suppressed in this mode.
 */
export interface IDataGridSelection<Row> {
  mode: TSelectionMode;
  /** controlled picks (full rows); omit for uncontrolled. */
  selectedRows?: Row[];
  /** emitted with the selected rows on every user-driven change. */
  onChange: (rows: Row[]) => void;
}

export interface IDataGridProps<Row> {
  controller: GridController<Row>;
  dataSource: IGridDataSource<Row>;
  /** rendering strategy (e.g. the AG Grid adapter) */
  renderer: TGridRenderer;
  operators: OperatorRegistry;
  cellRenderers: CellRendererRegistry;
  /** stable base query key for React Query */
  queryKey: ReadonlyArray<unknown>;
  /** opaque host params merged into the request (brain-region, scope, with_facets, …) */
  params?: Record<string, unknown>;
  enabled?: boolean;
  /** pass-through React Query options (refetchOnWindowFocus, staleTime, retry, …) */
  queryOptions?: TDataGridQueryOptions<Row>;
  /** external facets override (when the host computes facets separately) */
  facets?: TFacets;
  detail?: IDetailRuntime<Row>;
  onRowClick?: (row: Row) => void;
  /** id of the row whose mini-detail view is open — highlighted in the grid */
  activeRowId?: string;
  /** optional per-row css class hook (e.g. hierarchy filtered-in/out styling) */
  getRowClass?: (row: Row) => string | undefined;
  /** optional placement of the expand control (default: fixed leading column) */
  expandColumn?: IExpandColumnConfig;
  /** noun shown in the loading overlay as `loading {label}` (default: `entities`) */
  loadingLabel?: string;
  toolbarSlots?: IDataGridToolbarSlots;
  /** bulk actions rendered in the toolbar while rows are selected */
  renderBulkActions?: (args: IBulkActionsRenderArgs<Row>) => ReactNode;
  renderCount?: (info: { total: number; loading: boolean; error: unknown }) => ReactNode;
  /** effect-time notification of the fetched total, for chrome outside the grid */
  onTotalChange?: (info: { total: number; loading: boolean }) => void;
  /** replaces the grid body when the fetch fails (host-owned error UI) */
  renderError?: (error: unknown) => ReactNode;
  showColumnChooser?: boolean;
  className?: string;
  gridClassName?: string;
  /** picker selection (single/multi) that propagates chosen rows to a host form. */
  selection?: IDataGridSelection<Row>;
}

/**
 * Generic, API-agnostic grid: composes the headless controller, the data port (React
 * Query) and a rendering strategy. Knows nothing about entitycore or AG Grid.
 */
export function DataGrid<Row>(props: IDataGridProps<Row>) {
  const {
    controller,
    dataSource,
    renderer,
    operators,
    cellRenderers,
    queryKey,
    params,
    enabled,
    queryOptions,
    facets: externalFacets,
    detail,
    onRowClick,
    activeRowId,
    getRowClass,
    expandColumn,
    loadingLabel,
    toolbarSlots,
    renderBulkActions,
    renderCount,
    onTotalChange,
    renderError,
    showColumnChooser = true,
    className,
    gridClassName,
    selection,
  } = props;

  const { state, rows, total, singlePage, facets, loading, error } = useDataGrid<Row>({
    controller,
    dataSource,
    params,
    enabled,
    queryKey,
    queryOptions,
  });

  const columns = useMemo(() => controller.resolvedColumns(), [controller]);

  // Effect-time, never during render, so a host can publish the total into external state.
  useEffect(() => {
    onTotalChange?.({ total, loading });
  }, [total, loading, onTotalChange]);

  // Picker mode forces the selection column on regardless of the schema's opt-in.
  const pickerMode = Boolean(selection);
  const selectionEnabled = pickerMode || isSelectionEnabled(controller.schema, controller.context);
  // The picker's `SelectionMode` is a different vocabulary from the renderer's mode.
  const selectionModeOverride = selection
    ? selection.mode === SelectionMode.Single
      ? ('single' as const)
      : ('multiRow' as const)
    : undefined;

  // Lets the store's id-only selection resolve back to whole rows for `onChange`, even
  // for rows selected on a page that is no longer visible.
  const getRowId = controller.schema.getRowId;
  const rowCacheRef = useRef(new Map<string, Row>());
  const controlledRows = selection?.selectedRows;
  useEffect(() => {
    if (!pickerMode) return;
    for (const r of rows) rowCacheRef.current.set(getRowId(r), r);
  }, [rows, pickerMode, getRowId]);
  useEffect(() => {
    if (!controlledRows) return;
    for (const r of controlledRows) rowCacheRef.current.set(getRowId(r), r);
  }, [controlledRows, getRowId]);

  // Controlled sync: mirror the parent's picks into the store. Dispatch only when they
  // diverge, otherwise a user action loops back through here.
  const controlledIds = useMemo(() => controlledRows?.map(getRowId), [controlledRows, getRowId]);
  useEffect(() => {
    if (!controlledIds) return;
    const current = controller.store.getSnapshot().selection;
    const same =
      current.length === controlledIds.length && current.every((id, i) => id === controlledIds[i]);
    if (!same) controller.store.dispatch({ type: GridActionType.SetSelection, ids: controlledIds });
  }, [controlledIds, controller]);

  // store → parent, on user-driven changes only. The mount baseline is captured without
  // emitting, so a restored/empty selection never wipes the host form on first render.
  // A CONTROLLER SWAP re-baselines the same way: it restarts the store on a fresh, empty
  // selection while this component (and `lastEmittedRef`) survives. Without that, this
  // effect and the controlled sync above ping-pong into "Maximum update depth exceeded".
  const onPickerChange = selection?.onChange;
  const lastEmittedRef = useRef<string | null>(null);
  const emitBaselineControllerRef = useRef<GridController<Row> | null>(null);
  useEffect(() => {
    if (!onPickerChange) return;
    const key = state.selection.join('|');
    const isNewController = emitBaselineControllerRef.current !== controller;
    emitBaselineControllerRef.current = controller;
    if (lastEmittedRef.current === null || isNewController) {
      lastEmittedRef.current = key;
      return;
    }
    if (lastEmittedRef.current === key) return;
    lastEmittedRef.current = key;
    const selectedRows = state.selection
      .map((id) => rowCacheRef.current.get(id))
      .filter((r): r is Row => r !== undefined);
    onPickerChange(selectedRows);
  }, [state.selection, onPickerChange, controller]);

  const rendererProps: IGridRendererProps<Row> = {
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
    selectionModeOverride,
    onRowClick,
    activeRowId,
    getRowClass,
    expandColumn,
    loadingLabel,
  };

  if (error && renderError) {
    return (
      <div className={cn('flex h-full min-h-0 flex-col items-center justify-center', className)}>
        {renderError(error)}
      </div>
    );
  }

  const bulkActions =
    !pickerMode && selectionEnabled && renderBulkActions ? (
      <BulkActions controller={controller} rows={rows} selection={state.selection}>
        {renderBulkActions}
      </BulkActions>
    ) : undefined;

  const selectionCount = state.selection.length;

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <DataGridToolbar
        slots={toolbarSlots}
        filters={
          <ActiveFiltersButton
            controller={controller}
            state={state}
            operators={operators}
            facets={facets ?? externalFacets}
          />
        }
        columnChooser={
          showColumnChooser ? <ColumnChooser controller={controller} state={state} /> : undefined
        }
      />
      <div className={cn('min-h-0 flex-1', gridClassName)}>{renderer(rendererProps)}</div>
      {/*
        Footer: `flex-1 basis-0` on the two side cells centres the pagination exactly,
        `min-w-fit` stops them collapsing, and `flex-wrap` stacks the row when narrow.
      */}
      <div className="flex min-h-13 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-100 px-3 py-2">
        <div className="flex min-w-fit flex-1 basis-0 items-center gap-2">{bulkActions}</div>
        {/* a single-page source honours no page number, so the pager would be inert */}
        {singlePage ? null : (
          <GridPagination
            controller={controller}
            total={total}
            page={state.page}
            pageSize={state.pageSize}
            className="shrink-0"
          />
        )}
        <div className="flex min-w-fit flex-1 basis-0 items-center justify-end gap-3">
          {renderCount?.({ total, loading, error })}
          {!pickerMode && selectionEnabled && selectionCount > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-primary-8">{selectionCount} selected</span>
              <button
                type="button"
                onClick={() =>
                  controller.store.dispatch({ type: GridActionType.SetSelection, ids: [] })
                }
                className="rounded-full px-1.5 py-0.5 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
