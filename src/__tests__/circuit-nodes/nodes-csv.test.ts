import { describe, expect, it } from 'vitest';

import { readAllRows, toCsv } from '@/features/circuit-nodes/nodes-csv';

import type { GridApi, IDatasource, IGetRowsParams } from 'ag-grid-community';

/** A datasource over `count` rows that records what it was asked for. */
function rowsSource(count: number, asked: IGetRowsParams[]): IDatasource {
  return {
    getRows(params) {
      asked.push(params);
      const end = Math.min(count, params.endRow);
      const rows = Array.from({ length: Math.max(0, end - params.startRow) }, (_, i) => ({
        node_id: params.startRow + i,
      }));
      params.successCallback(rows, end >= count ? count : undefined);
    },
  };
}

describe('toCsv', () => {
  it('writes the columns asked for, quoting what needs it and leaving gaps empty', () => {
    const csv = toCsv(
      ['node_id', 'mtype', 'note'],
      [
        { node_id: 0, mtype: 'L5_TPC:A', note: 'a, b' },
        { node_id: BigInt(1), mtype: 'say "hi"', other: 'left out' },
      ]
    );
    expect(csv).toBe('node_id,mtype,note\r\n0,L5_TPC:A,"a, b"\r\n1,"say ""hi""",\r\n');
  });
});

describe('readAllRows', () => {
  it('reads every row a block at a time, with the grid’s sort, filter and context', async () => {
    const asked: IGetRowsParams[] = [];
    const sortModel = [{ colId: 'x', sort: 'desc' as const }];
    const filterModel = { mtype: { filterType: 'set', values: ['L5_MC'] } };
    const rows = await readAllRows({
      datasource: rowsSource(25_001, asked),
      api: {} as GridApi,
      context: { visibleColumns: ['node_id'] },
      sortModel,
      filterModel,
    });
    expect(rows).toHaveLength(25_001);
    expect(rows.at(-1)).toEqual({ node_id: 25_000 });
    expect(asked.map((p) => [p.startRow, p.endRow])).toEqual([
      [0, 10_000],
      [10_000, 20_000],
      [20_000, 30_000],
    ]);
    expect(asked[0].sortModel).toBe(sortModel);
    expect(asked[0].filterModel).toBe(filterModel);
    expect(asked[0].context).toEqual({ visibleColumns: ['node_id'] });
  });

  it('stops at an empty table', async () => {
    const asked: IGetRowsParams[] = [];
    const rows = await readAllRows({
      datasource: rowsSource(0, asked),
      api: {} as GridApi,
      context: undefined,
      sortModel: [],
      filterModel: {},
    });
    expect(rows).toEqual([]);
    expect(asked).toHaveLength(1);
  });
});
