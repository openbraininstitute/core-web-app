import { NESTED_ROW, NESTING_ROW } from '@/features/circuit-nodes/components/nodes-grid';

import type { IDatasource } from 'ag-grid-community';
import type { NestedRowMark, NestingRowMark } from '@/features/circuit-nodes/components/nodes-grid';
import type { FilterModel, SortDirection, SortItem } from '@/features/circuit-nodes/types';
import type { PopulationMetadata } from '@/features/sonata-viewer/types';

/** One of the compartments of a cell recorded in several: its trace, its section, and its name. */
export type Compartment = { traceIndex: number; section: number | null; label: string };

/**
 * What a compartment set says of a report's compartments: each one's offset along its
 * section, by trace, and the set's own columns, the same for every one of them.
 */
export type CompartmentNote = {
  offsets: ReadonlyMap<number, number>;
  columns: readonly { label: string; value: string }[];
};

/**
 * The table nested under a cell's row: its headers, its columns' widths as a grid template
 * every row under a cell shares, and each compartment's cells by trace.
 */
export type CompartmentTable = {
  headers: string[];
  template: string;
  cellsOf: (compartment: Compartment) => string[];
};

/** A nested column's width in characters at most: a longer value is cut short. */
const MAX_COLUMN_CHARACTERS = 32;

/**
 * The columns of the compartments' table: where a compartment set says, each one's section
 * and offset, then the set's own columns; else the compartment as the report names it.
 */
export function compartmentTable(
  compartments: ReadonlyMap<number, readonly Compartment[]>,
  note?: CompartmentNote | null
): CompartmentTable {
  const offsetOf = (compartment: Compartment) =>
    compartment.section === null ? undefined : note?.offsets.get(compartment.traceIndex);
  const located = note !== null && note !== undefined;
  const headers = located
    ? ['Section', 'Offset', ...note.columns.map((c) => c.label)]
    : ['Compartment'];
  const cellsOf = (compartment: Compartment) => {
    const offset = offsetOf(compartment);
    if (!located) return [compartment.label];
    return [
      compartment.section === null ? '' : String(compartment.section),
      offset === undefined ? '' : offset.toFixed(3),
      ...note.columns.map((c) => c.value),
    ];
  };
  // Each column as wide as its widest cell, so the rows under a cell line up.
  const widths = headers.map((header) => header.length);
  for (const list of compartments.values()) {
    for (const compartment of list) {
      cellsOf(compartment).forEach((cell, i) => {
        widths[i] = Math.max(widths[i], cell.length);
      });
    }
  }
  const template = widths
    .map((width) => `${Math.min(width, MAX_COLUMN_CHARACTERS) + 2}ch`)
    .join(' ');
  return { headers, template, cellsOf };
}

/**
 * The cells a report recorded in several compartments, each with its compartments in the
 * file's order, by the names the report's columns carry.
 */
export function compartmentsOf(population: PopulationMetadata): Map<number, Compartment[]> {
  const compartments = new Map<number, Compartment[]>();
  population.traces.forEach((trace, traceIndex) => {
    if (trace.compartment === undefined) return;
    const compartment = { traceIndex, section: trace.elementId, label: trace.compartment };
    const list = compartments.get(trace.nodeId);
    if (list) list.push(compartment);
    else compartments.set(trace.nodeId, [compartment]);
  });
  return compartments;
}

/**
 * The rows on show once some have rows open under them: the rows a sort and filter list, by
 * node id in order, and where the open ones are among them.
 */
export type NestedLayout = {
  /** The listed rows' node ids in order; null for every row in node order. */
  order: Uint32Array | null;
  /** How many rows are listed. */
  rows: number;
  /** The open rows' places among the listed ones, ascending. */
  openAt: number[];
  /** How many rows each open one has under it. */
  nested: number[];
  /** Where each open row is among the rows on show. */
  shownAt: number[];
  /** How many rows are under the open ones up to each, itself included. */
  nestedThrough: number[];
  /** The rows on show, nested ones and all. */
  total: number;
};

/**
 * The layout of the rows a sort and filter list, `order` (null for all `rows` in node order),
 * with the rows of `open`, by node id, open on as many rows each.
 */
export function nestedLayout(
  order: Uint32Array | null,
  rows: number,
  open: ReadonlyMap<number, number>
): NestedLayout {
  const listed = order ? order.length : rows;
  const openAt: number[] = [];
  if (order) {
    for (let row = 0; row < order.length; row += 1) if (open.has(order[row])) openAt.push(row);
  } else {
    for (const nodeId of open.keys()) if (nodeId < listed) openAt.push(nodeId);
    openAt.sort((a, b) => a - b);
  }
  const nested = openAt.map((row) => open.get(order ? order[row] : row) ?? 0);
  const shownAt: number[] = [];
  const nestedThrough: number[] = [];
  let before = 0;
  openAt.forEach((row, i) => {
    shownAt.push(row + before);
    before += nested[i];
    nestedThrough.push(before);
  });
  return { order, rows: listed, openAt, nested, shownAt, nestedThrough, total: listed + before };
}

/** What is at a place among the rows on show: a listed row, or the `child`th under the open row `parent`. */
export type ShownRow = { row: number } | { parent: number; child: number };

/** What is at `index` among the rows on show. */
export function shownRowAt(layout: NestedLayout, index: number): ShownRow {
  const { shownAt, openAt, nested, nestedThrough } = layout;
  // The last open row at or before the place.
  let low = 0;
  let high = shownAt.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (shownAt[middle] <= index) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  if (found < 0) return { row: index };
  const past = index - shownAt[found];
  if (past === 0) return { row: openAt[found] };
  if (past <= nested[found]) return { parent: found, child: past - 1 };
  return { row: index - nestedThrough[found] };
}

/** Where the listed row `row` is among the rows on show. */
export function shownIndexOf(layout: NestedLayout, row: number): number {
  const { openAt, nestedThrough } = layout;
  // The open rows before it put theirs ahead of it.
  let low = 0;
  let high = openAt.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (openAt[middle] < row) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found < 0 ? row : row + nestedThrough[found];
}

/** The node id of the open row `parent` of a layout. */
function openNodeId(layout: NestedLayout, parent: number): number {
  const row = layout.openAt[parent];
  return layout.order ? layout.order[row] : row;
}

type Row = Record<string, unknown>;

/**
 * The rows of `base` with rows nested under some of them: the listed rows read through it,
 * marked with what they have under them, and the nested ones made here, each after its row.
 */
export function nestedDatasource({
  base,
  layoutFor,
  nestingOf,
  nestedRow,
}: {
  base: IDatasource;
  /** The layout of the rows a sort and filter list. */
  layoutFor: (sort: SortItem[], filter: FilterModel) => Promise<NestedLayout>;
  /** What a listed row has under it, by its node id: none for most. */
  nestingOf: (nodeId: number) => NestingRowMark | undefined;
  /** The `child`th row under the row of `nodeId`, `last` when nothing follows it there. */
  nestedRow: (nodeId: number, child: number, last: boolean) => Row;
}): IDatasource {
  return {
    getRows(params) {
      const sort = (params.sortModel ?? []).map((s) => ({
        column: s.colId,
        direction: s.sort as SortDirection,
      }));
      layoutFor(sort, (params.filterModel ?? {}) as FilterModel)
        .then((layout) => {
          const end = Math.min(params.endRow, layout.total);
          const shown: ShownRow[] = [];
          for (let index = params.startRow; index < end; index += 1) {
            shown.push(shownRowAt(layout, index));
          }
          const listed = shown.flatMap((s) => ('row' in s ? [s.row] : []));
          const first = listed[0] ?? 0;
          const assemble = (rows: Row[]) =>
            params.successCallback(
              shown.map((s) => {
                if ('row' in s) {
                  const row = rows[s.row - first] ?? {};
                  const nesting = nestingOf(Number(row.node_id));
                  return nesting ? { ...row, [NESTING_ROW]: nesting } : row;
                }
                return nestedRow(
                  openNodeId(layout, s.parent),
                  s.child,
                  s.child === layout.nested[s.parent] - 1
                );
              }),
              layout.total
            );
          if (listed.length === 0) {
            assemble([]);
            return;
          }
          base.getRows({
            ...params,
            startRow: first,
            endRow: (listed.at(-1) ?? first) + 1,
            successCallback: (rows) => assemble(rows as Row[]),
          });
        })
        .catch(() => params.failCallback());
    },
  };
}

/** The first row under a cell's: the headers of the compartments' table. */
export function compartmentHeaderRow(nodeId: number, table: CompartmentTable): Row {
  const mark: NestedRowMark = {
    key: -1,
    cells: table.headers,
    template: table.template,
    last: false,
    header: true,
  };
  return { node_id: nodeId, [NESTED_ROW]: mark };
}

/**
 * A compartment's row under its cell's: the cell's node id, the compartment's trace as its
 * key, its cells in the compartments' table, and its statistics, by column, where they are
 * worked out.
 */
export function compartmentRow(
  nodeId: number,
  compartment: Compartment,
  last: boolean,
  values: Readonly<Record<string, Float64Array>> | null | undefined,
  table: CompartmentTable
): Row {
  const mark: NestedRowMark = {
    key: compartment.traceIndex,
    cells: table.cellsOf(compartment),
    template: table.template,
    last,
  };
  const row: Row = { node_id: nodeId, [NESTED_ROW]: mark };
  for (const [column, perTrace] of Object.entries(values ?? {})) {
    row[column] = perTrace[compartment.traceIndex];
  }
  return row;
}
