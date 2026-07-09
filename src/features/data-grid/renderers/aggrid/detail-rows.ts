/**
 * Full-width detail rows on AG Grid Community (which has no master-detail): the
 * renderer interleaves a synthetic detail row after each expanded data row. The
 * synthetic rows are matched by `isFullWidthRow` and rendered by the detail host.
 */

const DETAIL_ID_PREFIX = 'data-grid-detail:';

export interface DetailRowEntry<Row> {
  readonly __dataGridDetail: true;
  /** the data row this detail belongs to */
  readonly forRow: Row;
  /** id of the parent data row */
  readonly forRowId: string;
}

export type DisplayRow<Row> = Row | DetailRowEntry<Row>;

export function isDetailRow<Row>(row: unknown): row is DetailRowEntry<Row> {
  return typeof row === 'object' && row !== null && '__dataGridDetail' in row;
}

export function detailRowId(forRowId: string): string {
  return `${DETAIL_ID_PREFIX}${forRowId}`;
}

/** Insert a synthetic detail row after each expanded data row. */
export function interleaveDetailRows<Row>(
  rows: Row[],
  expandedIds: ReadonlyArray<string>,
  getRowId: (row: Row) => string
): Array<DisplayRow<Row>> {
  if (expandedIds.length === 0) return rows;
  const expanded = new Set(expandedIds);
  const out: Array<DisplayRow<Row>> = [];
  for (const row of rows) {
    out.push(row);
    const id = getRowId(row);
    if (expanded.has(id)) {
      out.push({ __dataGridDetail: true, forRow: row, forRowId: id });
    }
  }
  return out;
}
