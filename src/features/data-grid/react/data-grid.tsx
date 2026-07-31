'use client';

import { useEffect, useMemo, useRef } from 'react';

import { cn } from '@/utils/css-class';

import { isSelectionEnabled } from '../core';
import { ActiveFiltersButton } from './active-filters';
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
import type { DataGridQueryOptions } from './use-data-grid';

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
export interface DataGridSelection<Row> {
  mode: 'single' | 'multi';
  /** controlled picks (full rows); omit for uncontrolled. */
  selectedRows?: Row[];
  /** emitted with the selected rows on every user-driven change. */
  onChange: (rows: Row[]) => void;
}

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
  /** pass-through React Query options (refetchOnWindowFocus, staleTime, retry, …) */
  queryOptions?: DataGridQueryOptions<Row>;
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
  /** noun shown in the loading overlay as `loading {label}` (default: `entities`) */
  loadingLabel?: string;
  toolbarSlots?: DataGridToolbarSlots;
  /** bulk actions rendered in the toolbar while rows are selected */
  renderBulkActions?: (args: BulkActionsRenderArgs<Row>) => ReactNode;
  renderCount?: (info: { total: number; loading: boolean; error: unknown }) => ReactNode;
  /** replaces the grid body when the fetch fails (host-owned error UI) */
  renderError?: (error: unknown) => ReactNode;
  showColumnChooser?: boolean;
  className?: string;
  gridClassName?: string;
  /** picker selection (single/multi) that propagates chosen rows to a host form. */
  selection?: DataGridSelection<Row>;
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

  // Picker mode forces the selection column ON (regardless of the schema's opt-in
  // bulk-action selection) and drives the mode from the picker's single/multi.
  const pickerMode = Boolean(selection);
  const selectionEnabled = pickerMode || isSelectionEnabled(controller.schema, controller.context);
  const selectionModeOverride = selection
    ? selection.mode === 'single'
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
    if (!same) controller.store.dispatch({ type: 'setSelection', ids: controlledIds });
  }, [controlledIds, controller]);

  // store → parent: emit the selected rows on every user-driven change. The mount
  // baseline is captured WITHOUT emitting (parity with the legacy table, which fires
  // `onRowsSelected` only on user action), so a restored/empty selection never wipes
  // the host form on first render.
  const onPickerChange = selection?.onChange;
  const lastEmittedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!onPickerChange) return;
    const key = state.selection.join('|');
    if (lastEmittedRef.current === null) {
      lastEmittedRef.current = key;
      return;
    }
    if (lastEmittedRef.current === key) return;
    lastEmittedRef.current = key;
    const selectedRows = state.selection
      .map((id) => rowCacheRef.current.get(id))
      .filter((r): r is Row => r !== undefined);
    onPickerChange(selectedRows);
  }, [state.selection, onPickerChange]);

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
        slots={{ ...toolbarSlots, bulkActions: bulkActions ?? toolbarSlots?.bulkActions }}
        columnChooser={
          showColumnChooser || Object.keys(state.filters).length > 0 ? (
            <div className="flex items-center gap-2">
              {showColumnChooser ? <ColumnChooser controller={controller} state={state} /> : null}
              {/* appears only when the grid has active filters */}
              <ActiveFiltersButton controller={controller} state={state} />
            </div>
          ) : undefined
        }
      />
      <div className={cn('min-h-0 flex-1', gridClassName)}>{renderer(rendererProps)}</div>
      {/* footer: results + selection on the left, pagination centered (both on one row) */}
      <div className="relative flex min-h-[52px] items-center justify-center border-t border-gray-100 px-3 py-2">
        <div className="absolute left-3 flex flex-col gap-0.5">
          {renderCount?.({ total, loading, error })}
          {!pickerMode && selectionEnabled && selectionCount > 0 ? (
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
