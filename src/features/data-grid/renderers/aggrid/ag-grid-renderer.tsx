'use client';

import { AgGridReact } from 'ag-grid-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildColDefs, EXPAND_COL_ID } from './col-def-mapper';
import { AgDetailCell, DEFAULT_DETAIL_MIN_HEIGHT } from './detail-cell';
import { detailRowId, interleaveDetailRows, isDetailRow } from './detail-rows';
import { registerDataGridModules } from './register-modules';
import { dataGridTheme } from './theme';

import type {
  CellClickedEvent,
  ColDef,
  ColumnMovedEvent,
  ColumnResizedEvent,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  RowHeightParams,
  RowSelectionOptions,
  SelectionChangedEvent,
} from 'ag-grid-community';
import type { GridRendererProps } from '../../react';
import type { AgGridContext } from './ag-context';
import type { DisplayRow } from './detail-rows';

registerDataGridModules();

/** AG Grid's own synthetic columns, excluded from order/width persistence. */
const SYNTHETIC_COL_IDS = new Set([EXPAND_COL_ID, 'ag-Grid-SelectionColumn']);

const DEFAULT_ROW_HEIGHT = 44;

function AgGridRendererImpl<Row>(props: GridRendererProps<Row>) {
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
    onRowClick,
  } = props;

  // AG Grid is client-only (mirrors the legacy table's ssr:false). Render a sized
  // placeholder until mounted to avoid SSR/hydration issues.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const apiRef = useRef<GridApi<DisplayRow<Row>> | null>(null);
  const getRowId = controller.schema.getRowId;

  // Apply the persisted column order from state.
  const orderedColumns = useMemo(() => {
    const order = state.columnOrder;
    if (!order?.length) return columns;
    const idx = new Map(order.map((id, i) => [id, i] as const));
    return [...columns].sort((a, b) => (idx.get(a.id) ?? 1e6) - (idx.get(b.id) ?? 1e6));
  }, [columns, state.columnOrder]);

  const hidden = useMemo(() => new Set(state.hiddenColumns), [state.hiddenColumns]);
  const colDefs = useMemo<Array<ColDef<Row>>>(
    () =>
      buildColDefs(orderedColumns, {
        hidden,
        columnWidths: state.columnWidths,
        withExpandColumn: Boolean(detail),
      }),
    [orderedColumns, hidden, state.columnWidths, detail]
  );

  const context = useMemo<AgGridContext<Row>>(
    () => ({ controller, operators, facets, cellRenderers, detail }),
    [controller, operators, facets, cellRenderers, detail]
  );

  // Interleave synthetic full-width detail rows after expanded data rows.
  const displayRows = useMemo<Array<DisplayRow<Row>>>(
    () => interleaveDetailRows(rows, detail ? state.expanded : [], getRowId),
    [rows, detail, state.expanded, getRowId]
  );

  const getDisplayRowId = useCallback(
    (p: GetRowIdParams<DisplayRow<Row>>) =>
      isDetailRow<Row>(p.data) ? detailRowId(p.data.forRowId) : getRowId(p.data),
    [getRowId]
  );

  const getRowHeight = useCallback(
    (p: RowHeightParams<DisplayRow<Row>>) =>
      isDetailRow(p.data)
        ? (controller.schema.detail?.minHeight ?? DEFAULT_DETAIL_MIN_HEIGHT)
        : (controller.schema.rowHeight ?? DEFAULT_ROW_HEIGHT),
    [controller]
  );

  const rowSelection = useMemo<RowSelectionOptions<DisplayRow<Row>> | undefined>(
    () =>
      selectionEnabled
        ? {
            mode: 'multiRow',
            checkboxes: (p) => !isDetailRow(p.data),
            headerCheckbox: true,
            selectAll: 'currentPage',
            enableClickSelection: false,
          }
        : undefined,
    [selectionEnabled]
  );

  // grid → store. Selection is cross-page: merge this page's checkboxes with the
  // ids selected on other pages (which the grid cannot see).
  const onSelectionChanged = useCallback(
    (e: SelectionChangedEvent<DisplayRow<Row>>) => {
      if (e.source === 'api') return; // our own store → grid sync
      const pageIds = new Set(rows.map(getRowId));
      const selectedOnPage = e.api
        .getSelectedRows()
        .filter((r): r is Row => !isDetailRow(r))
        .map(getRowId);
      const offPage = controller.store.getSnapshot().selection.filter((id) => !pageIds.has(id));
      controller.store.dispatch({ type: 'setSelection', ids: [...offPage, ...selectedOnPage] });
    },
    [controller, rows, getRowId]
  );

  // store → grid. Re-applied when the store selection changes (effect below) and
  // when the page's rows update (onRowDataUpdated).
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

  // Persist drag-and-drop column reordering into the store (→ StatePersistence).
  const onColumnMoved = useCallback(
    (e: ColumnMovedEvent) => {
      if (!e.finished) return;
      const order = e.api
        .getColumnState()
        .map((s) => s.colId)
        .filter((id): id is string => typeof id === 'string' && !SYNTHETIC_COL_IDS.has(id));
      controller.store.dispatch({ type: 'setColumnOrder', order });
    },
    [controller]
  );

  // Persist interactive column resizes into the store (→ StatePersistence).
  const onColumnResized = useCallback(
    (e: ColumnResizedEvent) => {
      if (!e.finished || e.source !== 'uiColumnResized') return;
      for (const col of e.columns ?? []) {
        const id = col.getColId();
        if (SYNTHETIC_COL_IDS.has(id)) continue;
        controller.store.dispatch({
          type: 'setColumnWidth',
          columnId: id,
          width: col.getActualWidth(),
        });
      }
    },
    [controller]
  );

  const onCellClicked = useCallback(
    (e: CellClickedEvent<DisplayRow<Row>>) => {
      if (!onRowClick) return;
      if (SYNTHETIC_COL_IDS.has(e.column.getColId())) return;
      if (e.data == null || isDetailRow(e.data)) return;
      onRowClick(e.data);
    },
    [onRowClick]
  );

  if (!mounted) return <div className="ag-data-grid h-full min-h-0 w-full" />;

  return (
    <div className="ag-data-grid h-full min-h-0 w-full">
      <AgGridReact<DisplayRow<Row>>
        theme={dataGridTheme}
        columnDefs={colDefs as Array<ColDef<DisplayRow<Row>>>}
        rowData={displayRows}
        getRowId={getDisplayRowId}
        context={context}
        loading={loading}
        suppressCellFocus
        suppressDragLeaveHidesColumns
        maintainColumnOrder
        animateRows={false}
        headerHeight={44}
        floatingFiltersHeight={38}
        getRowHeight={getRowHeight}
        isFullWidthRow={(p) => isDetailRow(p.rowNode.data)}
        fullWidthCellRenderer={AgDetailCell}
        rowSelection={rowSelection}
        onSelectionChanged={selectionEnabled ? onSelectionChanged : undefined}
        onGridReady={(e: GridReadyEvent<DisplayRow<Row>>) => {
          apiRef.current = e.api;
          applySelection();
        }}
        onRowDataUpdated={applySelection}
        onColumnMoved={onColumnMoved}
        onColumnResized={onColumnResized}
        onCellClicked={onCellClicked}
        rowStyle={onRowClick ? { cursor: 'pointer' } : undefined}
      />
    </div>
  );
}

/**
 * The AG Grid rendering strategy. The only module that imports `ag-grid-*`. A thin
 * wrapper so the impl (which uses hooks) mounts as a real component when the generic
 * `GridRenderer` is invoked.
 */
export function AgGridRenderer<Row>(props: GridRendererProps<Row>) {
  return <AgGridRendererImpl {...props} />;
}
