import { RiLayoutColumnLine } from '@remixicon/react';
import { AgGridReact } from 'ag-grid-react';
import { Checkbox, Dropdown } from 'antd';
import { useEffect, useMemo, useRef } from 'react';

import { DEFAULT_VISIBLE_COLUMNS } from '@/features/circuit-nodes/types';

import type { ColDef, GridReadyEvent, IDatasource } from 'ag-grid-community';
import type { ColumnMeta } from '@/features/circuit-nodes/types';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

type Props = {
  columns: ColumnMeta[];
  rowCount: number;
  datasource: IDatasource;
  visibleColumns: Set<string>;
  onVisibleColumnsChange: (next: Set<string>) => void;
};

function buildColumnDefs(columns: ColumnMeta[], visible: Set<string>): ColDef[] {
  return columns.map((c) => {
    const isNumeric = c.kind === 'numeric';
    return {
      field: c.name,
      headerName: c.name,
      sortable: true,
      resizable: true,
      hide: !visible.has(c.name),
      filter: isNumeric ? 'agNumberColumnFilter' : 'agTextColumnFilter',
      minWidth: isNumeric ? 100 : 120,
      cellClass: isNumeric ? 'ag-right-aligned-cell' : undefined,
      type: isNumeric ? 'rightAligned' : undefined,
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
  datasource,
  visibleColumns,
  onVisibleColumnsChange,
}: Props) {
  const gridRef = useRef<AgGridReact>(null);
  const columnDefs = useMemo(
    () => buildColumnDefs(columns, visibleColumns),
    [columns, visibleColumns]
  );

  // Keep ag-grid context up to date so the datasource can request only visible columns.
  useEffect(() => {
    const api = gridRef.current?.api;
    if (!api) return;
    api.setGridOption('context', { visibleColumns: Array.from(visibleColumns) });
    api.refreshInfiniteCache();
  }, [visibleColumns]);

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
        <span className={styles.gridStat}>{rowCount.toLocaleString()} nodes</span>
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          menu={{
            items: [
              {
                key: 'header',
                type: 'group',
                label: 'Columns',
                children: columns.map((c) => ({
                  key: c.name,
                  label: (
                    <Checkbox
                      checked={visibleColumns.has(c.name)}
                      onChange={(ev) => {
                        const next = new Set(visibleColumns);
                        if (ev.target.checked) next.add(c.name);
                        else next.delete(c.name);
                        onVisibleColumnsChange(next);
                      }}
                    >
                      {c.name}
                    </Checkbox>
                  ),
                })),
              },
            ],
          }}
        >
          <button type="button" className={styles.columnsButton}>
            <RiLayoutColumnLine size={14} />
            <span>Columns</span>
          </button>
        </Dropdown>
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
          onGridReady={onGridReady}
          context={{ visibleColumns: Array.from(visibleColumns) }}
        />
      </div>
    </div>
  );
}

export function defaultVisibleColumnSet(columns: ColumnMeta[]): Set<string> {
  const names = new Set(columns.map((c) => c.name));
  const filtered = Array.from(DEFAULT_VISIBLE_COLUMNS).filter((n) => names.has(n));
  // If none of the defaults match this dataset (unusual), fall back to first 12 columns.
  if (filtered.length === 0) return new Set(columns.slice(0, 12).map((c) => c.name));
  return new Set(filtered);
}

export { DEFAULT_VISIBLE_COLUMNS };
