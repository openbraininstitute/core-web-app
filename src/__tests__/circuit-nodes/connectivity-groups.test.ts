import { describe, expect, it } from 'vitest';

import {
  defaultGrouping,
  groupConnectivity,
  possiblePairs,
  rowMembers,
  selectionApplies,
  summarizeConnectivity,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import { connectivityEntries } from '@/features/circuit-nodes/connectivity/use-connectivity';

import type { ConnectivityMatrix } from '@/features/circuit-nodes/connectivity/connectivity-h5';

/**
 * Five neurons. By mtype, in order: L23_PC (nodes 20 and 40), L2_TPC (30),
 * L4_TPC (10) and one with none (50).
 */
const MATRIX: ConnectivityMatrix = {
  size: 5,
  nodeIds: Float64Array.from([10, 20, 30, 40, 50]),
  properties: [
    {
      name: 'mtype',
      kind: 'categorical',
      library: ['L4_TPC', 'L23_PC', 'L2_TPC', 'L5_TPC'],
      codes: Int32Array.from([0, 1, 2, 1, -1]),
    },
    {
      name: 'synapse_class',
      kind: 'categorical',
      library: ['EXC', 'INH'],
      codes: Int32Array.from([0, 0, 1, 0, 1]),
    },
    { name: 'x', kind: 'numeric', values: Float64Array.from([1, 2, 3, 4, 5]) },
  ],
  pre: Uint32Array.from([0, 1, 3, 2, 2, 4]),
  post: Uint32Array.from([1, 3, 1, 0, 1, 0]),
  synapses: Float32Array.from([2, 4, 6, 1, 3, 5]),
};

/** The cell from row `pre` to row `post`. */
const at = (n: number, pre: number, post: number) => pre * n + post;

describe('groupConnectivity by a property', () => {
  const groups = groupConnectivity(MATRIX, { by: 'property', property: 'mtype' });

  it('makes a row of each value in use, layer 2/3 before layer 2, and one of none', () => {
    expect(groups.labels).toEqual(['L23_PC', 'L2_TPC', 'L4_TPC', 'None']);
    expect([...groups.sizes]).toEqual([2, 1, 1, 1]);
  });

  it('sums the connections and synapses from each row to each other', () => {
    const n = groups.labels.length;
    // L23_PC to itself: 20 → 40 and 40 → 20.
    expect(groups.connections[at(n, 0, 0)]).toBe(2);
    expect(groups.synapses?.[at(n, 0, 0)]).toBe(10);
    // L2_TPC (30) to L4_TPC (10) and to L23_PC (20).
    expect(groups.connections[at(n, 1, 2)]).toBe(1);
    expect(groups.synapses?.[at(n, 1, 0)]).toBe(3);
    // None (50) to L4_TPC (10).
    expect(groups.synapses?.[at(n, 3, 2)]).toBe(5);
    expect(groups.connections.reduce((a, b) => a + b, 0)).toBe(6);
  });

  it('lists the node ids of each row', () => {
    expect([0, 1, 2, 3].map((row) => [...rowMembers(groups, row)])).toEqual([
      [20, 40],
      [30],
      [10],
      [50],
    ]);
  });

  it('counts the pairs of distinct neurons from row to row', () => {
    expect(possiblePairs(groups, 0, 0)).toBe(2);
    expect(possiblePairs(groups, 0, 1)).toBe(2);
    expect(possiblePairs(groups, 1, 1)).toBe(0);
  });
});

describe('groupConnectivity neuron by neuron', () => {
  it('puts each neuron in a row of its own, by node id', () => {
    const groups = groupConnectivity(MATRIX, { by: 'neuron', orderBy: null, maxRows: 10 });

    expect([...(groups.nodeIds ?? [])]).toEqual([10, 20, 30, 40, 50]);
    expect(groups.labels[0]).toBe('Neuron 10');
    expect(groups.runs).toBeNull();
    expect(groups.synapses?.[at(5, 1, 3)]).toBe(4);
  });

  it('orders the neurons by a property, and says which rows each value takes', () => {
    const groups = groupConnectivity(MATRIX, { by: 'neuron', orderBy: 'mtype', maxRows: 10 });

    expect([...(groups.nodeIds ?? [])]).toEqual([20, 40, 30, 10, 50]);
    expect(groups.runs).toEqual([
      { label: 'L23_PC', start: 0, end: 1 },
      { label: 'L2_TPC', start: 2, end: 2 },
      { label: 'L4_TPC', start: 3, end: 3 },
      { label: 'None', start: 4, end: 4 },
    ]);
    // 30 → 10 is now row 2 to row 3.
    expect(groups.connections[at(5, 2, 3)]).toBe(1);
  });

  it('shares rows between neurons next in the order past the most rows', () => {
    const groups = groupConnectivity(MATRIX, { by: 'neuron', orderBy: 'mtype', maxRows: 2 });

    expect(groups.labels).toEqual(['3 neurons', '2 neurons']);
    expect(groups.nodeIds).toBeNull();
    expect(groups.runs?.map((r) => [r.label, r.start, r.end])).toEqual([
      ['L23_PC', 0, 0],
      ['L2_TPC', 0, 0],
      ['L4_TPC', 1, 1],
      ['None', 1, 1],
    ]);
    expect(groups.connections.reduce((a, b) => a + b, 0)).toBe(6);
  });
});

describe('groupConnectivity over a selection', () => {
  // Nodes 20, 30 and 40: L23_PC, L2_TPC and L23_PC again.
  const cells = Uint32Array.from([20, 30, 40]);

  it('keeps to the selected neurons and the values they take', () => {
    const groups = groupConnectivity(MATRIX, { by: 'property', property: 'mtype' }, cells);

    expect(groups.labels).toEqual(['L23_PC', 'L2_TPC']);
    expect([...groups.sizes]).toEqual([2, 1]);
  });

  it('counts only the connections between selected neurons', () => {
    const groups = groupConnectivity(MATRIX, { by: 'property', property: 'mtype' }, cells);

    // 20 → 40, 40 → 20 and 30 → 20; 10 → 20 and 50 → 10 leave out a neuron.
    expect([...groups.connections]).toEqual([2, 0, 1, 0]);
    expect([...(groups.synapses ?? [])]).toEqual([10, 0, 3, 0]);
  });

  it('draws only the selected neurons one by one', () => {
    const groups = groupConnectivity(MATRIX, { by: 'neuron', orderBy: null, maxRows: 10 }, cells);

    expect([...(groups.nodeIds ?? [])]).toEqual([20, 30, 40]);
    expect(groups.connections.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('has nothing to draw of a selection of none', () => {
    const groups = groupConnectivity(
      MATRIX,
      { by: 'property', property: 'mtype' },
      new Uint32Array(0)
    );

    expect(groups.labels).toEqual([]);
  });
});

describe('groupConnectivity by a property from outside the matrix', () => {
  // By node id: 10 and 30 in the first range, 20 and 40 in the second, 50 in none.
  const depth = {
    name: 'depth',
    library: ['0–100', '100–200'],
    codes: Int32Array.from({ length: 51 }, (_, id) =>
      [10, 30].includes(id) ? 0 : [20, 40].includes(id) ? 1 : -1
    ),
    ordered: true,
  };

  it('groups the neurons by their node ids’ values, in the property’s own order', () => {
    const groups = groupConnectivity(MATRIX, { by: 'property', property: 'depth' }, null, [depth]);

    expect(groups.labels).toEqual(['0–100', '100–200', 'None']);
    expect([...groups.sizes]).toEqual([2, 2, 1]);
    // 20 → 40 and 40 → 20 are within the second range.
    expect(groups.connections[at(3, 1, 1)]).toBe(2);
  });

  it('orders the neurons by it, one by one', () => {
    const groups = groupConnectivity(
      MATRIX,
      { by: 'neuron', orderBy: 'depth', maxRows: 10 },
      null,
      [depth]
    );

    expect([...(groups.nodeIds ?? [])]).toEqual([10, 30, 20, 40, 50]);
  });
});

describe('selectionApplies', () => {
  it('holds for the population at both ends of the edge population', () => {
    const at = (nodePopulation: string, edgePopulation = 'S1__S1__chemical') =>
      selectionApplies({ edgePopulation, nodePopulation, rowCount: 5, neurons: 5 });

    expect(at('S1')).toBe(true);
    expect(at('POm')).toBe(false);
    expect(at('S1', 'POm__S1__chemical')).toBe(false);
  });

  it('falls back to the number of neurons where the name says nothing of its ends', () => {
    const at = (rowCount: number) =>
      selectionApplies({ edgePopulation: 'default', nodePopulation: 'All', rowCount, neurons: 5 });

    expect(at(5)).toBe(true);
    expect(at(6)).toBe(false);
  });
});

describe('summarizeConnectivity', () => {
  it('counts the matrix and lists the values of each property in use', () => {
    const summary = summarizeConnectivity(MATRIX);

    expect(summary).toMatchObject({ neurons: 5, connections: 6, synapses: 21 });
    expect(summary.properties).toEqual([
      { name: 'mtype', kind: 'categorical', values: ['L23_PC', 'L2_TPC', 'L4_TPC', 'None'] },
      { name: 'synapse_class', kind: 'categorical', values: ['EXC', 'INH'] },
      { name: 'x', kind: 'numeric' },
    ]);
  });

  it('first groups by the finest of the usual properties', () => {
    const { properties } = summarizeConnectivity(MATRIX);

    expect(defaultGrouping(properties)).toBe('mtype');
    expect(defaultGrouping(properties.slice(1))).toBe('synapse_class');
    expect(defaultGrouping(properties.slice(2))).toBeNull();
  });
});

describe('connectivityEntries', () => {
  it('takes the digraph of each edge population, with its size', () => {
    const entries = connectivityEntries(
      {
        cortex: {
          multi: { description: 'Multigraph', path: 'cortex/multi/connectivity_matrix.h5' },
          single: { description: 'Digraph', path: 'cortex/single/connectivity_matrix.h5' },
        },
        thalamus: { single: { description: 'Digraph', path: '' } },
      },
      {
        'cortex/single/connectivity_matrix.h5': {
          name: 'connectivity_matrix.h5',
          size: 2048,
          last_modified: '',
        },
      }
    );

    expect(entries).toEqual([
      {
        population: 'cortex',
        path: 'cortex/single/connectivity_matrix.h5',
        description: 'Digraph',
        size: 2048,
      },
    ]);
  });
});
