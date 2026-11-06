import { describe, expect, it } from 'vitest';

import { rankedOrder } from '@/features/spike-viewer/raster-order';
import {
  barFigure,
  histogramFigure,
  meanAndError,
} from '@/features/spike-viewer/spike-statistics/figures';
import { psthFigure } from '@/features/spike-viewer/spike-statistics/time-course-figures';

import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

describe('rankedOrder', () => {
  it('puts the highest value on the top row and cells without one below them all', () => {
    const { rows, axis } = rankedOrder([2, Number.NaN, 9, 5], 'Rate', String);
    expect(Array.from(rows)).toEqual([2, 3, 0, 1]);
    expect(axis.valueAt?.(0)).toBe('9');
    expect(axis.valueAt?.(3)).toBe('–');
  });
});

describe('meanAndError', () => {
  it('gives the mean, the sample standard deviation and the standard error', () => {
    const { n, mean, sd, sem } = meanAndError(Float64Array.from([2, 4, 4, 6]));
    expect(n).toBe(4);
    expect(mean).toBe(4);
    expect(sd).toBeCloseTo(Math.sqrt(8 / 3));
    expect(sem).toBeCloseTo(Math.sqrt(8 / 3) / 2);
    expect(meanAndError(Float64Array.from([7])).sem).toBe(0);
  });
});

describe('histogramFigure', () => {
  it('stacks a trace of bars per group, every cell counted once', () => {
    const groups = [
      { name: 'L1', values: Float64Array.from([0, 1, 1, 3]) },
      { name: 'L2', values: Float64Array.from([2, 3]) },
    ];
    const figure = histogramFigure(groups, 'layer', 'Spike count', '#1f77b4', 1, undefined);
    expect(figure.layout.barmode).toBe('stack');
    const counted = figure.data.map((trace) =>
      Array.from((trace as { y: Float64Array }).y).reduce((sum, v) => sum + v, 0)
    );
    expect(counted).toEqual([4, 2]);
  });
});

describe('barFigure', () => {
  it('draws a bar per group at its mean, its standard error either side', () => {
    const figure = barFigure(
      [
        { name: 'bAC', values: Float64Array.from([1, 3]) },
        { name: 'cNAC', values: Float64Array.from([10]) },
      ],
      'etype',
      'Firing rate (Hz)',
      '#1f77b4'
    );
    const [trace] = figure.data as { y: number[]; error_y: { array: number[] } }[];
    expect(trace.y).toEqual([2, 10]);
    expect(trace.error_y.array).toEqual([1, 0]);
  });
});

describe('psthFigure', () => {
  const spikes = {
    name: 'test',
    timestamps: Float32Array.from([10, 140, 144]),
    nodeIds: Float64Array.from([0, 0, 1]),
    nodeIdRange: { min: 0, max: 1 },
  } as SpikePopulation;
  const all = [{ name: 'All', cells: Uint32Array.from([0, 1]) }];

  it('bands a last bin the span cuts short, says how long it is, and marks its value', () => {
    // Fifteen 10 ms bins over 145 ms: the last is 5 ms long.
    const figure = psthFigure(all, spikes, [0, 145], 2, undefined, '#000', {
      binMs: 10,
      sigmaMs: 0,
    });
    expect(figure.layout.shapes?.[0]).toMatchObject({ x0: 140, x1: 145, yref: 'paper' });
    expect(JSON.stringify(figure.layout.xaxis?.title)).toContain('10 ms bins, the last 5.0 ms');
    const last = figure.tooltip?.({ curveNumber: 0, pointNumber: 14 });
    expect(last?.rows).toContainEqual({ label: 'Partial bin', value: '5.0 of 10 ms' });
    const before = figure.tooltip?.({ curveNumber: 0, pointNumber: 13 });
    expect(before?.rows.some((row) => row.label === 'Partial bin')).toBe(false);
  });

  it('rates a last bin the span cuts short over its own width', () => {
    // Two spikes from two cells: 200 Hz over the last 5 ms, where the 10 ms the others span says 100.
    const figure = psthFigure(all, spikes, [0, 145], 2, undefined, '#000', {
      binMs: 10,
      sigmaMs: 0,
    });
    const [{ y }] = figure.data as { y: Float64Array }[];
    expect(y[1]).toBeCloseTo(50);
    expect(y[14]).toBeCloseTo(200);
  });

  it('leaves a last bin the span cuts short out of the smoothing, banded and said so', () => {
    const figure = psthFigure(all, spikes, [0, 145], 2, undefined, '#000', {
      binMs: 10,
      sigmaMs: 10,
    });
    const [{ x, y }] = figure.data as { x: Float64Array; y: Float64Array }[];
    // The line stops at the last whole bin, and its two spikes pull nothing before them.
    expect(x).toHaveLength(14);
    expect(x.at(-1)).toBeCloseTo(135);
    expect(y.at(-1)).toBeCloseTo(0, 6);
    expect(figure.layout.shapes?.[0]).toMatchObject({ x0: 140, x1: 145 });
    expect(JSON.stringify(figure.layout.xaxis?.title)).toContain('the last 5.0 ms left out');
  });

  it('leaves a span the bins fit unbanded', () => {
    const figure = psthFigure(all, spikes, [0, 150], 2, undefined, '#000', {
      binMs: 10,
      sigmaMs: 0,
    });
    expect(figure.layout.shapes).toBeUndefined();
    expect(JSON.stringify(figure.layout.xaxis?.title)).not.toContain('the last');
  });

  it('adds no empty last bin where the span’s length is a whole number of bins give or take float error', () => {
    // 512.2 - 12.2 is 500.00000000000006.
    const figure = psthFigure(all, spikes, [12.2, 512.2], 2, undefined, '#000', {
      binMs: 5,
      sigmaMs: 0,
    });
    expect(figure.layout.shapes).toBeUndefined();
    expect((figure.data as { y: Float64Array }[])[0].y).toHaveLength(101);
  });
});
