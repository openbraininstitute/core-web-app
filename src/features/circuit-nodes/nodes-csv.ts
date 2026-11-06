import type { GridApi, IDatasource, SortModelItem } from 'ag-grid-community';

/** Rows asked of a datasource at once: few requests, each quick to answer. */
const BLOCK_ROWS = 10_000;

/** A cell as CSV: quoted where it holds a comma, a quote or a line break. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** The rows as CSV under their column names, a line each. */
export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const lines = [columns.map(csvCell).join(',')];
  for (const row of rows) lines.push(columns.map((column) => csvCell(row[column])).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * Every row a grid's datasource gives for its sort and filter, read a block at a time, as
 * the grid itself pages them in: what the table lists, past what it has scrolled to.
 */
export async function readAllRows({
  datasource,
  api,
  context,
  sortModel,
  filterModel,
}: {
  datasource: IDatasource;
  api: GridApi;
  context: unknown;
  sortModel: SortModelItem[];
  filterModel: unknown;
}): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let start = 0; ; start += BLOCK_ROWS) {
    const end = start + BLOCK_ROWS;
    const { block, lastRow } = await new Promise<{
      block: Record<string, unknown>[];
      lastRow?: number;
    }>((resolve, reject) => {
      datasource.getRows({
        api,
        context,
        startRow: start,
        endRow: end,
        sortModel,
        filterModel,
        successCallback: (rowsThisBlock, last) => resolve({ block: rowsThisBlock, lastRow: last }),
        failCallback: () => reject(new Error(`Rows ${start}–${end} could not be read`)),
      });
    });
    rows.push(...block);
    // The end: told so, or a block short of what was asked.
    if (
      (lastRow !== undefined && lastRow >= 0 && rows.length >= lastRow) ||
      block.length < BLOCK_ROWS
    )
      return rows;
  }
}
