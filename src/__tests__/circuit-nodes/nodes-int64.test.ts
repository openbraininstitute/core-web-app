import { File as H5File, ready } from 'h5wasm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { NodesSession } from '@/features/circuit-nodes/worker/nodes-h5';

import type { ColumnFilter, GetRowsRequest } from '@/features/circuit-nodes/types';

const POPULATION = 'drosophila';

// FlyWire ids. The first two are 11 apart, so they round to the same JS number.
const IDS = ['720575940620980315', '720575940620980304', '720575940618238523'];

// 2^64 - 1 and 2^64 - 12 do too.
const UNSIGNED = ['18446744073709551615', '18446744073709551604', '9223372036854775808'];

const COLUMNS = {
  flywire_id: BigInt64Array.from(IDS, BigInt),
  count: BigInt64Array.from(['3', '1', '2'], BigInt),
  mixed: BigInt64Array.from(['5', IDS[1], '-7'], BigInt),
  negative: BigInt64Array.from(IDS, (id) => -BigInt(id)),
  unsigned: BigUint64Array.from(UNSIGNED, BigInt),
};

type Column = keyof typeof COLUMNS;

function writeNodesFile(name: string) {
  const file = new H5File(name, 'w');
  const base = `/nodes/${POPULATION}/0`;
  file.create_group('nodes');
  file.create_group(`nodes/${POPULATION}`);
  file.create_group(base);
  for (const [column, data] of Object.entries(COLUMNS)) {
    file.create_dataset({ name: `${base}/${column}`, data });
  }
  file.close();
  return name;
}

let session: NodesSession | null = null;

beforeAll(async () => {
  await ready;
});

afterEach(async () => {
  session?.close();
  session = null;
  const { FS } = await ready;
  FS.unlink('ids.h5');
});

function rows(req: Partial<GetRowsRequest> = {}) {
  session ??= new NodesSession(writeNodesFile('ids.h5'), POPULATION);
  return session.getRows({ start: 0, end: 10, columns: Object.keys(COLUMNS), ...req }).rows;
}

/** The column's cells, in the order the request returns them. */
function cells(column: Column, req: Partial<GetRowsRequest> = {}) {
  return rows(req).map((r) => r[column]);
}

function filtered(column: Column, filter: ColumnFilter) {
  return cells(column, { filter: { [column]: filter } });
}

describe('NodesSession with 64-bit integer columns', () => {
  it('shows ids past 2^53 exactly', () => {
    expect(cells('flywire_id')).toEqual(IDS);
    expect(cells('negative')).toEqual(IDS.map((id) => `-${id}`));
    expect(cells('unsigned')).toEqual(UNSIGNED);
  });

  it('shows every value of the column as text, small or not', () => {
    expect(cells('count')).toEqual(['3', '1', '2']);
    expect(cells('mixed')).toEqual(['5', IDS[1], '-7']);
  });

  it('shows the same cells once the columns are loaded', () => {
    const read = rows();
    for (const column of Object.keys(COLUMNS)) session?.getColumnValues(column);
    expect(rows()).toEqual(read);
  });

  it('sorts them exactly', () => {
    const asc = (column: Column) => cells(column, { sort: [{ column, direction: 'asc' }] });
    expect(asc('flywire_id')).toEqual([IDS[2], IDS[1], IDS[0]]);
    expect(asc('negative')).toEqual([`-${IDS[0]}`, `-${IDS[1]}`, `-${IDS[2]}`]);
    expect(asc('unsigned')).toEqual([UNSIGNED[2], UNSIGNED[1], UNSIGNED[0]]);
  });

  it('filters them exactly', () => {
    expect(
      filtered('flywire_id', { filterType: 'number', type: 'equals', filter: IDS[1] })
    ).toEqual([IDS[1]]);
    expect(
      filtered('flywire_id', {
        filterType: 'number',
        type: 'inRange',
        filter: IDS[2],
        filterTo: IDS[1],
      })
    ).toEqual([IDS[1], IDS[2]]);
    expect(
      filtered('negative', { filterType: 'number', type: 'lessThan', filter: `-${IDS[1]}` })
    ).toEqual([`-${IDS[0]}`]);
    expect(
      filtered('unsigned', { filterType: 'number', type: 'equals', filter: UNSIGNED[1] })
    ).toEqual([UNSIGNED[1]]);
  });

  it('keeps a row equal to any of several values', () => {
    expect(
      filtered('flywire_id', {
        filterType: 'number',
        type: 'equals',
        filter: `${IDS[0]}, ${IDS[2]}`,
      })
    ).toEqual([IDS[0], IDS[2]]);
  });

  it('filters them exactly by decimal bounds', () => {
    const flywire = (type: 'equals' | 'greaterThan', filter: string) =>
      filtered('flywire_id', { filterType: 'number', type, filter });
    expect(flywire('equals', '720575940620980304.0')).toEqual([IDS[1]]);
    expect(flywire('equals', '720575940620980304.5')).toEqual([]);
    expect(flywire('greaterThan', '720575940620980304.5')).toEqual([IDS[0]]);
    expect(
      filtered('flywire_id', {
        filterType: 'number',
        type: 'inRange',
        filter: '7.20575940620980304e17',
        filterTo: '720575940620980310.9',
      })
    ).toEqual([IDS[1]]);
    expect(
      filtered('negative', {
        filterType: 'number',
        type: 'lessThanOrEqual',
        filter: `-${IDS[1]}.5`,
      })
    ).toEqual([`-${IDS[0]}`]);
  });

  it('filters them exactly by combined conditions', () => {
    expect(
      filtered('flywire_id', {
        filterType: 'number',
        operator: 'OR',
        conditions: [
          { filterType: 'number', type: 'equals', filter: IDS[0] },
          { filterType: 'number', type: 'equals', filter: IDS[2] },
        ],
      })
    ).toEqual([IDS[0], IDS[2]]);
  });

  it('filters them exactly as text', () => {
    expect(
      filtered('flywire_id', { filterType: 'text', type: 'contains', filter: '980304' })
    ).toEqual([IDS[1]]);
  });

  it('filters small 64-bit integers as numbers', () => {
    expect(filtered('count', { filterType: 'number', type: 'greaterThan', filter: '1' })).toEqual([
      '3',
      '2',
    ]);
  });

  it('colours by them as plain numbers', () => {
    rows();
    for (const column of ['flywire_id', 'count']) {
      const values = session?.getColumnValues(column);
      expect(values?.kind).toBe('numeric');
      expect(values?.kind === 'numeric' && values.values).toBeInstanceOf(Float64Array);
    }
  });
});
