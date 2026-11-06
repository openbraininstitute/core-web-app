'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { defaultVisibleColumnSet, NodesGrid } from '@/features/circuit-nodes/components/nodes-grid';
import { numberTest, textTest } from '@/features/circuit-nodes/row-filters';
import { ColumnKindDict } from '@/features/circuit-nodes/types';

import type { IDatasource } from 'ag-grid-community';
import type { PinnedColumn } from '@/features/circuit-nodes/components/nodes-grid';
import type {
  ColumnFilter,
  ColumnMeta,
  FilterModel,
  SortItem,
} from '@/features/circuit-nodes/types';
import type { ContactBlock } from '@/features/lfp-viewer/contacts';

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

/** A row of the grid, which goes by its node id: here the contact it is. */
type ContactRow = Record<string, string | number | null> & { node_id: number };

const STAT_COLUMNS: { key: string; title: string; short: string; unit: string; digits: number }[] =
  [
    { key: 'min', title: 'Min (µV)', short: 'Min', unit: 'µV', digits: 1 },
    { key: 'max', title: 'Max (µV)', short: 'Max', unit: 'µV', digits: 1 },
    { key: 'ptp', title: 'P–p (µV)', short: 'P–p', unit: 'µV', digits: 1 },
    { key: 'rms', title: 'RMS (µV)', short: 'RMS', unit: 'µV', digits: 1 },
    { key: 'trough_ms', title: 'Trough (ms)', short: 'Trough', unit: 'ms', digits: 0 },
  ];

const fixed = (digits: number) => (value: number) => value.toFixed(digits);

/** A contact's row of the table, as a hover card lists it: where it is, its share and its statistics. */
export function contactCardRows(
  contact: number,
  {
    statNames,
    stats,
    shares,
    positions,
  }: {
    statNames: readonly string[];
    stats: Float32Array;
    shares: Float32Array | null;
    positions: Float32Array | null;
  }
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (positions) {
    const at = [0, 1, 2].map((k) => Math.round(positions[contact * 3 + k])).join(', ');
    rows.push({ label: 'x, y, z', value: `${at} µm` });
  }
  if (shares) rows.push({ label: 'Share', value: `${fixed(0)(shares[contact] * 100)} %` });
  for (const s of STAT_COLUMNS) {
    const i = statNames.indexOf(s.key);
    if (i < 0) continue;
    const value = stats[contact * statNames.length + i];
    rows.push({ label: s.short, value: `${fixed(s.digits)(value)} ${s.unit}` });
  }
  return rows;
}

function matches(filter: ColumnFilter, value: string | number | null | undefined): boolean {
  if ('operator' in filter) {
    const results = filter.conditions.map((condition) => matches(condition, value));
    return filter.operator === 'OR' ? results.some(Boolean) : results.every(Boolean);
  }
  if (filter.filterType === 'set') return filter.values.includes(String(value ?? ''));
  if (filter.filterType === 'text') return textTest(filter)(String(value ?? ''));
  return value !== null && value !== undefined && numberTest(filter)(Number(value));
}

function compare(a: string | number | null, b: string | number | null): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/** The rows a grid's filters and sort leave, in its order. */
function queryContacts(
  rows: readonly ContactRow[],
  sort: readonly SortItem[],
  filter: FilterModel
): ContactRow[] {
  const filters = Object.entries(filter);
  const kept = rows.filter((row) =>
    filters.every(([column, columnFilter]) => matches(columnFilter, row[column]))
  );
  if (sort.length === 0) return kept;
  return kept.sort((a, b) => {
    for (const { column, direction } of sort) {
      const order = compare(a[column], b[column]);
      if (order !== 0) return direction === 'asc' ? order : -order;
    }
    return a.node_id - b.node_id;
  });
}

/**
 * The report's contacts, one a row, in the grid the simulations' cells are in: where each is and
 * its field's statistics over the run. A click on a row ticks its contact, as a voltage report's
 * rows tick their cells; the selected contact's row is marked and brought into view.
 */
export function ElectrodesTable({
  contacts,
  statNames,
  stats,
  shares,
  positions,
  blocks,
  ticked,
  onTick,
  reset,
  selectedContact,
  onContactHover,
}: {
  contacts: number;
  /** The summary's stats columns, in the order `stats` holds them per contact. */
  statNames: readonly string[];
  stats: Float32Array;
  /** Per contact, the part of the total's variance the field drawn makes there, if it is not the total. */
  shares: Float32Array | null;
  positions: Float32Array | null;
  blocks: readonly ContactBlock[] | null;
  ticked: readonly number[];
  onTick: (contact: number) => void;
  /** Lit while anything the reset gives back was changed: ticks, a zoom, the selection. */
  reset: { picked: boolean; onReset: () => void };
  selectedContact: number | null;
  onContactHover?: (contact: number | null) => void;
}) {
  const manyBlocks = !!blocks && blocks.length > 1;
  const columns = useMemo<ColumnMeta[]>(
    () => [
      { name: 'contact', label: 'Contact', kind: ColumnKindDict.Numeric },
      ...(manyBlocks
        ? [
            {
              name: 'block',
              label: 'Block',
              kind: ColumnKindDict.Categorical,
              library: blocks.map((b) => b.name).sort(),
            },
          ]
        : []),
      ...(positions
        ? (['x', 'y', 'z'] as const).map((axis) => ({
            name: axis,
            label: `${axis} (µm)`,
            kind: ColumnKindDict.Numeric,
          }))
        : []),
    ],
    [manyBlocks, blocks, positions]
  );
  const pinnedColumns = useMemo<PinnedColumn[]>(
    () => [
      ...(shares
        ? [
            {
              name: 'share',
              headerName: 'Share (%)',
              short: { headerName: 'Share', unit: '%' },
              format: fixed(0),
            },
          ]
        : []),
      ...STAT_COLUMNS.filter((s) => statNames.includes(s.key)).map((s) => ({
        name: s.key,
        headerName: s.title,
        short: { headerName: s.short, unit: s.unit },
        format: fixed(s.digits),
      })),
    ],
    [shares, statNames]
  );

  const rows = useMemo<ContactRow[]>(() => {
    const blockOf = (c: number) =>
      blocks?.find((b) => c >= b.first && c < b.first + b.count)?.name ?? '';
    return Array.from({ length: contacts }, (_, c) => {
      const row: ContactRow = { node_id: c, contact: c, block: blockOf(c) };
      if (positions) {
        row.x = Math.round(positions[c * 3]);
        row.y = Math.round(positions[c * 3 + 1]);
        row.z = Math.round(positions[c * 3 + 2]);
      }
      statNames.forEach((name, i) => {
        row[name] = stats[c * statNames.length + i];
      });
      if (shares) row.share = shares[c] * 100;
      return row;
    });
  }, [contacts, statNames, stats, shares, positions, blocks]);

  const [visibleColumns, setVisibleColumns] = useState(() => defaultVisibleColumnSet(columns));
  useEffect(() => setVisibleColumns(defaultVisibleColumnSet(columns)), [columns]);
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const datasource = useMemo<IDatasource>(
    () => ({
      rowCount: rows.length,
      getRows(params) {
        const filter = (params.filterModel ?? {}) as FilterModel;
        const sort = (params.sortModel ?? []).map((item) => ({
          column: item.colId,
          direction: item.sort,
        }));
        const kept = queryContacts(rows, sort, filter);
        setFilteredCount(Object.keys(filter).length > 0 ? kept.length : null);
        params.successCallback(kept.slice(params.startRow, params.endRow), kept.length);
      },
    }),
    [rows]
  );
  const rowIndexOf = useCallback(
    async (contact: number, sort: SortItem[], filter: FilterModel) =>
      queryContacts(rows, sort, filter).findIndex((row) => row.node_id === contact),
    [rows]
  );
  const selected = useMemo(() => new Set(ticked), [ticked]);

  // Selected in the traces or the map, so brought into view here.
  const [focusRow, setFocusRow] = useState<{ nodeId: number; key: number }>();
  useEffect(() => {
    if (selectedContact === null) return;
    setFocusRow((last) => ({ nodeId: selectedContact, key: (last?.key ?? 0) + 1 }));
  }, [selectedContact]);

  return (
    <div className={styles.root}>
      <NodesGrid
        columns={columns}
        rowCount={rows.length}
        filteredCount={filteredCount}
        datasource={datasource}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        pinnedColumns={pinnedColumns}
        pinnedVersion={rows}
        pickColumn
        selectedNodeIds={selected}
        onRowClick={onTick}
        onRowHover={onContactHover}
        markedNodeId={selectedContact}
        focusRow={focusRow}
        rowIndexOf={rowIndexOf}
        reset={reset}
        rowsName="Contacts"
      />
    </div>
  );
}
