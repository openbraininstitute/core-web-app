import { describe, expect, it } from 'vitest';

import {
  arrayAxis,
  coherenceWith,
  contactLines,
  currentSourceDensity,
  fft,
  matrixOverRows,
  profileAlong,
  rowCorrelation,
  spectrogram,
  triggeredAverage,
} from './field-analysis';

import type { FieldRow } from './field-structure';
import type { LfpField } from './summary';

const sine = (hz: number, steps: number, dtMs: number, amplitude = 1000) =>
  Float64Array.from({ length: steps }, (_, i) =>
    Math.round(amplitude * Math.sin((2 * Math.PI * hz * i * dtMs) / 1000))
  );

/** Reproducible noise, so that a failure repeats. */
function noise(steps: number, seed: number, amplitude = 1000) {
  let state = seed;
  return Float64Array.from({ length: steps }, () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return Math.round((state / 4294967296 - 0.5) * 2 * amplitude);
  });
}

function fieldOf(rows: readonly ArrayLike<number>[], binMs = 1, scale = 1): LfpField {
  const bins = rows[0].length;
  const data = new Int16Array(rows.length * bins);
  rows.forEach((row, r) => {
    data.set(Array.from(row), r * bins);
  });
  return { contacts: rows.length, bins, binMs, start: 0, kind: 'value', data, scale };
}

const row = (contacts: number[], label = `e${contacts[0]}`): FieldRow => ({
  contacts,
  lead: contacts[0],
  label,
});

describe('fft', () => {
  it('matches a direct transform', () => {
    const input = [1, -2, 3, 0.5, -1, 4, 2, -3];
    const re = Float64Array.from(input);
    const im = new Float64Array(8);
    fft(re, im);
    input.forEach((_, k) => {
      let dr = 0;
      let di = 0;
      input.forEach((v, n) => {
        dr += v * Math.cos((-2 * Math.PI * k * n) / 8);
        di += v * Math.sin((-2 * Math.PI * k * n) / 8);
      });
      expect(re[k]).toBeCloseTo(dr, 9);
      expect(im[k]).toBeCloseTo(di, 9);
    });
  });
});

describe('spectrogram', () => {
  it('finds a tone where and when it is on', () => {
    const steps = 8000;
    const dt = 0.5;
    const tone = sine(200, steps, dt);
    const signal = tone.map((v, i) => (i >= 4000 ? v : 0));
    const result = spectrogram(signal, 1, dt, 10);
    if (!result) throw new Error('No spectrogram');
    const { times, frequencies, decibels } = result;
    const columns = times.length;
    const at = (band: number, column: number) => decibels[band * columns + column];
    const band = frequencies.findIndex((f) => f >= 200);
    expect(Math.abs(frequencies[band] - 200)).toBeLessThan(frequencies[1]);

    const late = times.findIndex((t) => t > 10 + 3000);
    const peak = frequencies.reduce((best, _, b) => (at(b, late) > at(best, late) ? b : best), 0);
    expect(Math.abs(frequencies[peak] - 200)).toBeLessThanOrEqual(frequencies[1]);
    const early = times.findIndex((t) => t > 10 + 500);
    expect(at(peak, late) - at(peak, early)).toBeGreaterThan(100);
  });

  it('gives the density the summary’s spectra give, whatever the scale', () => {
    const dt = 1;
    const steps = 4096;
    const white = noise(steps, 7);
    const scale = 0.25;
    const result = spectrogram(white, scale, dt, 0);
    if (!result) throw new Error('No spectrogram');
    const { times, frequencies, decibels } = result;
    let sum = 0;
    let count = 0;
    for (let b = 1; b < frequencies.length - 1; b++) {
      for (let c = 0; c < times.length; c++) {
        sum += 10 ** (decibels[b * times.length + c] / 10);
        count++;
      }
    }
    // The variance of the noise over the band it spreads across, one-sided.
    const variance = white.reduce((s, v) => s + (v * scale) ** 2, 0) / steps;
    expect(sum / count).toBeCloseTo(variance / (1000 / dt / 2), -1);
    expect(sum / count / (variance / 500)).toBeGreaterThan(0.8);
    expect(sum / count / (variance / 500)).toBeLessThan(1.2);
  });

  it('keeps to at most 600 columns on a long run', () => {
    const result = spectrogram(new Float64Array(1_000_000), 1, 0.1, 0);
    expect(result?.times.length).toBeLessThanOrEqual(600);
    expect(result?.decibels.every(Number.isFinite)).toBe(true);
  });

  it('has nothing to say of a run under a segment', () => {
    expect(spectrogram(new Float64Array(10), 1, 1, 0)).toBeNull();
  });
});

describe('coherenceWith', () => {
  it('is 1 for a scaled copy and low for unrelated noise', () => {
    const a = noise(8192, 1);
    const copy = a.map((v) => v * 0.5);
    const other = noise(8192, 99);
    const result = coherenceWith(a, [copy, other], 1);
    if (!result) throw new Error('No coherence');
    expect(result.segments).toBeGreaterThanOrEqual(16);
    expect(Math.min(...result.values[0])).toBeGreaterThan(0.999);
    const mean = result.values[1].reduce((s, v) => s + v, 0) / result.values[1].length;
    expect(mean).toBeLessThan(0.2);
  });

  it('survives a delay, as a correlation would not', () => {
    const steps = 8192;
    const a = sine(100, steps, 1);
    const shifted = Float64Array.from(a, (_, i) => a[(i + 3) % steps]);
    const result = coherenceWith(a, [shifted], 1);
    if (!result) throw new Error('No coherence');
    const band = result.frequencies.findIndex((f) => f >= 100);
    expect(result.values[0][band]).toBeGreaterThan(0.99);
  });

  it('counts a silent contact as following nothing', () => {
    const result = coherenceWith(noise(4096, 3), [new Float64Array(4096)], 1);
    expect(result?.values[0].every((v) => v === 0)).toBe(true);
  });

  it('has nothing to say of a run under two segments', () => {
    expect(coherenceWith(new Float64Array(100), [new Float64Array(100)], 1)).toBeNull();
  });
});

describe('triggeredAverage', () => {
  it('recovers a waveform hidden in noise, on the right lags', () => {
    const steps = 20_000;
    const signal = noise(steps, 5, 200);
    const triggers: number[] = [];
    for (let t = 100; t < steps - 100; t += 97) {
      triggers.push(t);
      signal[t + 5] += 3000;
    }
    const result = triggeredAverage(fieldOf([signal], 1, 0.5), triggers, 20);
    expect(result.triggers).toBe(triggers.length);
    expect(result.lags.length).toBe(41);
    const peak = result.means[0].indexOf(Math.max(...result.means[0]));
    expect(result.lags[peak]).toBe(5);
    expect(result.means[0][peak]).toBeGreaterThan(1400);
    expect(result.errors[0][peak]).toBeLessThan(10);
  });

  it('leaves out triggers whose window leaves the run', () => {
    const result = triggeredAverage(fieldOf([new Float64Array(100)]), [2, 50, 98], 10);
    expect(result.triggers).toBe(1);
  });

  it('thins triggers to at most 10,000', () => {
    const triggers = Float64Array.from({ length: 30_000 }, (_, i) => i / 10 + 20);
    const result = triggeredAverage(fieldOf([new Float64Array(4000)]), triggers, 5);
    expect(result.triggers).toBeLessThanOrEqual(10_000);
    expect(result.triggers).toBeGreaterThan(9_000);
  });

  it('is flat with no triggers', () => {
    const result = triggeredAverage(fieldOf([new Float64Array(100)]), [], 5);
    expect(result.triggers).toBe(0);
    expect(result.means[0].every((v) => v === 0)).toBe(true);
  });
});

const probe = (count: number, pitch = 20, at: [number, number] = [4214, -2111]) =>
  Float32Array.from({ length: count * 3 }, (_, i) => {
    const c = Math.floor(i / 3);
    return i % 3 === 0 ? at[0] : i % 3 === 1 ? -1330 + c * pitch : at[1];
  });

describe('arrayAxis', () => {
  it('finds the probe’s direction', () => {
    expect(arrayAxis(probe(16))?.map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 1, 0]);
  });

  it('points one way, whichever way the contacts are stored', () => {
    const reversed = Float32Array.from(probe(16)).reverse();
    const axis = arrayAxis(reversed);
    expect(Math.max(...(axis ?? []))).toBeGreaterThan(0.99);
  });

  it('has none for contacts in one place', () => {
    expect(arrayAxis(new Float32Array(30).fill(5))).toBeNull();
  });
});

describe('contactLines', () => {
  it('finds a probe, ordered along it', () => {
    const lines = contactLines(probe(16));
    expect(lines).toHaveLength(1);
    expect(lines[0].spacing).toBeCloseTo(20, 3);
    expect(lines[0].contacts).toEqual(Array.from({ length: 16 }, (_, c) => c));
  });

  it('finds every column of a grid', () => {
    const positions: number[] = [];
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        for (let z = 0; z < 41; z++) positions.push(x * 75, y * 75, z * 50);
      }
    }
    const lines = contactLines(Float32Array.from(positions));
    expect(lines).toHaveLength(25);
    expect(lines.every((l) => l.contacts.length === 41)).toBe(true);
    expect(lines[0].spacing).toBeCloseTo(50, 3);
  });

  it('finds a tilted probe', () => {
    const positions: number[] = [];
    for (let c = 0; c < 10; c++) positions.push(100 + c * 12, 50 + c * 16, -7);
    expect(contactLines(Float32Array.from(positions))[0]?.spacing).toBeCloseTo(20, 2);
  });

  it('finds none in scattered contacts, or unevenly spaced ones', () => {
    const scattered = Float32Array.from(noise(90, 11, 500));
    expect(contactLines(scattered)).toEqual([]);
    const uneven = Float32Array.from([0, 0, 0, 0, 10, 0, 0, 20, 0, 0, 90, 0, 0, 100, 0, 0, 110, 0]);
    expect(contactLines(uneven)).toEqual([]);
  });

  it('leaves out a line too short to read', () => {
    expect(contactLines(probe(4))).toEqual([]);
  });
});

describe('currentSourceDensity', () => {
  it('is −σ times the second derivative, in nA/mm³', () => {
    // φ = z² µV at 10 µm: ∂²φ/∂z² is 2 µV/µm², so −0.3 S/m × 2e6 V/m² = −600,000 A/m³.
    const rows = [0, 10, 20, 30, 40].map((z) => new Float64Array(8).fill((z * z) / 10));
    const result = currentSourceDensity(fieldOf(rows, 1, 10), 10);
    expect(result?.rows).toBe(3);
    expect(result?.values.every((v) => Math.abs(v + 600_000) < 1)).toBe(true);
  });

  it('is zero for a field that changes evenly along the line', () => {
    const rows = [0, 1, 2, 3, 4].map((z) => new Float64Array(8).fill(z * 100));
    expect(currentSourceDensity(fieldOf(rows), 20)?.values.every((v) => v === 0)).toBe(true);
  });

  it('makes a sink negative', () => {
    const rows = [0, 0, -100, 0, 0].map((v) => new Float64Array(4).fill(v));
    const result = currentSourceDensity(fieldOf(rows), 20);
    const middle = result?.values[result.times.length] ?? 0;
    expect(middle).toBeLessThan(0);
  });

  it('averages a long run into at most 1,024 columns, centred', () => {
    const rows = [0, 1, 2].map(() => new Float64Array(10_000));
    const result = currentSourceDensity(fieldOf(rows, 0.1), 20);
    expect(result?.times.length).toBe(1024);
    expect(result?.times[0]).toBeCloseTo(1000 / 1024 / 2, 6);
  });

  it('needs three contacts', () => {
    expect(
      currentSourceDensity(fieldOf([new Float64Array(4), new Float64Array(4)]), 20)
    ).toBeNull();
  });
});

describe('profileAlong', () => {
  it('keeps each contact of a probe, from low to high', () => {
    const coordinate = [30, 10, 20];
    const points = profileAlong(coordinate, (c) => c * 2);
    expect(points).toEqual([
      { at: 10, value: 2 },
      { at: 20, value: 4 },
      { at: 30, value: 0 },
    ]);
  });

  it('averages many contacts into stretches', () => {
    const coordinate = Array.from({ length: 1000 }, (_, c) => c);
    const points = profileAlong(coordinate, (c) => c);
    expect(points.length).toBeLessThanOrEqual(64);
    points.forEach((p) => {
      expect(p.value).toBeCloseTo(p.at, 6);
    });
  });

  it('is one point for contacts in one place', () => {
    expect(profileAlong([5, 5], (c) => c)).toEqual([{ at: 5, value: 0.5 }]);
  });
});

describe('rowCorrelation', () => {
  it('is 1 for the same signal, −1 for its opposite, on any scale', () => {
    const a = noise(500, 2);
    const field = fieldOf([a, a.map((v) => v * 0.5), a.map((v) => -v)]);
    const matrix = rowCorrelation(field, [row([0]), row([1]), row([2])]);
    expect(matrix[0]).toBeCloseTo(1, 5);
    expect(matrix[1]).toBeCloseTo(1, 3);
    expect(matrix[2]).toBeCloseTo(-1, 3);
    expect(matrix[3]).toBeCloseTo(matrix[1], 6);
  });

  it('counts a flat row as correlating with nothing', () => {
    const field = fieldOf([noise(100, 4), new Float64Array(100)]);
    const matrix = rowCorrelation(field, [row([0]), row([1])]);
    expect(matrix[1]).toBe(0);
    expect(matrix[3]).toBe(0);
  });

  it('reads the middle of each min/max bin', () => {
    const data = Int16Array.from([0, 10, 10, 30, 20, 20, 40, 60, 5, 15, 25, 35, 45, 55, 0, 0]);
    const field: LfpField = {
      contacts: 2,
      bins: 4,
      binMs: 1,
      start: 0,
      kind: 'min_max',
      data,
      scale: 1,
    };
    const matrix = rowCorrelation(field, [row([0]), row([1])]);
    expect(matrix[0]).toBeCloseTo(1, 6);
    expect(Number.isFinite(matrix[1])).toBe(true);
  });
});

describe('matrixOverRows', () => {
  it('reorders a matrix as the rows go', () => {
    const matrix = [1, 0.5, 0.25, 0.5, 1, 0.75, 0.25, 0.75, 1];
    const out = matrixOverRows(matrix, 3, [row([2]), row([0])]);
    expect(Array.from(out)).toEqual([1, 0.25, 0.25, 1]);
  });

  it('averages rows of several contacts, and applies a scale', () => {
    const matrix = [1, 0.5, 0.25, 0.5, 1, 0.75, 0.25, 0.75, 1];
    const out = matrixOverRows(matrix, 3, [row([0, 1]), row([2])], 2);
    expect(out[1]).toBeCloseTo(((0.25 + 0.75) / 2) * 2, 6);
    expect(out[0]).toBeCloseTo(((1 + 0.5 + 0.5 + 1) / 4) * 2, 6);
  });
});
