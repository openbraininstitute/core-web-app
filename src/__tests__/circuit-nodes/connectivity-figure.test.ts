import { describe, expect, it } from 'vitest';

import {
  cellValue,
  connectivityFigure,
} from '@/features/circuit-nodes/connectivity/connectivity-figure';

import type {
  ConnectivityGroups,
  MatrixSide,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';

const A_B: MatrixSide = {
  start: 0,
  end: 2,
  step: 1,
  labels: ['A', 'B'],
  sizes: Float64Array.from([2, 3]),
  members: { offsets: Uint32Array.from([0, 2, 5]), nodeIds: Uint32Array.from([0, 1, 2, 3, 4]) },
};

/** Two groups, of 2 and 3 neurons: 2 connections (5 synapses) within A, 3 (9) from A to B. */
const GROUPS: ConnectivityGroups = {
  by: 'property',
  places: 2,
  pre: A_B,
  post: A_B,
  connections: Float64Array.from([2, 3, 0, 0]),
  synapses: Float64Array.from([5, 9, 0, 0]),
  totals: { connections: 5, synapses: 14 },
  runs: null,
  neuronsBefore: Float64Array.from([0, 2, 5]),
};

/** A stretch of neurons in a row each, whose node ids are their places times ten. */
function neurons(start: number, end: number, step = 1): MatrixSide {
  const count = end - start;
  const lines = Math.ceil(count / step);
  return {
    start,
    end,
    step,
    labels: Array.from({ length: lines }, (_, line) => `line ${line}`),
    sizes: Float64Array.from({ length: lines }, (_, line) => Math.min(step, count - line * step)),
    members: {
      offsets: Uint32Array.from({ length: lines + 1 }, (_, line) => Math.min(line * step, count)),
      nodeIds: Uint32Array.from({ length: count }, (_, i) => (start + i) * 10),
    },
  };
}

function neuronGroups(
  pre: MatrixSide,
  post: MatrixSide,
  places: number,
  runs: ConnectivityGroups['runs'] = null
): ConnectivityGroups {
  return {
    by: 'neuron',
    places,
    pre,
    post,
    connections: new Float64Array(pre.labels.length * post.labels.length),
    synapses: null,
    totals: { connections: 0, synapses: null },
    runs,
    neuronsBefore: null,
  };
}

describe('cellValue', () => {
  it('gives each measure of a cell', () => {
    expect(cellValue(GROUPS, 'probability', 0, 0)).toBe(100);
    expect(cellValue(GROUPS, 'probability', 0, 1)).toBe(50);
    expect(cellValue(GROUPS, 'connections', 0, 1)).toBe(3);
    expect(cellValue(GROUPS, 'synapses', 0, 1)).toBe(9);
    expect(cellValue(GROUPS, 'synapsesPerConnection', 0, 1)).toBe(3);
  });

  it('has nothing to give where there are no pairs or no connections', () => {
    const side = { ...A_B, sizes: Float64Array.from([1, 3]) };
    const single = { ...GROUPS, pre: side, post: side };

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

  it('rings a pinned square and washes out the rest, leaving the plot zoomed as it is', () => {
    const plain = connectivityFigure({ groups: GROUPS, measure: 'connections', axis: 'mtype' });
    const ringed = connectivityFigure({
      groups: GROUPS,
      measure: 'connections',
      axis: 'mtype',
      pinned: { pre: { start: 0, end: 1 }, post: { start: 1, end: 2 } },
    });

    expect(plain.layout.shapes).toEqual([]);
    const box = { type: 'rect', x0: 0.5, x1: 1.5, y0: -0.5, y1: 0.5 };
    expect(ringed.layout.shapes).toEqual([
      expect.objectContaining({
        type: 'path',
        // The square is a hole in it, so it alone keeps its colour.
        path: expect.stringContaining('M 0.5,-0.5 L 1.5,-0.5 L 1.5,0.5 L 0.5,0.5 Z'),
        fillcolor: expect.any(String),
      }),
      expect.objectContaining(box),
      expect.objectContaining(box),
    ]);
    expect(ringed.layout.uirevision).toBe(plain.layout.uirevision);
  });

  it('says on a square’s card what a click does, only where it does anything', () => {
    const square = (pre: number, post: number) => ({
      pre: { start: pre, end: pre + 1 },
      post: { start: post, end: post + 1 },
    });
    const hintOf = (args: { pickable?: boolean; pinned?: ReturnType<typeof square> }) =>
      connectivityFigure({
        groups: GROUPS,
        measure: 'connections',
        axis: 'mtype',
        ...args,
      }).tooltip?.({ pointNumber: [0, 1] })?.hint;

    expect(hintOf({})).toBeUndefined();
    expect(hintOf({ pickable: true })).toMatch(/filter the table and 3D view/);
    expect(hintOf({ pickable: true, pinned: square(0, 1) })).toMatch(/stop filtering/);
    expect(hintOf({ pickable: true, pinned: square(1, 1) })).toMatch(/filter the table/);
  });

  it('names the runs of an order down the axes, with a rule between each', () => {
    const side = {
      ...neurons(0, 3),
      labels: ['Neuron 1', 'Neuron 2', 'Neuron 3'],
    };
    const groups = neuronGroups(side, side, 3, [
      { label: 'EXC', start: 0, end: 1 },
      { label: 'INH', start: 2, end: 2 },
    ]);
    const figure = connectivityFigure({ groups, measure: 'connections', axis: 'neurons' });

    expect(figure.layout.xaxis?.tickvals).toEqual([0.5, 2]);
    expect(figure.layout.xaxis?.ticktext).toEqual(['EXC', 'INH']);
    expect(figure.layout.shapes).toHaveLength(2);
    expect(figure.tooltip?.({ pointNumber: [2, 0] })?.title).toBe(
      'Neuron 3 · INH → Neuron 1 · EXC'
    );
  });

  describe('zoomed in', () => {
    // Rows of neurons 100 to 199, columns of twenty each from neuron 2000, of 4,870.
    const groups = neuronGroups(neurons(100, 200), neurons(2000, 3000, 20), 4870);
    const figure = connectivityFigure({
      groups,
      measure: 'connections',
      axis: 'neurons',
      revision: 'the matrix',
    });
    const [heatmap] = figure.data as { x: number[]; y: number[]; z: unknown[][] }[];

    it('draws each line over the places it takes, one neuron a place', () => {
      expect(heatmap.y.slice(0, 2)).toEqual([100, 101]);
      // Twenty neurons from place 2000 reach from 1999.5 to 2019.5.
      expect(heatmap.x.slice(0, 2)).toEqual([2009.5, 2029.5]);
      expect(heatmap.z).toHaveLength(100);
      expect(heatmap.z[0]).toHaveLength(50);
    });

    it('keeps the axes over the whole side, so the plot keeps its own zoom', () => {
      expect(figure.layout.xaxis?.range).toEqual([-0.5, 4869.5]);
      expect(figure.layout.yaxis?.range).toEqual([4869.5, -0.5]);
    });

    it('keeps the zoom for as long as the matrix is the same', () => {
      const closer = connectivityFigure({
        groups: neuronGroups(neurons(120, 140), neurons(2100, 2200), 4870),
        measure: 'connections',
        axis: 'neurons',
        revision: 'the matrix',
      });

      expect(closer.layout.uirevision).toBe(figure.layout.uirevision);
      expect(closer.layout.xaxis?.range).toEqual(figure.layout.xaxis?.range);
    });

    it('names the neurons in view by their node ids, at round places', () => {
      expect(figure.layout.yaxis?.tickvals).toEqual([
        100, 110, 120, 130, 140, 150, 160, 170, 180, 190,
      ]);
      expect(figure.layout.yaxis?.ticktext?.slice(0, 2)).toEqual(['1000', '1100']);
      expect(figure.layout.xaxis?.tickvals).toEqual([
        2000, 2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900,
      ]);
      expect(figure.layout.xaxis?.ticktext?.slice(0, 1)).toEqual(['20000']);
    });

    it('hairlines squares apart side by side only where lines are few', () => {
      const few = connectivityFigure({
        groups: neuronGroups(neurons(0, 40), neurons(0, 41), 100),
        measure: 'connections',
        axis: 'neurons',
      });
      const [trace] = few.data as { xgap: number; ygap: number }[];

      expect(trace.ygap).toBe(1);
      expect(trace.xgap).toBe(0);
    });

    it('cards a square by its own row and column', () => {
      const side = (start: number, end: number, step: number) => neurons(start, end, step);
      const wide = neuronGroups(side(0, 2, 1), side(0, 6, 3), 100);
      wide.connections[1] = 2;
      const zoomed = connectivityFigure({ groups: wide, measure: 'connections', axis: 'neurons' });

      const card = zoomed.tooltip?.({ pointNumber: [0, 1] });

      expect(card?.rows).toContainEqual({ label: 'Connections', value: '2', strong: true });
      // One neuron onto three others: none is in both.
      expect(card?.rows).toContainEqual({ label: 'Possible pairs', value: '3' });
      // One neuron onto three that hold it.
      expect(zoomed.tooltip?.({ pointNumber: [0, 0] })?.rows).toContainEqual({
        label: 'Possible pairs',
        value: '2',
      });
    });

    it('rings a square where it is, whatever lines are drawn', () => {
      const ringed = connectivityFigure({
        groups: neuronGroups(neurons(100, 200), neurons(100, 200), 4870),
        measure: 'connections',
        axis: 'neurons',
        pinned: { pre: { start: 0, end: 17 }, post: { start: 34, end: 51 } },
      });

      const [veil, ring] = ringed.layout.shapes ?? [];
      // Washed out across the whole matrix, not only the lines drawn.
      expect(veil.path).toContain('M -0.5,-0.5 L 4869.5,-0.5');
      expect(ring).toMatchObject({
        x0: 33.5,
        x1: 50.5,
        y0: -0.5,
        y1: 16.5,
      });
    });

    it('names the values of the order in view, as far as they are in view', () => {
      const runs = [
        { label: 'L4', start: 0, end: 149 },
        { label: 'L5', start: 150, end: 189 },
        { label: 'L6', start: 190, end: 4869 },
      ];
      const shown = connectivityFigure({
        groups: neuronGroups(neurons(100, 200), neurons(100, 200), 4870, runs),
        measure: 'connections',
        axis: 'neurons by layer',
      });

      expect(shown.layout.yaxis?.ticktext).toEqual(['L4', 'L5', 'L6']);
      expect(shown.layout.yaxis?.tickvals).toEqual([124.5, 169.5, 194.5]);
      // Between L4 and L5, and L5 and L6, down and across.
      expect(shown.layout.shapes).toHaveLength(4);
    });

    it('goes by node ids inside one value of the order, with no rule to draw', () => {
      const inside = connectivityFigure({
        groups: neuronGroups(neurons(100, 120), neurons(100, 120), 4870, [
          { label: 'L4', start: 0, end: 149 },
          { label: 'L5', start: 150, end: 4869 },
        ]),
        measure: 'connections',
        axis: 'neurons by layer',
      });

      expect(inside.layout.yaxis?.ticktext?.slice(0, 2)).toEqual(['1000', '1020']);
      expect(inside.layout.shapes).toEqual([]);
    });
  });

  describe('with a property of more values than rows', () => {
    /** Lines of `step` values each, from a value per place named v0, v1 and so on. */
    function valueSide(start: number, end: number, step: number): MatrixSide {
      const lines = Math.ceil((end - start) / step);
      const firstValues = Array.from({ length: lines }, (_, line) => `v${start + line * step}`);
      return {
        start,
        end,
        step,
        firstValues,
        labels: firstValues.map((first) => `${first} – last`),
        sizes: new Float64Array(lines).fill(1),
        members: {
          offsets: Uint32Array.from({ length: lines + 1 }, (_, line) => line),
          nodeIds: new Uint32Array(lines),
        },
      };
    }
    const figureOf = (side: MatrixSide, places: number) =>
      connectivityFigure({
        groups: {
          ...GROUPS,
          places,
          pre: side,
          post: side,
          connections: new Float64Array(side.labels.length ** 2),
          synapses: null,
          neuronsBefore: Float64Array.from({ length: places + 1 }, (_, place) => place),
        },
        measure: 'connections',
        axis: 'mtype',
      });

    it('names a few lines by their first value, where they are on the axis', () => {
      const { layout } = figureOf(valueSide(0, 11752, 40), 11752);

      expect(layout.xaxis?.ticktext).toHaveLength(6);
      expect(layout.xaxis?.ticktext?.[0]).toBe('v0');
      // The middle of the 40 places the first line takes.
      expect(layout.xaxis?.tickvals?.[0]).toBe(19.5);
      expect(layout.xaxis?.range).toEqual([-0.5, 11751.5]);
    });

    it('names single values where they are, zoomed in, a few of them', () => {
      const { layout } = figureOf(valueSide(100, 110, 1), 11752);

      expect(layout.xaxis?.ticktext).toEqual(['v100', 'v102', 'v104', 'v106', 'v108']);
      expect(layout.xaxis?.tickvals).toEqual([100, 102, 104, 106, 108]);
    });

    it('names up to 60 values of a property that fits', () => {
      const { layout } = figureOf(valueSide(0, 120, 1), 120);

      expect(layout.xaxis?.ticktext).toHaveLength(60);
    });
  });

  it('draws no rules between values of an order where they are too many to read', () => {
    const runs = Array.from({ length: 150 }, (_, i) => ({
      label: `v${i}`,
      start: i * 20,
      end: i * 20 + 19,
    }));
    const whole = connectivityFigure({
      groups: neuronGroups(neurons(0, 3000, 10), neurons(0, 3000, 10), 3000, runs),
      measure: 'connections',
      axis: 'neurons by mtype',
    });
    const zoomed = connectivityFigure({
      groups: neuronGroups(neurons(0, 100), neurons(0, 100), 3000, runs),
      measure: 'connections',
      axis: 'neurons by mtype',
    });

    expect(whole.layout.shapes).toEqual([]);
    // Five values in view, so four rules each way.
    expect(zoomed.layout.shapes).toHaveLength(8);
  });
});
