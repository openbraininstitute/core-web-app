import { useCallback, useMemo, useState } from 'react';

import { defaultVisibleColumnSet, NodesGrid } from '@/features/circuit-nodes/components/nodes-grid';
import { cn } from '@/utils/css-class';

import { electrodeColumns, electrodeRows, queryElectrodes } from '../electrode-rows';

import type { IDatasource } from 'ag-grid-community';
import type { FilterModel, SortItem } from '@/features/circuit-nodes/types';
import type { PickedTrace } from '@/features/sonata-viewer/types';
import type { ElectrodeTable } from '../types';

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

const TITLE_CLASS = cn(
  'rounded-full bg-white px-3 py-1 text-sm font-bold text-primary-9',
  'shadow-[6px_6px_14px_0_#0000000f,-8px_-8px_20px_0_#ffffffd1]'
);

/** The recording's electrodes, in the table the simulations' neurons are in. */
export function ElectrodesGrid({
  table,
  name,
  picked,
  hovered,
  focusRow,
  onPick,
  onHover,
  onReset,
}: {
  table: ElectrodeTable;
  name: string;
  picked: PickedTrace[];
  hovered: number | null;
  focusRow?: { nodeId: number; key: number };
  onPick: (channel: number) => void;
  onHover: (channel: number | null) => void;
  onReset: () => void;
}) {
  const columns = useMemo(() => electrodeColumns(table), [table]);
  const rows = useMemo(() => electrodeRows(table), [table]);
  const [visibleColumns, setVisibleColumns] = useState(() => defaultVisibleColumnSet(columns));
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null);

  const datasource = useMemo<IDatasource>(
    () => ({
      rowCount: rows.length,
      getRows(params) {
        const filter = (params.filterModel ?? {}) as FilterModel;
        const sort = (params.sortModel ?? []).map((item) => ({
          column: item.colId,
          direction: item.sort,
        }));
        const kept = queryElectrodes(rows, sort, filter);
        setFilteredCount(Object.keys(filter).length > 0 ? kept.length : null);
        params.successCallback(kept.slice(params.startRow, params.endRow), kept.length);
      },
    }),
    [rows]
  );
  const rowIndexOf = useCallback(
    async (channel: number, sort: SortItem[], filter: FilterModel) =>
      queryElectrodes(rows, sort, filter).findIndex((row) => row.node_id === channel),
    [rows]
  );
  const selected = useMemo(() => new Set(picked.map((pick) => pick.traceIndex)), [picked]);

  return (
    <div className={styles.root} data-testid="recording-electrodes">
      <div className={styles.toolbar}>
        <div className={cn(styles.toolbarGroup, styles.toolbarGroupGrow)}>
          <span className={TITLE_CLASS}>Electrodes</span>
        </div>
        <div ref={setHeaderSlot} className={styles.toolbarSlot} />
      </div>
      <div className={cn(styles.body, 'relative')}>
        <NodesGrid
          columns={columns}
          rowCount={rows.length}
          filteredCount={filteredCount}
          datasource={datasource}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          pickColumn
          selectedNodeIds={selected}
          onRowClick={onPick}
          onRowHover={onHover}
          markedNodeId={hovered}
          focusRow={focusRow}
          rowIndexOf={rowIndexOf}
          reset={{ picked: picked.length > 0, onReset }}
          downloadName={`${name}_electrodes`}
          headerSlot={headerSlot}
        />
      </div>
    </div>
  );
}
