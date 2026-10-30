import { describe, expect, it, vi } from 'vitest';

import { NESTED_ROW, NESTING_ROW } from '@/features/circuit-nodes/components/nodes-grid';
import {
  compartmentRow,
  compartmentsOf,
  compartmentTable,
  nestedDatasource,
  nestedLayout,
  shownIndexOf,
  shownRowAt,
} from '@/features/sonata-viewer/compartment-rows';
import { resolveTraces } from '@/features/sonata-viewer/worker/column-mapping';

import type { IDatasource, IGetRowsParams } from 'ag-grid-community';
import type { PopulationMetadata, TraceMeta } from '@/features/sonata-viewer/types';

function populationOf(traces: TraceMeta[] | null): PopulationMetadata {
  if (!traces) throw new Error('The mapping did not resolve.');
  return {
    name: 'pop',
    traces,
    nodeCount: new Set(traces.map((t) => t.nodeId)).size,
    timeConfig: { startTime: 0, endTime: 1, timeStep: 0.1, units: 'ms' },
    dataUnits: 'mV',
  };
}

describe('compartmentsOf', () => {
  it('lists a cell’s compartments by section, a section’s several numbered, and skips cells of one', () => {
    const compartments = compartmentsOf(
      populationOf(resolveTraces([0, 1, 2], [0, 3, 4, 7], [173, 249, 321, 0, 5, 5, 7], 7))
    );
    expect([...compartments.keys()]).toEqual([0, 2]);
    expect(compartments.get(0)).toEqual([
      { traceIndex: 0, section: 173, label: 'Section 173' },
      { traceIndex: 1, section: 249, label: 'Section 249' },
      { traceIndex: 2, section: 321, label: 'Section 321' },
    ]);
    expect(compartments.get(2)?.map((c) => c.label)).toEqual([
      'Section 5 · 1',
      'Section 5 · 2',
      'Section 7',
    ]);
  });

  it('numbers the compartments where the file does not say their sections', () => {
    const compartments = compartmentsOf(populationOf(resolveTraces([3], [0, 2], null, 2)));
    expect(compartments.get(3)?.map((c) => c.label)).toEqual(['Compartment 1', 'Compartment 2']);
  });
});

describe('the nested layout', () => {
  // Listed rows by node id, as a sort puts them; nodes 0 and 7 open on 3 and 2 rows.
  const layout = nestedLayout(
    Uint32Array.from([4, 0, 2, 7]),
    4,
    new Map([
      [0, 3],
      [7, 2],
      [9, 1],
    ])
  );

  it('places each row on show: listed rows, and the rows under the open ones after them', () => {
    expect(layout.total).toBe(9);
    expect(Array.from({ length: 9 }, (_, index) => shownRowAt(layout, index))).toEqual([
      { row: 0 },
      { row: 1 },
      { parent: 0, child: 0 },
      { parent: 0, child: 1 },
      { parent: 0, child: 2 },
      { row: 2 },
      { row: 3 },
      { parent: 1, child: 0 },
      { parent: 1, child: 1 },
    ]);
  });

  it('finds where a listed row is shown, past the rows open before it', () => {
    expect([0, 1, 2, 3].map((row) => shownIndexOf(layout, row))).toEqual([0, 1, 5, 6]);
  });

  it('takes the rows in node order where nothing sorts or filters them', () => {
    const identity = nestedLayout(
      null,
      5,
      new Map([
        [3, 1],
        [1, 2],
        [8, 4],
      ])
    );
    expect(identity.total).toBe(8);
    expect(identity.openAt).toEqual([1, 3]);
    expect(shownRowAt(identity, 4)).toEqual({ row: 2 });
    expect(shownRowAt(identity, 6)).toEqual({ parent: 1, child: 0 });
    expect(shownIndexOf(identity, 4)).toBe(7);
  });
});

describe('the nested datasource', () => {
  const order = [4, 0, 2, 7];
  const base: IDatasource = {
    getRows: vi.fn((params: IGetRowsParams) =>
      params.successCallback(
        order.slice(params.startRow, params.endRow).map((nodeId) => ({ node_id: nodeId })),
        order.length
      )
    ),
  };
  const open = new Map([
    [0, 3],
    [7, 2],
  ]);
  const source = nestedDatasource({
    base,
    layoutFor: async () => nestedLayout(Uint32Array.from(order), order.length, open),
    nestingOf: (nodeId) => {
      const count = open.get(nodeId);
      return count === undefined ? undefined : { count, open: true };
    },
    nestedRow: (nodeId, child, last) =>
      compartmentRow(
        nodeId,
        { traceIndex: nodeId * 10 + child, section: null, label: `c${child}` },
        last,
        { 'report:mean': Float64Array.from({ length: 100 }, (_, i) => i / 2) },
        compartmentTable(new Map())
      ),
  });

  function page(startRow: number, endRow: number) {
    return new Promise<{ rows: Record<string, unknown>[]; lastRow?: number }>((resolve, reject) =>
      source.getRows({
        startRow,
        endRow,
        sortModel: [],
        filterModel: {},
        context: undefined,
        successCallback: (rows: Record<string, unknown>[], lastRow?: number) =>
          resolve({ rows, lastRow }),
        failCallback: reject,
      } as unknown as IGetRowsParams)
    );
  }

  it('serves the listed rows marked, with their compartments’ rows under the open ones', async () => {
    const { rows, lastRow } = await page(0, 100);
    expect(lastRow).toBe(9);
    expect(rows.map((row) => row.node_id)).toEqual([4, 0, 0, 0, 0, 2, 7, 7, 7]);
    expect(rows[1][NESTING_ROW]).toEqual({ count: 3, open: true });
    expect(rows[0][NESTING_ROW]).toBeUndefined();
    expect(rows[2][NESTED_ROW]).toMatchObject({ key: 0, cells: ['c0'], last: false });
    expect(rows[4][NESTED_ROW]).toMatchObject({ key: 2, cells: ['c2'], last: true });
    expect(rows[8][NESTED_ROW]).toMatchObject({ key: 71, cells: ['c1'], last: true });
    expect(rows[8]['report:mean']).toBe(35.5);
  });

  it('reads only the listed rows a page holds, however it starts', async () => {
    vi.mocked(base.getRows).mockClear();
    const { rows } = await page(3, 7);
    expect(
      rows.map((row) =>
        row[NESTED_ROW] ? `${row.node_id}/${(row[NESTED_ROW] as { key: number }).key}` : row.node_id
      )
    ).toEqual(['0/1', '0/2', 2, 7]);
    expect(vi.mocked(base.getRows).mock.calls[0][0]).toMatchObject({ startRow: 2, endRow: 4 });
  });
});
