import { numberTest, textTest } from '@/features/circuit-nodes/row-filters';
import { ColumnKindDict } from '@/features/circuit-nodes/types';

import type {
  ColumnFilter,
  ColumnMeta,
  FilterModel,
  SortItem,
} from '@/features/circuit-nodes/types';
import type { ElectrodeTable } from './types';

/** A row of the nodes grid, which goes by its node id: here the channel it is. */
export type ElectrodeRow = Record<string, string | number | null> & { node_id: number };

/** Below this many values a column is filtered by ticking them, as the nodes grid's are. */
const MAX_CATEGORIES = 100;

/** The table's columns as the nodes grid takes them, each by what its values are. */
export function electrodeColumns(table: ElectrodeTable): ColumnMeta[] {
  return table.columns.map(({ key, label }) => {
    const values = table.rows.map((row) => row[key]).filter((value) => value !== null);
    if (values.every((value) => typeof value === 'number')) {
      return { name: key, label, kind: ColumnKindDict.Numeric };
    }
    const library = [...new Set(values.map(String))].sort();
    return library.length < MAX_CATEGORIES
      ? { name: key, label, kind: ColumnKindDict.Categorical, library }
      : { name: key, label, kind: ColumnKindDict.String };
  });
}

export function electrodeRows(table: ElectrodeTable): ElectrodeRow[] {
  return table.rows.map((row, channel) => ({ ...row, node_id: channel }));
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
export function queryElectrodes(
  rows: readonly ElectrodeRow[],
  sort: readonly SortItem[],
  filter: FilterModel
): ElectrodeRow[] {
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
