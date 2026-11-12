import { File as H5File, ready } from 'h5wasm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { NodesSession } from '@/features/circuit-nodes/worker/nodes-h5';

const POPULATION = 'microcircuit';
const FILE = 'narrow.h5';

const LAYERS = ['2/3', '4', '5'];
const SYNAPSE_CLASSES = ['EXC', 'INH'];

/**
 * Node files written with the smallest integer that holds the values, as PD14's is: `@library`
 * indices in one byte, which h5wasm reads as a Uint8Array or Int8Array.
 */
function writeNodesFile() {
  const file = new H5File(FILE, 'w');
  const base = `/nodes/${POPULATION}/0`;
  file.create_group('nodes');
  file.create_group(`nodes/${POPULATION}`);
  file.create_group(base);
  file.create_group(`${base}/@library`);
  file.create_dataset({ name: `${base}/@library/layer`, data: LAYERS });
  file.create_dataset({ name: `${base}/@library/synapse_class`, data: SYNAPSE_CLASSES });
  file.create_dataset({ name: `${base}/layer`, data: Uint8Array.from([2, 0, 1, 2]) });
  file.create_dataset({ name: `${base}/synapse_class`, data: Int8Array.from([1, 0, 0, 1]) });
  file.create_dataset({ name: `${base}/count`, data: Uint8Array.from([200, 3, 7, 1]) });
  file.create_dataset({ name: `${base}/offset`, data: Int8Array.from([-5, 3, 0, 9]) });
  file.close();
  return FILE;
}

let session: NodesSession | null = null;

beforeAll(async () => {
  await ready;
});

afterEach(async () => {
  session?.close();
  session = null;
  const { FS } = await ready;
  FS.unlink(FILE);
});

function open() {
  session ??= new NodesSession(writeNodesFile(), POPULATION);
  return session;
}

const COLUMNS = ['node_id', 'layer', 'synapse_class', 'count', 'offset'];

function rows(req: Partial<Parameters<NodesSession['getRows']>[0]> = {}) {
  return open().getRows({ start: 0, end: 10, columns: COLUMNS, ...req }).rows;
}

describe('NodesSession with one-byte integer columns', () => {
  it('shows library values on a page read straight from the file', () => {
    const page = rows();
    expect(page.map((r) => r.layer)).toEqual(['5', '2/3', '4', '5']);
    expect(page.map((r) => r.synapse_class)).toEqual(['INH', 'EXC', 'EXC', 'INH']);
  });

  it('shows library values on a page gathered through a sort', () => {
    const page = rows({ sort: [{ column: 'node_id', direction: 'desc' }] });
    expect(page.map((r) => r.layer)).toEqual(['5', '4', '2/3', '5']);
  });

  it('shows numbers either way', () => {
    expect(rows().map((r) => r.count)).toEqual([200, 3, 7, 1]);
    expect(rows().map((r) => r.offset)).toEqual([-5, 3, 0, 9]);
    const sorted = rows({ sort: [{ column: 'offset', direction: 'asc' }] });
    expect(sorted.map((r) => r.offset)).toEqual([-5, 0, 3, 9]);
    expect(sorted.map((r) => r.node_id)).toEqual([0, 2, 1, 3]);
  });

  it('filters a library column by its values', () => {
    const page = rows({ filter: { layer: { filterType: 'set', values: ['5'] } } });
    expect(page.map((r) => r.node_id)).toEqual([0, 3]);
    expect(page.map((r) => r.layer)).toEqual(['5', '5']);
  });

  it('filters a library column by its text', () => {
    const page = rows({
      filter: { synapse_class: { filterType: 'text', type: 'equals', filter: 'exc' } },
    });
    expect(page.map((r) => r.node_id)).toEqual([1, 2]);
  });

  it('filters a number column', () => {
    const page = rows({
      filter: { count: { filterType: 'number', type: 'greaterThan', filter: '5' } },
    });
    expect(page.map((r) => r.node_id)).toEqual([0, 2]);
  });

  it('sorts a library column by its names', () => {
    const page = rows({ sort: [{ column: 'layer', direction: 'asc' }] });
    expect(page.map((r) => r.layer)).toEqual(['2/3', '4', '5', '5']);
  });

  it('hands over whole columns for colouring', () => {
    expect(open().getColumnValues('layer')).toEqual({
      kind: 'categorical',
      library: LAYERS,
      indices: Uint32Array.from([2, 0, 1, 2]),
    });
    expect(open().getColumnValues('offset')).toEqual({
      kind: 'numeric',
      values: Float64Array.from([-5, 3, 0, 9]),
    });
  });
});
