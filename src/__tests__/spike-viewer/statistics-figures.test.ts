import { describe, expect, it } from 'vitest';

import { rankedOrder } from '@/features/spike-viewer/raster-order';
import {
  barFigure,
  histogramFigure,
  meanAndError,
} from '@/features/spike-viewer/spike-statistics/figures';

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
