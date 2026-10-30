import { readFileSync } from 'node:fs';
import path from 'node:path';

import { File as H5File, ready } from 'h5wasm';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  pickledNames,
  readConnectivityMatrix,
} from '@/features/circuit-nodes/connectivity/connectivity-h5';

/**
 * Four neurons as ConnectomeUtilities writes them, through pandas, with only
 * PyTables' index tables taken out: an mtype (the last neuron has none) and a
 * position each, and four connections with their synapses.
 */
const FIXTURE = path.join(__dirname, 'fixtures/connectivity-matrix.h5');
const FILE = 'connectivity-matrix.h5';

beforeAll(async () => {
  const { FS } = await ready;
  FS?.writeFile(FILE, readFileSync(FIXTURE));
});

describe('readConnectivityMatrix', () => {
  it('reads the neurons and the connections', () => {
    const matrix = readConnectivityMatrix(FILE);

    expect(matrix.size).toBe(4);
    expect([...matrix.nodeIds]).toEqual([10, 11, 12, 13]);
    expect([...matrix.pre]).toEqual([0, 1, 1, 3]);
    expect([...matrix.post]).toEqual([1, 0, 2, 2]);
    expect([...(matrix.synapses ?? [])]).toEqual([3, 5, 1, 2]);
  });

  it('reads a categorical property as its categories and a code per neuron', () => {
    const [mtype] = readConnectivityMatrix(FILE).properties;

    expect(mtype).toEqual({
      name: 'mtype',
      kind: 'categorical',
      library: ['L2_TPC', 'L4_LBC', 'L23_PC'],
      codes: Int32Array.from([0, 2, 1, -1]),
    });
  });

  it('reads each column of a block of numbers', () => {
    const [, ...positions] = readConnectivityMatrix(FILE).properties;

    expect(positions.map((p) => p.name)).toEqual(['x', 'y', 'z']);
    expect(positions.map((p) => (p.kind === 'numeric' ? [...p.values] : null))).toEqual([
      [1, 4, 7, 10],
      [2, 5, 8, 11],
      [3, 6, 9, 12],
    ]);
  });

  it('says so of a file that holds no matrix', () => {
    const other = new H5File('other.h5', 'w');
    other.create_group('nodes');
    other.close();

    expect(() => readConnectivityMatrix('other.h5')).toThrow(/no ConnectomeUtilities matrix/);
  });
});

describe('pickledNames', () => {
  it('reads the names of a block of columns', () => {
    expect(pickledNames('(lp0\nVx\np1\naVy\np2\naVz\np3\na.')).toEqual(['x', 'y', 'z']);
    expect(pickledNames('(lp0\nVsynapse_class\np1\na.')).toEqual(['synapse_class']);
  });

  it('keeps a name that starts with V or holds an escape', () => {
    expect(pickledNames('(lp0\nVVm\np1\naV\\u00b5m\np2\na.')).toEqual(['Vm', 'µm']);
  });
});
