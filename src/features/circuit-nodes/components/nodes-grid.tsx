import { AgGridReact } from 'ag-grid-react';
import { Modal } from 'antd';
import capitalize from 'es-toolkit/compat/capitalize';
import isEqual from 'es-toolkit/compat/isEqual';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CategoricalFilter } from '@/features/circuit-nodes/components/categorical-filter';
import { ColumnChooser } from '@/features/circuit-nodes/components/column-chooser';
import { ColumnHeader } from '@/features/circuit-nodes/components/column-header';
import { DEFAULT_VISIBLE_COLUMNS } from '@/features/circuit-nodes/types';

import type { ColDef, ColumnMovedEvent, GridReadyEvent, IDatasource } from 'ag-grid-community';
import type { ColumnMeta } from '@/features/circuit-nodes/types';

const CATEGORICAL_SET_FILTER_MAX = 100;

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

type Props = {
  columns: ColumnMeta[];
  rowCount: number;
  filteredCount: number | null;
  datasource: IDatasource;
  visibleColumns: Set<string>;
  onVisibleColumnsChange: (next: Set<string>) => void;
};

type BuildArgs = {
  orderedColumns: ColumnMeta[];
  visible: Set<string>;
  onReset: () => void;
  onOpenChooser: () => void;
};

function buildColumnDefs({ orderedColumns, visible, onReset, onOpenChooser }: BuildArgs): ColDef[] {
  return orderedColumns.map((c) => {
    const isNumeric = c.kind === 'numeric';
    const useSetFilter =
      c.kind === 'categorical' && (c.library?.length ?? 0) < CATEGORICAL_SET_FILTER_MAX;
    return {
      field: c.name,
      headerName: capitalize(c.name.replace(/_/g, ' ')),
      headerComponent: ColumnHeader,
      headerComponentParams: {
        onReset,
        isNumeric,
        onOpenChooser,
      },
      sortable: true,
      resizable: true,
      hide: !visible.has(c.name),
      filter: useSetFilter
        ? CategoricalFilter
        : isNumeric
          ? 'agNumberColumnFilter'
          : 'agTextColumnFilter',
      filterParams: useSetFilter ? { library: c.library } : undefined,
      suppressHeaderMenuButton: true,
      minWidth: isNumeric ? 120 : 140,
      width: isNumeric ? 140 : 160,
      cellClass: isNumeric ? 'ag-right-aligned-cell' : undefined,
      valueFormatter: isNumeric
        ? (p) => (typeof p.value === 'number' ? formatNumber(p.value) : p.value)
        : undefined,
    } satisfies ColDef;
  });
}

function formatNumber(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (Number.isInteger(v)) return String(v);
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) return v.toExponential(3);
  return v.toFixed(4);
}

export function NodesGrid({
  columns,
  rowCount,
  filteredCount,
  datasource,
  visibleColumns,
  onVisibleColumnsChange,
}: Props) {
  const gridRef = useRef<AgGridReact>(null);

  const [orderedNames, setOrderedNames] = useState<string[]>(() => defaultColumnOrder(columns));
  const [chooserOpen, setChooserOpen] = useState(false);
  const openChooser = useCallback(() => setChooserOpen(true), []);

  useEffect(() => {
    setOrderedNames(defaultColumnOrder(columns));
  }, [columns]);

  const orderedColumns = useMemo(() => {
    const byName = new Map(columns.map((c) => [c.name, c]));
    const known = orderedNames.map((n) => byName.get(n)).filter((c): c is ColumnMeta => Boolean(c));
    const knownSet = new Set(known.map((c) => c.name));
    const rest = columns.filter((c) => !knownSet.has(c.name));
    return [...known, ...rest];
  }, [columns, orderedNames]);

  const resetAll = useCallback(() => {
    const api = gridRef.current?.api;
    if (api) api.resetColumnState();
    setOrderedNames(defaultColumnOrder(columns));
    onVisibleColumnsChange(defaultVisibleColumnSet(columns));
  }, [columns, onVisibleColumnsChange]);

  const columnDefs = useMemo(
    () =>
      buildColumnDefs({
        orderedColumns,
        visible: visibleColumns,
        onReset: resetAll,
        onOpenChooser: openChooser,
      }),
    [orderedColumns, visibleColumns, resetAll, openChooser]
  );

  const onColumnMoved = (e: ColumnMovedEvent) => {
    if (!e.finished) return;
    const nextOrder = e.api
      .getColumnState()
      .map((s) => s.colId)
      .filter((id): id is string => typeof id === 'string');
    setOrderedNames((prev) => (isEqual(prev, nextOrder) ? prev : nextOrder));
  };

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.setGridOption('context', { visibleColumns: Array.from(visibleColumns) });
    api.refreshInfiniteCache();
  }, [visibleColumns]);

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.applyColumnState({
      state: orderedNames.map((colId) => ({ colId })),
      applyOrder: true,
    });
  }, [orderedNames]);

  const onGridReady = (e: GridReadyEvent) => {
    e.api.setGridOption('context', { visibleColumns: Array.from(visibleColumns) });
    e.api.setGridOption('datasource', datasource);
  };

  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.setGridOption('datasource', datasource);
  }, [datasource]);

  return (
    <div className={`ag-theme-quartz ${styles.gridWrapper}`}>
      <div className={styles.gridHeader}>
        <span className={styles.gridStat}>
          {filteredCount === null ? (
            <>{rowCount.toLocaleString()} nodes</>
          ) : (
            <>
              <strong className={styles.gridStatHighlight}>{filteredCount.toLocaleString()}</strong>{' '}
              of {rowCount.toLocaleString()} nodes
            </>
          )}
        </span>
      </div>
      <div className={styles.grid}>
        <AgGridReact
          ref={gridRef}
          columnDefs={columnDefs}
          rowModelType="infinite"
          cacheBlockSize={200}
          maxBlocksInCache={10}
          infiniteInitialRowCount={Math.min(rowCount, 200)}
          rowBuffer={50}
          blockLoadDebounceMillis={75}
          suppressMultiSort={false}
          suppressColumnVirtualisation
          suppressCellFocus
          maintainColumnOrder
          onGridReady={onGridReady}
          onColumnMoved={onColumnMoved}
          context={{ visibleColumns: Array.from(visibleColumns) }}
        />
      </div>
      <Modal
        title="Choose columns"
        open={chooserOpen}
        onCancel={() => setChooserOpen(false)}
        footer={null}
        width={360}
      >
        <ColumnChooser
          columns={columns}
          orderedNames={orderedNames}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={onVisibleColumnsChange}
          onOrderedNamesChange={setOrderedNames}
        />
      </Modal>
    </div>
  );
}

export function defaultVisibleColumnSet(columns: ColumnMeta[]): Set<string> {
  const names = new Set(columns.map((c) => c.name));
  const filtered = DEFAULT_VISIBLE_COLUMNS.filter((n) => names.has(n));
  if (filtered.length === 0) return new Set(columns.slice(0, 12).map((c) => c.name));
  return new Set(filtered);
}

function defaultColumnOrder(columns: ColumnMeta[]): string[] {
  const names = new Set(columns.map((c) => c.name));
  const preferred = DEFAULT_VISIBLE_COLUMNS.filter((n) => names.has(n));
  const preferredSet = new Set(preferred);
  const rest = columns.map((c) => c.name).filter((n) => !preferredSet.has(n));
  return [...preferred, ...rest];
}
