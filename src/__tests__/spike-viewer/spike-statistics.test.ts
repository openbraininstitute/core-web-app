import { describe, expect, it } from 'vitest';

import {
  compareGroupNames,
  computeSpikeStatistics,
  groupValues,
} from '@/features/spike-viewer/spike-statistics/statistics';

import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

function population(spikes: [number, number][]): SpikePopulation {
  return {
    name: 'cells',
    timestamps: new Float32Array(spikes.map(([t]) => t)),
    nodeIds: new Float64Array(spikes.map(([, id]) => id)),
    nodeIdRange: { min: 0, max: 0 },
  };
}

describe('computeSpikeStatistics', () => {
  // Time-sorted, as the parser leaves them. Cell 0 fires regularly, cell 1
  // twice, cell 2 never, cell 3 once, cell 4 at intervals of 10 and 30 ms.
  const spikes = population([
    [0, 4],
    [10, 0],
    [10, 4],
    [20, 1],
    [30, 0],
    [40, 4],
    [50, 0],
    [60, 1],
    [70, 9], // past the node file
    [80, 1.5], // not a node id
    [100, 3],
  ]);
  const stats = computeSpikeStatistics(spikes, 5, { min: 0, max: 1000 });

  it('counts each cell’s spikes and ignores ids with no row', () => {
    expect(Array.from(stats.count)).toEqual([3, 2, 0, 1, 3]);
  });

  it('gives rates over the run’s window, not the spikes’ own', () => {
    expect(Array.from(stats.rate)).toEqual([3, 2, 0, 1, 3]);
    const short = computeSpikeStatistics(spikes, 5, { min: 0, max: 500 });
    expect(short.rate[0]).toBe(6);
  });

  it('leaves the first spike blank for a cell that never fired', () => {
    expect(Array.from(stats.firstSpike)).toEqual([10, 20, Number.NaN, 100, 0]);
  });

  it('needs two spikes for a mean interval and three for a CV', () => {
    expect(Array.from(stats.meanIsi)).toEqual([20, 40, Number.NaN, Number.NaN, 20]);
    expect(stats.isiCv[0]).toBe(0);
    expect(stats.isiCv[1]).toBeNaN();
    // Intervals 10 and 30: mean 20, standard deviation 10.
    expect(stats.isiCv[4]).toBeCloseTo(0.5, 12);
  });

  it('treats a population with no spike file entry as silent', () => {
    const silent = computeSpikeStatistics(undefined, 2, { min: 0, max: 1000 });
    expect(Array.from(silent.count)).toEqual([0, 0]);
    expect(Array.from(silent.rate)).toEqual([0, 0]);
  });
});

describe('groupValues', () => {
  const values = new Float64Array([1, 2, Number.NaN, 4, 5]);
  const column = {
    kind: 'categorical' as const,
    library: ['L4', 'L23', 'unused'],
    indices: new Uint32Array([0, 1, 1, 0, 1]),
  };

  it('splits by library value, dropping blanks and empty groups', () => {
    const groups = groupValues(values, column, null);
    // L23 is layers 2 and 3, so it comes before L4.
    expect(groups.map((g) => g.name)).toEqual(['L23', 'L4']);
    expect(Array.from(groups[0].values)).toEqual([2, 5]);
    expect(Array.from(groups[1].values)).toEqual([1, 4]);
  });

  it('keeps only the rows a filter keeps', () => {
    const groups = groupValues(values, column, new Uint32Array([0, 1]));
    expect(groups.map((g) => [g.name, Array.from(g.values)])).toEqual([
      ['L23', [2]],
      ['L4', [1]],
    ]);
  });

  it('orders numbers by value, ahead of names', () => {
    const names = ['L6', '10', 'L1', '9', 'L23', '1'];
    expect(names.sort(compareGroupNames)).toEqual(['1', '9', '10', 'L1', 'L23', 'L6']);
  });

  it('orders a name that starts with a number by it, as layer 2/3 among the layers', () => {
    expect(['6', '4', '2/3', '1'].sort(compareGroupNames)).toEqual(['1', '2/3', '4', '6']);
  });

  it('groups a string column by its distinct values', () => {
    const strings = { kind: 'string' as const, values: ['b', 'a', 'a', 'b', 'a'] };
    const groups = groupValues(values, strings, null);
    expect(groups.map((g) => [g.name, Array.from(g.values)])).toEqual([
      ['a', [2, 5]],
      ['b', [1, 4]],
    ]);
  });

  it('is one group without a column', () => {
    const groups = groupValues(values, null, null);
    expect(groups).toHaveLength(1);
    expect(Array.from(groups[0].values)).toEqual([1, 2, 4, 5]);
  });
});
