import { describe, expect, it } from 'vitest';

import { minMaxDownsample, minMaxUniform } from '@/utils/min-max';

/** A deterministic stand-in for a noisy recording, so failures are reproducible. */
function noisySignal(length: number): Float64Array {
  const out = new Float64Array(length);
  let seed = 12345;

  for (let i = 0; i < length; i += 1) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    out[i] = Math.sin(i / 40) * 10 + (seed / 2147483648 - 0.5);
  }

  return out;
}

describe('minMaxUniform', () => {
  it('spends its budget on two points per bucket', () => {
    const { x, y } = minMaxUniform(noisySignal(10_000), 0.1, 1000);

    expect(y).toHaveLength(1000);
    expect(x).toHaveLength(1000);
  });

  it('keeps the extremes of the window', () => {
    const signal = noisySignal(10_000);
    const { y } = minMaxUniform(signal, 0.1, 200);

    expect(Math.max(...y)).toBe(Math.max(...signal));
    expect(Math.min(...y)).toBe(Math.min(...signal));
  });

  it('keeps a spike narrower than a bucket', () => {
    // 100 points over 100k samples is a 1000:1 bucket; the spike is a single sample inside one.
    const signal = noisySignal(100_000);
    signal[54_321] = 500;

    const { x, y } = minMaxUniform(signal, 0.1, 100);
    const spike = y.indexOf(500);

    expect(spike).toBeGreaterThanOrEqual(0);
    expect(x[spike]).toBeCloseTo(54_321 * 0.1);
  });

  it('reports each point at the time it was sampled, in order', () => {
    const { x } = minMaxUniform(noisySignal(10_000), 0.25, 100);

    expect(x).toEqual([...x].sort((a, b) => a - b));
    expect(x.every((value) => Number.isInteger(value / 0.25))).toBe(true);
  });

  it('passes a window shorter than the budget through untouched', () => {
    const signal = noisySignal(40);
    const { x, y } = minMaxUniform(signal, 2, 1000);

    expect(y).toEqual([...signal]);
    expect(x).toEqual([...signal].map((_, index) => index * 2));
  });

  it('leaves a gap where a bucket holds nothing finite', () => {
    const signal = new Float64Array(1000).fill(1);
    signal.fill(NaN, 500, 600);

    const { y } = minMaxUniform(signal, 1, 20);

    // 10 buckets of 100 samples, so the sixth is entirely NaN and nothing else is.
    expect(y.slice(10, 12).every(Number.isNaN)).toBe(true);
    expect(y.filter(Number.isNaN)).toHaveLength(2);
  });

  it('reads only the requested window, clamped to the series', () => {
    const signal = noisySignal(10_000);
    signal[100] = 999;
    signal[9_000] = -999;

    const { x, y } = minMaxUniform(signal, 0.1, 100, 5_000, 50_000);

    expect(y).not.toContain(999);
    expect(y).toContain(-999);
    expect(x[0]).toBeGreaterThanOrEqual(500);
  });

  it('has nothing to return for an empty window', () => {
    expect(minMaxUniform(noisySignal(100), 1, 100, 50, 50)).toEqual({ x: [], y: [] });
  });
});

describe('minMaxDownsample', () => {
  it('reduces an envelope to exactly what decimating the source would have given', () => {
    // The property the series cache depends on: a repetition is read once at detail resolution
    // and the overview is taken from that rather than from the file.
    const signal = noisySignal(2_000_000);

    const detail = minMaxUniform(signal, 0.05, 1000);
    const derived = minMaxDownsample(detail.x, detail.y, 100);
    const direct = minMaxUniform(signal, 0.05, 100);

    expect(derived).toEqual(direct);
  });

  it('holds for a window as well as a whole series', () => {
    const signal = noisySignal(500_000);

    const detail = minMaxUniform(signal, 0.05, 1000, 12_345, 456_789);
    const derived = minMaxDownsample(detail.x, detail.y, 100);
    const direct = minMaxUniform(signal, 0.05, 100, 12_345, 456_789);

    expect(derived).toEqual(direct);
  });

  it('leaves a series already at or under the target alone', () => {
    const { x, y } = minMaxUniform(noisySignal(10_000), 1, 100);

    expect(minMaxDownsample(x, y, 100)).toEqual({ x, y });
  });
});
