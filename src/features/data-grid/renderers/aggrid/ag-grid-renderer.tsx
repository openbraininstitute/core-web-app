'use client';

import { AgGridReact } from 'ag-grid-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { dropPinnedColumns, GridActionType, reconcileColumnOrder } from '../../core';
import { GridLoaderOverlay } from '../../react/grid-loader';
import { buildColDefs, EXPAND_COL_ID } from './col-def-mapper';
import { AgDetailCell, DEFAULT_DETAIL_MIN_HEIGHT } from './detail-cell';
import { detailRowId, interleaveDetailRows, isDetailRow } from './detail-rows';
import { isExpanderClick } from './expand-cell';
import { registerDataGridModules } from './register-modules';
import { mergePageSelection } from './selection';
import { DATA_GRID_LOCALE_TEXT, dataGridTheme, SINGLE_SELECT_RADIO_CLASS } from './theme';

import type {
  CellClickedEvent,
  ColDef,
  ColumnMovedEvent,
  ColumnResizedEvent,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  RowClassParams,
  RowHeightParams,
  RowSelectionOptions,
  RowStyle,
  SelectionChangedEvent,
} from 'ag-grid-community';
import type { IGridRendererProps } from '../../react';
import type { IAgGridContext } from './ag-context';
import type { TDisplayRow } from './detail-rows';

registerDataGridModules();

/** AG Grid's own synthetic columns, excluded from order/width persistence. */
const SYNTHETIC_COL_IDS = new Set([EXPAND_COL_ID, 'ag-Grid-SelectionColumn']);

const DEFAULT_ROW_HEIGHT = 44;

/**
 * Vertically centre every cell's content; AG Grid otherwise top-aligns text in tall rows.
 * `justify-content` is left to the per-column `ag-*-aligned-cell` classes.
 */
const DEFAULT_COL_DEF: ColDef = {
  cellStyle: { display: 'flex', alignItems: 'center' },
};

function AgGridRendererImpl<Row>(props: IGridRendererProps<Row>) {
  const {
    controller,
    columns,
    rows,
    state,
    loading,
    facets,
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
  } = props;

  // AG Grid is client-only: render a sized placeholder until mounted, or hydration breaks.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const apiRef = useRef<GridApi<TDisplayRow<Row>> | null>(null);
  const getRowId = controller.schema.getRowId;

  // Reconciled, not sorted-by-index: a column the stored order never mentions keeps its
  // DECLARED slot rather than being appended last. Non-movable columns are dropped from
  // the stored order for the same reason — their declared slot wins.
  const orderedColumns = useMemo(() => {
    const byId = new Map(columns.map((c) => [c.id, c] as const));
    return reconcileColumnOrder(
      columns.map((c) => c.id),
      dropPinnedColumns(columns, state.columnOrder)
    )
      .map((id) => byId.get(id))
      .filter((c): c is (typeof columns)[number] => c !== undefined);
  }, [columns, state.columnOrder]);

  const hidden = useMemo(() => new Set(state.hiddenColumns), [state.hiddenColumns]);
  const colDefs = useMemo<Array<ColDef<Row>>>(
    () =>
      buildColDefs(orderedColumns, {
        hidden,
        columnWidths: state.columnWidths,
        withExpandColumn: Boolean(detail),
        expandColumn,
      }),
    [orderedColumns, hidden, state.columnWidths, detail, expandColumn]
  );

  const context = useMemo<IAgGridContext<Row>>(
    () => ({ controller, operators, facets, cellRenderers, detail }),
    [controller, operators, facets, cellRenderers, detail]
  );

  // AG Grid does not re-render header components when `context` changes, so headers would
  // read a stale, facet-less context. Refresh them whenever facets arrive.
  useEffect(() => {
    const api = apiRef.current;
    if (facets && api && !api.isDestroyed()) api.refreshHeader();
  }, [facets]);

  // `getRowStyle` is only re-evaluated on redraw, so force one when the active row changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeRowId is the trigger, not read in the body
  useEffect(() => {
    const api = apiRef.current;
    if (api && !api.isDestroyed()) api.redrawRows();
  }, [activeRowId]);

  const displayRows = useMemo<Array<TDisplayRow<Row>>>(
    () => interleaveDetailRows(rows, detail ? state.expanded : [], getRowId),
    [rows, detail, state.expanded, getRowId]
  );

  const getDisplayRowId = useCallback(
    (p: GetRowIdParams<TDisplayRow<Row>>) =>
      isDetailRow<Row>(p.data) ? detailRowId(p.data.forRowId) : getRowId(p.data),
    [getRowId]
  );

  const getRowHeight = useCallback(
    (p: RowHeightParams<TDisplayRow<Row>>) =>
      isDetailRow(p.data)
        ? (controller.schema.detail?.minHeight ?? DEFAULT_DETAIL_MIN_HEIGHT)
        : (controller.schema.rowHeight ?? DEFAULT_ROW_HEIGHT),
    [controller]
  );

  const selectionSpec = controller.schema.selection;
  // Picker mode overrides the schema's declared mode (radio single / checkbox multi).
  const effectiveSelectionMode = selectionModeOverride ?? selectionSpec?.mode;
  const rowSelection = useMemo<RowSelectionOptions<TDisplayRow<Row>> | undefined>(() => {
    if (!selectionEnabled) return undefined;
    if (effectiveSelectionMode === 'single') {
      return {
        mode: 'singleRow',
        checkboxes: (p) => !isDetailRow(p.data),
        enableClickSelection: false,
      };
    }
    return {
      mode: 'multiRow',
      checkboxes: (p) => !isDetailRow(p.data),
      headerCheckbox: selectionSpec?.headerCheckbox ?? true,
      selectAll: 'currentPage',
      enableClickSelection: false,
    };
  }, [selectionEnabled, effectiveSelectionMode, selectionSpec?.headerCheckbox]);

  const selectionColumnDef = useMemo(
    () =>
      selectionEnabled
        ? {
            width: selectionSpec?.columnWidth ?? 48,
            maxWidth: selectionSpec?.columnWidth ?? 48,
            pinned: 'left' as const,
            resizable: false,
            suppressMovable: true,
            lockPosition: 'left' as const,
            // DEFAULT_COL_DEF does not reach the selection column, so centre it here
            cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
            headerClass: 'flex items-center justify-center',
          }
        : undefined,
    [selectionEnabled, selectionSpec?.columnWidth]
  );

  // grid → store. Selection is cross-page, so this page's checkboxes must be merged with
  // ids selected on other pages, which the grid cannot see.
  const onSelectionChanged = useCallback(
    (e: SelectionChangedEvent<TDisplayRow<Row>>) => {
      if (e.source === 'api') return; // our own store → grid sync
      const selectedOnPage = e.api
        .getSelectedRows()
        .filter((r): r is Row => !isDetailRow(r))
        .map(getRowId);
      const next = mergePageSelection(
        effectiveSelectionMode,
        controller.store.getSnapshot().selection,
        rows.map(getRowId),
        selectedOnPage
      );
      controller.store.dispatch({ type: GridActionType.SetSelection, ids: next });
    },
    [controller, rows, getRowId, effectiveSelectionMode]
  );

  // store → grid; re-applied on store selection change and on `onRowDataUpdated`.
  const stateSelection = state.selection;
  const applySelection = useCallback(() => {
    const api = apiRef.current;
    if (!api || api.isDestroyed() || !selectionEnabled) return;
    const selected = new Set(stateSelection);
    api.forEachNode((node) => {
      const data = node.data;
      if (data == null || isDetailRow(data)) return;
      const shouldSelect = selected.has(getRowId(data));
      if (node.isSelected() !== shouldSelect) {
        node.setSelected(shouldSelect, false, 'api');
      }
    });
  }, [stateSelection, selectionEnabled, getRowId]);

  useEffect(() => {
    applySelection();
  }, [applySelection]);

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

  const onCellClicked = useCallback(
    (e: CellClickedEvent<TDisplayRow<Row>>) => {
      if (!onRowClick) return;
      // an expander click (here or bubbled up from a nested grid) must not open the row
      if (isExpanderClick(e.event)) return;
      const colId = e.column.getColId();
      if (SYNTHETIC_COL_IDS.has(colId)) return;
      // belt-and-braces for event retargeting defeating the check above
      if (expandColumn?.columnId && colId === expandColumn.columnId) return;
      if (e.data == null || isDetailRow(e.data)) return;
      onRowClick(e.data);
    },
    [onRowClick, expandColumn]
  );

  const getRowStyle = useCallback(
    (p: RowClassParams<TDisplayRow<Row>>): RowStyle | undefined => {
      const isActive =
        !!activeRowId && !!p.data && !isDetailRow(p.data) && getRowId(p.data) === activeRowId;
      if (isActive) {
        // background tint only: a border/shadow bleeds into the pinned selection cell
        return {
          cursor: 'pointer',
          backgroundColor: 'color-mix(in srgb, var(--color-primary-6, #1668dc) 7%, transparent)',
        };
      }
      return onRowClick ? { cursor: 'pointer' } : undefined;
    },
    [activeRowId, onRowClick, getRowId]
  );

  // Optional per-row class (e.g. hierarchy gray-out); never applied to detail rows.
  const rowClass = useCallback(
    (p: RowClassParams<TDisplayRow<Row>>): string | undefined =>
      getRowClass && p.data != null && !isDetailRow(p.data) ? getRowClass(p.data) : undefined,
    [getRowClass]
  );

  if (!mounted) return <div className="ag-data-grid h-full min-h-0 w-full" />;

  return (
    // our cells are flex, so text-align alone won't centre/right-align them
    <div
      className={`ag-data-grid h-full min-h-0 w-full [&_.ag-overlay-loading-center]:border-0! [&_.ag-overlay-loading-center]:bg-transparent! [&_.ag-overlay-loading-center]:shadow-none! [&_.ag-cell.ag-center-aligned-cell]:justify-center! [&_.ag-cell.ag-right-aligned-cell]:justify-end! ${
        effectiveSelectionMode === 'single' ? SINGLE_SELECT_RADIO_CLASS : ''
      }`}
    >
      <AgGridReact<TDisplayRow<Row>>
        theme={dataGridTheme}
        localeText={DATA_GRID_LOCALE_TEXT}
        defaultColDef={DEFAULT_COL_DEF}
        columnDefs={colDefs as Array<ColDef<TDisplayRow<Row>>>}
        rowData={displayRows}
        getRowId={getDisplayRowId}
        context={context}
        loading={loading}
        loadingOverlayComponent={GridLoaderOverlay}
        loadingOverlayComponentParams={{ label: loadingLabel ?? 'entities' }}
        suppressCellFocus
        suppressDragLeaveHidesColumns
        // NB: `maintainColumnOrder` is deliberately NOT set. The store owns column order.
        // With the flag ON, AG Grid's internal order wins and a column re-added by a
        // context change is appended after every other column (off-screen, i.e. "gone")
        // until reload. It would equally defeat `movable: false`.
        animateRows={false}
        headerHeight={48}
        getRowHeight={getRowHeight}
        isFullWidthRow={(p) => isDetailRow(p.rowNode.data)}
        fullWidthCellRenderer={AgDetailCell}
        rowSelection={rowSelection}
        selectionColumnDef={selectionColumnDef}
        onSelectionChanged={selectionEnabled ? onSelectionChanged : undefined}
        onGridReady={(e: GridReadyEvent<TDisplayRow<Row>>) => {
          apiRef.current = e.api;
          applySelection();
        }}
        onRowDataUpdated={applySelection}
        onColumnMoved={onColumnMoved}
        onColumnResized={onColumnResized}
        onCellClicked={onCellClicked}
        getRowStyle={getRowStyle}
        getRowClass={getRowClass ? rowClass : undefined}
      />
    </div>
  );
}

/**
 * The AG Grid rendering strategy — the only module that imports `ag-grid-*`. Wraps the
 * hook-using impl so it mounts as a real component when `TGridRenderer` is invoked.
 */
export function AgGridRenderer<Row>(props: IGridRendererProps<Row>) {
  return <AgGridRendererImpl {...props} />;
}
