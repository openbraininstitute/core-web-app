import { File as H5File, ready } from 'h5wasm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { NodesSession } from '@/features/circuit-nodes/worker/nodes-h5';

const POPULATION = 'microcircuit';
const FILE = 'neuron-set.h5';
const ROWS = 12;

const MTYPES = ['L5_TPC', 'L5_MC', 'L6_BPC'];
const LAYERS = ['5', '6'];
const mtypeOf = (row: number) => row % 3;
const each = (value: (row: number) => number) =>
  Array.from({ length: ROWS }, (_, row) => value(row));

function writeNodesFile() {
  const file = new H5File(FILE, 'w');
  const base = `/nodes/${POPULATION}/0`;
  file.create_group('nodes');
  file.create_group(`nodes/${POPULATION}`);
  file.create_group(base);
  file.create_group(`${base}/@library`);
  file.create_dataset({ name: `${base}/@library/mtype`, data: MTYPES });
  file.create_dataset({ name: `${base}/mtype`, data: Uint8Array.from(each(mtypeOf)) });
  file.create_dataset({ name: `${base}/@library/layer`, data: LAYERS });
  file.create_dataset({
    name: `${base}/layer`,
    data: Uint8Array.from(each((row) => (mtypeOf(row) === 2 ? 1 : 0))),
  });
  file.create_dataset({ name: `${base}/x`, data: Float32Array.from(each((row) => row)) });
  file.close();
  return FILE;
}

let session: NodesSession | null = null;

beforeAll(async () => {
  await ready;
});

afterEach(async () => {
  if (!session) return;
  session.close();
  session = null;
  const { FS } = await ready;
  FS.unlink(FILE);
});

function open() {
  session ??= new NodesSession(writeNodesFile(), POPULATION);
  return session;
}

const rowsWhere = (test: (row: number) => boolean) =>
  Uint32Array.from(each((row) => row).filter(test));

describe('NodesSession.neuronSetFilter', () => {
  it('says the cells by the file columns that pick out exactly them', () => {
    const cells = rowsWhere((row) => mtypeOf(row) === 0);
    expect(open().neuronSetFilter(cells, { mtype: MTYPES, layer: LAYERS })).toEqual({
      mtype: ['L5_TPC'],
    });
  });

  it('is null where their values pick out more cells than them', () => {
    const cells = Uint32Array.of(0);
    expect(open().neuronSetFilter(cells, { mtype: MTYPES, layer: LAYERS })).toBeNull();
  });

  it('leaves out a derived column, even one on offer', () => {
    const opened = open();
    opened.setDerivedColumns('test', [
      { name: 'group', library: ['a', 'b'], indices: Uint32Array.from(each((row) => row % 2)) },
    ]);
    const cells = rowsWhere((row) => row % 2 === 0);
    expect(opened.neuronSetFilter(cells, { group: ['a', 'b'] })).toBeNull();
  });
});
