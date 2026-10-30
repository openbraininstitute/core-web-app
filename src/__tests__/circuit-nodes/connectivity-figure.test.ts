import { describe, expect, it } from 'vitest';

import {
  cellValue,
  connectivityFigure,
} from '@/features/circuit-nodes/connectivity/connectivity-figure';

import type { ConnectivityGroups } from '@/features/circuit-nodes/connectivity/connectivity-groups';

/** Two groups, of 2 and 3 neurons: 2 connections (5 synapses) within A, 3 (9) from A to B. */
const GROUPS: ConnectivityGroups = {
  by: 'property',
  labels: ['A', 'B'],
  sizes: Float64Array.from([2, 3]),
  connections: Float64Array.from([2, 3, 0, 0]),
  synapses: Float64Array.from([5, 9, 0, 0]),
  runs: null,
  nodeIds: null,
};

describe('cellValue', () => {
  it('gives each measure of a cell', () => {
    expect(cellValue(GROUPS, 'probability', 0, 0)).toBe(100);
    expect(cellValue(GROUPS, 'probability', 0, 1)).toBe(50);
    expect(cellValue(GROUPS, 'connections', 0, 1)).toBe(3);
    expect(cellValue(GROUPS, 'synapses', 0, 1)).toBe(9);
    expect(cellValue(GROUPS, 'synapsesPerConnection', 0, 1)).toBe(3);
  });

  it('has nothing to give where there are no pairs or no connections', () => {
    const single = { ...GROUPS, sizes: Float64Array.from([1, 3]) };

    expect(cellValue(single, 'probability', 0, 0)).toBeNaN();
    expect(cellValue(GROUPS, 'synapsesPerConnection', 1, 0)).toBeNaN();
  });
});

describe('connectivityFigure', () => {
  it('draws presynaptic rows down and postsynaptic ones across, blank where none connect', () => {
    const figure = connectivityFigure({ groups: GROUPS, measure: 'connections', axis: 'mtype' });
    const [heatmap] = figure.data as { z: (number | null)[][] }[];

    expect(heatmap.z).toEqual([
      [2, 3],
      [null, null],
    ]);
    expect(figure.layout.yaxis?.title).toMatchObject({ text: 'Presynaptic mtype' });
    expect(figure.layout.xaxis?.ticktext).toEqual(['A', 'B']);
  });

  it('cards a cell with every measure, the one on show in bold', () => {
    const figure = connectivityFigure({ groups: GROUPS, measure: 'probability', axis: 'mtype' });
    const card = figure.tooltip?.({ pointNumber: [0, 1] });

    expect(card?.title).toBe('A → B');
    expect(card?.subtitle).toBe('2 → 3 neurons');
    expect(card?.rows).toEqual([
      { label: 'Connection probability', value: '50%', strong: true },
      { label: 'Connections', value: '3', strong: false },
      { label: 'Possible pairs', value: '6' },
      { label: 'Synapses', value: '9', strong: false },
      { label: 'Synapses per connection', value: '3', strong: false },
    ]);
  });

  it('names the runs of an order down the axes, with a rule between each', () => {
    const groups: ConnectivityGroups = {
      ...GROUPS,
      by: 'neuron',
      labels: ['Neuron 1', 'Neuron 2', 'Neuron 3'],
      sizes: Float64Array.from([1, 1, 1]),
      connections: new Float64Array(9),
      synapses: null,
      runs: [
        { label: 'EXC', start: 0, end: 1 },
        { label: 'INH', start: 2, end: 2 },
      ],
      nodeIds: Float64Array.from([1, 2, 3]),
    };
    const figure = connectivityFigure({ groups, measure: 'connections', axis: 'neurons' });

    expect(figure.layout.xaxis?.tickvals).toEqual([0.5, 2]);
    expect(figure.layout.xaxis?.ticktext).toEqual(['EXC', 'INH']);
    expect(figure.layout.shapes).toHaveLength(2);
    expect(figure.tooltip?.({ pointNumber: [2, 0] })?.title).toBe(
      'Neuron 3 · INH → Neuron 1 · EXC'
    );
  });
});
