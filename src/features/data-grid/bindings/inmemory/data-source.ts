import { OperatorId } from '../../core';

import type {
  CellValue,
  ColumnModel,
  Facets,
  FilterEntry,
  FilterModel,
  GridDataSource,
  GridPage,
  GridQuery,
  SortModel,
} from '../../core';

/**
 * The subset of a {@link ColumnModel} the in-memory engine needs to read/compare a
 * cell value and know how a column filters. `SimpleColumn` (and every schema
 * `ColumnModel`) already satisfies this, so callers pass their columns straight in.
 */
export type InMemoryColumn<Row> = Pick<ColumnModel<Row>, 'id' | 'field' | 'getValue' | 'filter'>;

/** Read a (possibly dotted) field path off a row without throwing on nullish links. */
function readPath(row: unknown, path: string): CellValue {
  const value = path
    .split('.')
    .reduce<unknown>(
      (acc, key) => (acc == null ? undefined : (acc as Record<string, unknown>)[key]),
      row
    );
  return value as CellValue;
}

/** Resolve a column's raw cell value: explicit `getValue` wins, else `field ?? id`. */
function cellValue<Row>(column: InMemoryColumn<Row>, row: Row): CellValue {
  if (column.getValue) return column.getValue(row);
  return readPath(row, column.field ?? column.id);
}

/** The facet lookup key for a column (mirrors `col-def-mapper`/`query-serializer`). */
function facetKeyOf<Row>(column: InMemoryColumn<Row>): string {
  return column.filter?.facetKey ?? column.filter?.field ?? column.field ?? column.id;
}

function asText(value: CellValue): string {
  return value == null ? '' : String(value);
}

function asNumber(value: CellValue): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function asTime(value: CellValue): number | null {
  if (value == null) return null;
  const t = new Date(value as string | number).getTime();
  return Number.isFinite(t) ? t : null;
}

/**
 * Per-operator in-memory predicates (Strategy pattern), mirroring the entitycore
 * `query-serializer` semantics but evaluated against the row value instead of
 * serialized to request params. Adding an operator = add a predicate here.
 */
type Predicate = (value: CellValue, entry: FilterEntry) => boolean;

const PREDICATES: Record<string, Predicate> = {
  [OperatorId.Ilike]: (value, e) => {
    if (e.value.kind !== 'text' || !e.value.text.trim()) return true;
    return asText(value).toLowerCase().includes(e.value.text.trim().toLowerCase());
  },
  [OperatorId.Contains]: (value, e) => {
    if (e.value.kind !== 'text' || !e.value.text.trim()) return true;
    return asText(value).includes(e.value.text.trim());
  },
  [OperatorId.Eq]: (value, e) => {
    if (e.value.kind !== 'text' || !e.value.text.trim()) return true;
    return asText(value).trim() === e.value.text.trim();
  },
  [OperatorId.In]: (value, e) =>
    e.value.kind !== 'set' || e.value.values.length === 0
      ? true
      : e.value.values.includes(asText(value)),
  [OperatorId.InSingleUnderscore]: (value, e) =>
    e.value.kind !== 'set' || e.value.values.length === 0
      ? true
      : e.value.values.includes(asText(value)),
  [OperatorId.NotIn]: (value, e) =>
    e.value.kind !== 'set' || e.value.values.length === 0
      ? true
      : !e.value.values.includes(asText(value)),
  [OperatorId.Gte]: (value, e) => {
    if (e.value.kind !== 'number' || e.value.value == null) return true;
    const n = asNumber(value);
    return n != null && n >= e.value.value;
  },
  [OperatorId.Lte]: (value, e) => {
    if (e.value.kind !== 'number' || e.value.value == null) return true;
    const n = asNumber(value);
    return n != null && n <= e.value.value;
  },
  [OperatorId.Range]: (value, e) => {
    if (e.value.kind !== 'range') return true;
    const n = asNumber(value);
    if (n == null) return e.value.min == null && e.value.max == null;
    if (e.value.min != null && n < e.value.min) return false;
    if (e.value.max != null && n > e.value.max) return false;
    return true;
  },
  [OperatorId.DateRange]: (value, e) => {
    if (e.value.kind !== 'dateRange') return true;
    const t = asTime(value);
    if (t == null) return !e.value.from && !e.value.to;
    const from = e.value.from ? new Date(e.value.from).getTime() : null;
    const to = e.value.to ? new Date(e.value.to).getTime() : null;
    if (from != null && t < from) return false;
    if (to != null && t > to) return false;
    return true;
  },
  [OperatorId.Bool]: (value, e) =>
    e.value.kind !== 'boolean' || e.value.value == null ? true : Boolean(value) === e.value.value,
};

function matchesFilters<Row>(
  row: Row,
  filters: FilterModel,
  byId: Map<string, InMemoryColumn<Row>>
): boolean {
  for (const entry of Object.values(filters)) {
    const column = byId.get(entry.columnId);
    if (!column) continue;
    const predicate = PREDICATES[entry.operator];
    if (predicate && !predicate(cellValue(column, row), entry)) return false;
  }
  return true;
}

function matchesQuick<Row>(row: Row, quick: string, columns: Array<InMemoryColumn<Row>>): boolean {
  const needle = quick.trim().toLowerCase();
  if (!needle) return true;
  return columns.some((c) => asText(cellValue(c, row)).toLowerCase().includes(needle));
}

/** Stable multi-column comparator honouring the {@link SortModel} order. */
function compareBySort<Row>(
  a: Row,
  b: Row,
  sort: SortModel,
  byId: Map<string, InMemoryColumn<Row>>
): number {
  for (const entry of sort) {
    const column = byId.get(entry.columnId);
    if (!column) continue;
    const av = cellValue(column, a);
    const bv = cellValue(column, b);
    let cmp = 0;
    const an = asNumber(av);
    const bn = asNumber(bv);
    if (an != null && bn != null) {
      cmp = an - bn;
    } else if (av == null && bv == null) {
      cmp = 0;
    } else if (av == null) {
      cmp = -1;
    } else if (bv == null) {
      cmp = 1;
    } else {
      cmp = asText(av).localeCompare(asText(bv));
    }
    if (cmp !== 0) return entry.direction === 'asc' ? cmp : -cmp;
  }
  return 0;
}

/**
 * Facets computed from the FULL (unfiltered) row set, so a set/facet filter's
 * options stay stable while the user narrows the grid. One bucket per distinct
 * value; the value doubles as both `id` and `label` (there are no UUIDs here).
 */
export function computeInMemoryFacets<Row>(
  rows: ReadonlyArray<Row>,
  columns: Array<InMemoryColumn<Row>>
): Facets {
  const facets: Facets = {};
  for (const column of columns) {
    const operators = column.filter?.operators ?? [];
    const usesFacets = column.filter?.options == null || column.filter.options.kind === 'facets';
    const setOps: string[] = [OperatorId.In, OperatorId.InSingleUnderscore, OperatorId.NotIn];
    const isSet = operators.some((op) => setOps.includes(op));
    if (!column.filter || !isSet || !usesFacets) continue;

    const counts = new Map<string, number>();
    for (const row of rows) {
      const label = asText(cellValue(column, row));
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    facets[facetKeyOf(column)] = [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ id: label, label, count }));
  }
  return facets;
}

export interface RunInMemoryOptions<Row> {
  columns: Array<InMemoryColumn<Row>>;
  /** Ignore `query.page`/`pageSize` and return every matching row (default: false). */
  disablePagination?: boolean;
  /** Include computed facets on the returned page (default: false — compute once outside). */
  withFacets?: boolean;
}

/**
 * Apply a {@link GridQuery} (filters → sort → pagination) to an in-memory array.
 * Pure and synchronous, so a static grid can derive its page in a `useMemo`
 * without React Query. The same engine backs {@link createInMemoryDataSource}.
 */
export function runInMemoryQuery<Row>(
  rows: ReadonlyArray<Row>,
  query: GridQuery,
  options: RunInMemoryOptions<Row>
): GridPage<Row> {
  const { columns, disablePagination = false, withFacets = false } = options;
  const byId = new Map(columns.map((c) => [c.id, c] as const));

  let result = rows.filter(
    (row) =>
      matchesFilters(row, query.filters, byId) &&
      matchesQuick(row, query.quickFilter ?? '', columns)
  );

  if (query.sort.length > 0) {
    result = [...result].sort((a, b) => compareBySort(a, b, query.sort, byId));
  }

  const total = result.length;

  if (!disablePagination && query.pageSize > 0) {
    const start = (query.page - 1) * query.pageSize;
    result = result.slice(start, start + query.pageSize);
  }

  return {
    rows: result,
    total,
    facets: withFacets ? computeInMemoryFacets(rows, columns) : undefined,
  };
}

export interface InMemoryDataSourceOptions<Row> {
  columns: Array<InMemoryColumn<Row>>;
  disablePagination?: boolean;
}

/**
 * Wrap an in-memory array as a {@link GridDataSource}, so a static list can flow
 * through the exact same controller/`useDataGrid`/renderer stack as an entitycore
 * REST source. Resolves synchronously (the Promise is immediate).
 */
export function createInMemoryDataSource<Row>(
  rows: ReadonlyArray<Row>,
  options: InMemoryDataSourceOptions<Row>
): GridDataSource<Row> {
  return {
    fetch(query: GridQuery): Promise<GridPage<Row>> {
      return Promise.resolve(
        runInMemoryQuery(rows, query, {
          columns: options.columns,
          disablePagination: options.disablePagination,
          withFacets: true,
        })
      );
    },
  };
}
