'use client';

import { useEffect, useMemo, useRef } from 'react';

import { cn } from '@/utils/css-class';

import { GridActionType, isSelectionEnabled, SelectionMode } from '../core';
import { ActiveFiltersButton } from './active-filters';
import { BulkActions } from './bulk-actions';
import { ColumnChooser } from './column-chooser';
import { GridPagination } from './pagination';
import { DataGridToolbar } from './toolbar';
import { useDataGrid } from './use-data-grid';

import type { ReactNode } from 'react';
import type {
  GridController,
  IGridDataSource,
  OperatorRegistry,
  TFacets,
  TSelectionMode,
} from '../core';
import type { IBulkActionsRenderArgs } from './bulk-actions';
import type { CellRendererRegistry } from './cell-renderer-registry';
import type {
  IDetailRuntime,
  IExpandColumnConfig,
  IGridRendererProps,
  TGridRenderer,
} from './renderer';
import type { IDataGridToolbarSlots } from './toolbar';
import type { TDataGridQueryOptions } from './use-data-grid';

/**
 * Picker selection mode. When present, the grid renders a single (radio) / multi
 * (checkbox) selection column INDEPENDENT of the schema's bulk-action `selection`,
 * and emits the selected rows to `onChange` (single = one row, replace; multi =
 * accumulate across pages). Optional `selectedRows` makes selection CONTROLLED: the
 * parent owns the picks, the grid mirrors them (checked state survives page/tab
 * switches) and seeds them into the row cache so cross-page ids always resolve to
 * full rows. Bulk actions + the selection-count footer are suppressed in this mode —
 * a picker selects INTO a form, it does not bulk-act.
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
  /** effect-time notification of the fetched total (e.g. to publish the filtered
   * count to chrome outside the grid, like the data sidebar's "x of y"). */
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
 * Generic, API-agnostic grid. Composes the headless controller (state + query
 * building), the data port (via React Query), and a rendering strategy. Knows
 * nothing about entitycore or AG Grid.
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

  const { state, rows, total, facets, loading, error } = useDataGrid<Row>({
    controller,
    dataSource,
    params,
    enabled,
    queryKey,
    queryOptions,
  });

  const columns = useMemo(() => controller.resolvedColumns(), [controller]);

  // effect-time (never during render) so a host can safely publish the total
  // into external state (jotai/query cache) without render-phase side effects.
  useEffect(() => {
    onTotalChange?.({ total, loading });
  }, [total, loading, onTotalChange]);

  // Picker mode forces the selection column ON (regardless of the schema's opt-in
  // bulk-action selection) and drives the mode from the picker's single/multi.
  const pickerMode = Boolean(selection);
  const selectionEnabled = pickerMode || isSelectionEnabled(controller.schema, controller.context);
  // EXPLICIT mapping: the picker's `SelectionMode` (single/multi) is a different
  // vocabulary from the renderer's schema-level mode ('single' radio / 'multiRow'
  // checkboxes, which itself maps onto AG Grid's 'singleRow'/'multiRow').
  const selectionModeOverride = selection
    ? selection.mode === SelectionMode.Single
      ? ('single' as const)
      : ('multiRow' as const)
    : undefined;

  // Full-row cache keyed by row id, accumulated as pages load and seeded with any
  // CONTROLLED picks. Lets the store's id-only selection resolve back to whole rows
  // for `onChange`, even for rows selected on a page that is no longer visible.
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

  // CONTROLLED sync: mirror the parent's picks into the store so the grid shows them
  // checked. Only dispatch when they diverge — after a user action the store already
  // matches what the parent will set, so this is a no-op and no loop forms.
  const controlledIds = useMemo(() => controlledRows?.map(getRowId), [controlledRows, getRowId]);
  useEffect(() => {
    if (!controlledIds) return;
    const current = controller.store.getSnapshot().selection;
    const same =
      current.length === controlledIds.length && current.every((id, i) => id === controlledIds[i]);
    if (!same) controller.store.dispatch({ type: GridActionType.SetSelection, ids: controlledIds });
  }, [controlledIds, controller]);

  // store → parent: emit the selected rows on every user-driven change. The mount
  // baseline is captured WITHOUT emitting (parity with the legacy table, which fires
  // `onRowsSelected` only on user action), so a restored/empty selection never wipes
  // the host form on first render.
  //
  // A CONTROLLER SWAP (the host rebuilds its `GridController` when the listing key
  // changes — scope, species, dataType) restarts the store on a fresh, usually empty
  // selection while this component instance — and with it `lastEmittedRef` — survives.
  // That is not a user action either, so it re-baselines exactly like a mount. Without
  // that, the two selection effects fight: this one reports the new store's empty
  // selection to the host, the CONTROLLED sync above pushes the host's picks back into
  // the store, each reading the other's pre-swap value — an unbounded ping-pong that
  // React reports as "Maximum update depth exceeded".
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

  // Bulk actions are a browse-mode affordance; a picker routes selection to the host
  // form instead, so they (and the "N selected" footer below) are suppressed there.
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
        // the schema's advanced filters + every applied filter; self-hiding when the
        // grid has neither
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
      {/* footer: bulk actions + results/selection on the left, pagination centered */}
      <div className="relative flex min-h-13 items-center justify-center border-t border-gray-100 px-3 py-2">
        <div className="absolute left-3 flex items-center gap-3">
          {bulkActions}
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
