import { File as H5File, ready } from 'h5wasm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { NodesSession } from '@/features/circuit-nodes/worker/nodes-h5';

const POPULATION = 'drosophila';

// FlyWire ids. The first two are 11 apart, so they round to the same JS number.
const IDS = ['720575940620980315', '720575940620980304', '720575940618238523'];

function writeNodesFile(name: string) {
  const file = new H5File(name, 'w');
  const base = `/nodes/${POPULATION}/0`;
  file.create_group('nodes');
  file.create_group(`nodes/${POPULATION}`);
  file.create_group(base);
  file.create_dataset({ name: `${base}/flywire_id`, data: BigInt64Array.from(IDS, BigInt) });
  file.create_dataset({ name: `${base}/count`, data: BigInt64Array.from([3, 1, 2], BigInt) });
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

function rows(req: Partial<Parameters<NodesSession['getRows']>[0]> = {}) {
  session ??= new NodesSession(writeNodesFile('ids.h5'), POPULATION);
  return session.getRows({ start: 0, end: 10, columns: ['flywire_id', 'count'], ...req }).rows;
}

describe('NodesSession with 64-bit integer columns', () => {
  it('shows ids past 2^53 exactly', () => {
    expect(rows().map((r) => r.flywire_id)).toEqual(IDS);
  });

  it('sorts them exactly', () => {
    const sorted = rows({ sort: [{ column: 'flywire_id', direction: 'asc' }] });
    expect(sorted.map((r) => r.flywire_id)).toEqual([IDS[2], IDS[1], IDS[0]]);
  });

  it('filters them exactly', () => {
    const equal = rows({
      filter: { flywire_id: { filterType: 'number', type: 'equals', filter: IDS[1] } },
    });
    expect(equal.map((r) => r.flywire_id)).toEqual([IDS[1]]);

    const range = rows({
      filter: {
        flywire_id: { filterType: 'number', type: 'inRange', filter: IDS[2], filterTo: IDS[1] },
      },
    });
    expect(range.map((r) => r.flywire_id)).toEqual([IDS[1], IDS[2]]);
  });

  it('keeps small 64-bit integers as numbers', () => {
    expect(rows().map((r) => r.count)).toEqual([3, 1, 2]);
    const filtered = rows({
      filter: { count: { filterType: 'number', type: 'greaterThan', filter: '1' } },
    });
    expect(filtered.map((r) => r.count)).toEqual([3, 2]);
  });

  it('colours by them as plain numbers', () => {
    rows();
    const column = session?.getColumnValues('flywire_id');
    expect(column?.kind).toBe('numeric');
    expect(column?.kind === 'numeric' && column.values).toBeInstanceOf(Float64Array);
  });
});
