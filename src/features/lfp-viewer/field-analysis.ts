import { extentOf } from '@/features/circuit-viewer/morphologies/extent';
import {
  coordinatesAlong,
  leadingVector,
  signOfLargest,
} from '@/features/lfp-viewer/field-structure';
import { binMiddle } from '@/features/lfp-viewer/summary';
import { median } from '@/features/viewer-3d/engine/motion-quality';

import type { Vec3 } from '@/features/circuit-viewer/morphologies/types';
import type { ContactGrid } from '@/features/lfp-viewer/contact-grid';
import type { FieldRow } from '@/features/lfp-viewer/field-structure';
import type { LfpField } from '@/features/lfp-viewer/summary';

const MAX_SPECTROGRAM_COLUMNS = 600;
const MIN_SPECTROGRAM_SEGMENT = 32;
const MAX_SPECTROGRAM_SEGMENT = 4096;
const MIN_SPECTRUM_SEGMENT = 256;
const MAX_SPECTRUM_SEGMENT = 1 << 16;
const MIN_COHERENCE_SEGMENT = 64;
const MAX_COHERENCE_SEGMENT = 1 << 14;
/** Coherence is 1 at every frequency from a single segment, so it needs many. */
const COHERENCE_SEGMENTS = 16;
const MIN_COHERENCE_AVERAGES = 8;
const MAX_COHERENCE_AVERAGES = 256;
const MAX_TRIGGERS = 10_000;
const MAX_CSD_COLUMNS = 1024;
/** Fewer contacts on a line leave too few second differences to read a profile from. */
const MIN_LINE_CONTACTS = 5;
const ON_LINE_UM = 1;
const EVEN_GAP_SHARE = 0.05;
const CIRCUIT_AXES: Vec3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const MAX_PROFILE_BINS = 64;
/** The usual figure for cortex, in S/m. */
export const CONDUCTIVITY = 0.3;
/** nA/mm³ per µV/µm² at `CONDUCTIVITY`. */
const CSD_UNIT = CONDUCTIVITY * 1e6;

const twiddles = new Map<number, { cos: Float64Array; sin: Float64Array }>();

function twiddlesOf(n: number) {
  let table = twiddles.get(n);
  if (!table) {
    const half = n / 2;
    const cos = new Float64Array(half);
    const sin = new Float64Array(half);
    for (let i = 0; i < half; i++) {
      cos[i] = Math.cos((2 * Math.PI * i) / n);
      sin[i] = -Math.sin((2 * Math.PI * i) / n);
    }
    table = { cos, sin };
    twiddles.set(n, table);
  }
  return table;
}

/** The discrete Fourier transform in place; the length must be a power of two. */
export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  const { cos, sin } = twiddlesOf(n);
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2;
    const stride = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = cos[k * stride];
        const wi = sin[k * stride];
        const at = start + k + half;
        const tr = re[at] * wr - im[at] * wi;
        const ti = re[at] * wi + im[at] * wr;
        re[at] = re[start + k] - tr;
        im[at] = im[start + k] - ti;
        re[start + k] += tr;
        im[start + k] += ti;
      }
    }
  }
}

/** What a squared FFT magnitude is multiplied by for a density in µV²/Hz, under a window. */
function densityNorm(window: Float64Array, scale: number, fs: number): number {
  let squares = 0;
  for (const w of window) squares += w * w;
  return (scale * scale) / (fs * squares);
}

function oneSidedDensity(
  re: Float64Array,
  im: Float64Array,
  band: number,
  bands: number,
  norm: number
): number {
  const edge = band === 0 || band === bands - 1;
  return (re[band] * re[band] + im[band] * im[band]) * norm * (edge ? 1 : 2);
}

function hann(n: number): Float64Array {
  return Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
}

function powerOfTwoBelow(value: number): number {
  return 2 ** Math.floor(Math.log2(Math.max(1, value)));
}

function loadSegment(
  values: ArrayLike<number>,
  from: number,
  window: Float64Array,
  re: Float64Array,
  im: Float64Array
) {
  const n = window.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += values[from + i];
  mean /= n;
  for (let i = 0; i < n; i++) re[i] = (values[from + i] - mean) * window[i];
  im.fill(0);
}

export type Spectrogram = {
  /** The middle of each column, in ms. */
  times: Float64Array;
  /** In Hz, from 0. */
  frequencies: Float64Array;
  /** Power in dB of µV²/Hz, a row per frequency, each `times.length` long. */
  decibels: Float32Array;
};

/**
 * One contact's power over time, as the summary's spectra: a one-sided Hann
 * density with each segment's mean off. Segments last about a thirty-second of
 * the run, so the result reads alike at any dt. Null for a run too short for one.
 */
export function spectrogram(
  row: ArrayLike<number>,
  scale: number,
  dtMs: number,
  start: number
): Spectrogram | null {
  const steps = row.length;
  const segment = Math.min(
    MAX_SPECTROGRAM_SEGMENT,
    Math.max(MIN_SPECTROGRAM_SEGMENT, powerOfTwoBelow((steps / 32) * Math.SQRT2))
  );
  if (steps < segment) return null;
  const hop = Math.max(segment / 4, Math.ceil((steps - segment) / (MAX_SPECTROGRAM_COLUMNS - 1)));
  const columns = Math.floor((steps - segment) / hop) + 1;
  const bands = segment / 2 + 1;
  const fs = 1000 / dtMs;
  const window = hann(segment);
  const norm = densityNorm(window, scale, fs);

  const re = new Float64Array(segment);
  const im = new Float64Array(segment);
  const decibels = new Float32Array(columns * bands);
  for (let column = 0; column < columns; column++) {
    loadSegment(row, column * hop, window, re, im);
    fft(re, im);
    for (let band = 0; band < bands; band++) {
      const power = oneSidedDensity(re, im, band, bands, norm);
      decibels[band * columns + column] = 10 * Math.log10(Math.max(power, 1e-30));
    }
  }
  return {
    times: Float64Array.from(
      { length: columns },
      (_, column) => start + (column * hop + segment / 2) * dtMs
    ),
    frequencies: Float64Array.from({ length: bands }, (_, band) => (band * fs) / segment),
    decibels,
  };
}

/**
 * Each row's power spectrum over the run, as the summary's: a one-sided Hann density with each
 * segment's mean off, half overlapping, over segments of about a quarter of the run.
 */
export function rowSpectra(field: LfpField): { frequencies: number[]; psd: Float32Array } {
  const n = powerOfTwoBelow(
    Math.min(
      field.bins,
      Math.max(MIN_SPECTRUM_SEGMENT, Math.min(MAX_SPECTRUM_SEGMENT, field.bins / 4))
    )
  );
  const bands = n / 2 + 1;
  const fs = 1000 / field.binMs;
  const window = hann(n);
  const norm = densityNorm(window, field.scale, fs);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const psd = new Float32Array(field.contacts * bands);
  const hop = Math.max(1, n / 2);
  const segments = Math.floor((field.bins - n) / hop) + 1;
  for (let r = 0; r < field.contacts; r++) {
    const row = field.data.subarray(r * field.bins, (r + 1) * field.bins);
    for (let s = 0; s < segments; s++) {
      loadSegment(row, s * hop, window, re, im);
      fft(re, im);
      for (let band = 0; band < bands; band++) {
        psd[r * bands + band] += oneSidedDensity(re, im, band, bands, norm) / segments;
      }
    }
  }
  return { frequencies: Array.from({ length: bands }, (_, band) => (band * fs) / n), psd };
}

export type Coherence = {
  /** In Hz, from the first above 0. */
  frequencies: Float64Array;
  /** Magnitude-squared, 0 to 1: one per other contact, each as long as `frequencies`. */
  values: Float32Array[];
  segments: number;
};

/**
 * How well each of `others` follows `reference` at each frequency: Welch's
 * magnitude-squared coherence, over half-overlapping Hann segments.
 */
export function coherenceWith(
  reference: ArrayLike<number>,
  others: readonly ArrayLike<number>[],
  dtMs: number
): Coherence | null {
  const steps = reference.length;
  const n = Math.min(
    MAX_COHERENCE_SEGMENT,
    Math.max(MIN_COHERENCE_SEGMENT, powerOfTwoBelow(steps / COHERENCE_SEGMENTS))
  );
  const available = Math.floor((steps - n) / (n / 2)) + 1;
  if (available < MIN_COHERENCE_AVERAGES) return null;
  const segments = Math.min(available, MAX_COHERENCE_AVERAGES);
  const hop = Math.floor((steps - n) / (segments - 1));
  const bands = n / 2;
  const window = hann(n);
  const refRe = new Float64Array(n);
  const refIm = new Float64Array(n);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const refPower = new Float64Array(bands);
  const power = others.map(() => new Float64Array(bands));
  const crossRe = others.map(() => new Float64Array(bands));
  const crossIm = others.map(() => new Float64Array(bands));

  for (let s = 0; s < segments; s++) {
    loadSegment(reference, s * hop, window, refRe, refIm);
    fft(refRe, refIm);
    for (let b = 0; b < bands; b++) {
      refPower[b] += refRe[b + 1] * refRe[b + 1] + refIm[b + 1] * refIm[b + 1];
    }
    others.forEach((other, o) => {
      loadSegment(other, s * hop, window, re, im);
      fft(re, im);
      for (let b = 0; b < bands; b++) {
        const k = b + 1;
        power[o][b] += re[k] * re[k] + im[k] * im[k];
        crossRe[o][b] += refRe[k] * re[k] + refIm[k] * im[k];
        crossIm[o][b] += refIm[k] * re[k] - refRe[k] * im[k];
      }
    });
  }

  const fs = 1000 / dtMs;
  return {
    frequencies: Float64Array.from({ length: bands }, (_, b) => ((b + 1) * fs) / n),
    values: others.map((_, o) =>
      Float32Array.from({ length: bands }, (_, b) => {
        const denominator = refPower[b] * power[o][b];
        if (denominator <= 0) return 0;
        return (crossRe[o][b] ** 2 + crossIm[o][b] ** 2) / denominator;
      })
    ),
    segments,
  };
}

export type TriggeredAverage = {
  /** Time from the trigger, in ms. */
  lags: Float64Array;
  /** µV, one per row of the field, each as long as `lags`. */
  means: Float32Array[];
  /** The standard error of the first row's mean, with spikes of one moment counted as one. */
  error: Float32Array;
  /** How many triggers went in: those with their whole window inside the run, at most `MAX_TRIGGERS`. */
  triggers: number;
  /** How many separate moments they fall at, half a window apart: a volley is one, however many spikes. */
  events: number;
};

/**
 * Spikes of one moment share one stretch of the field, so they don't count as
 * independent: a cluster-robust standard error, with each moment a cluster.
 */
function errorOverEvents(
  field: LfpField,
  centres: readonly number[],
  half: number,
  mean: Float32Array
): { error: Float32Array; events: number } {
  const length = mean.length;
  const sorted = Float64Array.from(centres).sort();
  const squares = new Float64Array(length);
  const residual = new Float64Array(length);
  const closeEvent = () => {
    for (let i = 0; i < length; i++) squares[i] += residual[i] * residual[i];
    residual.fill(0);
  };
  let events = 0;
  let start = -Infinity;
  for (const centre of sorted) {
    if (centre - start >= half) {
      closeEvent();
      events++;
      start = centre;
    }
    for (let i = 0; i < length; i++) {
      residual[i] += field.data[centre - half + i] * field.scale - mean[i];
    }
  }
  closeEvent();
  if (events < 2) return { error: new Float32Array(length), events };
  const correction = events / (events - 1);
  return {
    error: Float32Array.from(squares, (s) => Math.sqrt(s * correction) / sorted.length),
    events,
  };
}

export function triggeredAverage(
  field: LfpField,
  triggers: ArrayLike<number>,
  halfWindowMs: number
): TriggeredAverage {
  const half = Math.max(1, Math.round(halfWindowMs / field.binMs));
  const length = half * 2 + 1;
  const usable: number[] = [];
  for (let i = 0; i < triggers.length; i++) {
    const centre = Math.round((triggers[i] - field.start) / field.binMs);
    if (centre - half >= 0 && centre + half < field.bins) usable.push(centre);
  }
  const count = Math.min(usable.length, MAX_TRIGGERS);
  const picked = Array.from(
    { length: count },
    (_, i) => usable[Math.floor((i * usable.length) / count)]
  );

  const means: Float32Array[] = [];
  for (let contact = 0; contact < field.contacts; contact++) {
    const sum = new Float64Array(length);
    const row = contact * field.bins;
    for (const centre of picked) {
      const first = row + centre - half;
      for (let i = 0; i < length; i++) {
        sum[i] += field.data[first + i] * field.scale;
      }
    }
    means.push(Float32Array.from(sum, (s) => (count > 0 ? s / count : 0)));
  }
  return {
    lags: Float64Array.from({ length }, (_, i) => (i - half) * field.binMs),
    means,
    triggers: picked.length,
    ...errorOverEvents(field, picked, half, means[0]),
  };
}

/**
 * A grid's axes, each with its largest component positive: those with the most slices first, and of
 * those the nearest `towards`, as a cube has no longest.
 */
function gridAxes({ frame, slices }: ContactGrid, towards: Vec3 | null = null): Vec3[] {
  const nearness = ([x, y, z]: Vec3) =>
    towards ? Math.abs(x * towards[0] + y * towards[1] + z * towards[2]) : 0;
  return (frame ?? CIRCUIT_AXES)
    .map((axis, i) => ({ axis, slices: slices[i], nearness: nearness(axis) }))
    .sort((a, b) => b.slices - a.slices || b.nearness - a.nearness)
    .map(({ axis }) => {
      const sign = signOfLargest(axis);
      return [axis[0] * sign, axis[1] * sign, axis[2] * sign];
    });
}

/**
 * The axis contacts spread along most, its largest component positive: one of a grid's own, as the
 * spread of a cube is the same every way. Null if they don't spread.
 */
export function arrayAxis(positions: Float32Array, grid: ContactGrid | null = null): Vec3 | null {
  if (grid) return gridAxes(grid)[0];
  const count = positions.length / 3;
  const mean = extentOf(positions)?.mean;
  if (!mean) return null;
  const centred = new Float32Array(positions.length);
  for (let c = 0; c < count; c++) {
    for (let k = 0; k < 3; k++) centred[k * count + c] = positions[c * 3 + k] - mean[k];
  }
  if (centred.every((v) => v === 0)) return null;
  const [x, y, z] = leadingVector(centred, 3, count);
  return [x, y, z];
}

export type ContactLine = {
  /** The direction it runs in, in the circuit's frame. */
  axis: Vec3;
  /** Along the line, from its lowest coordinate. */
  contacts: number[];
  /** Theirs along `axis`, in µm from the array's centre. */
  coordinates: number[];
  /** The gap between neighbours, in µm. */
  spacing: number;
};

/**
 * The evenly spaced lines of contacts along one axis, as a probe has one of and
 * a grid many: what a second derivative along that axis can be read from. That
 * is the array's main axis, or the first of a grid's to hold any, as the planes
 * of a stack may lie offset from each other. Empty where contacts are scattered.
 */
export function contactLines(
  positions: Float32Array,
  grid: ContactGrid | null = null,
  towards: Vec3 | null = null
): ContactLine[] {
  const axes = grid ? gridAxes(grid, towards) : [arrayAxis(positions)];
  for (const axis of axes) {
    const lines = axis ? linesAlong(positions, axis) : [];
    if (lines.length > 0) return lines;
  }
  return [];
}

function linesAlong(positions: Float32Array, axis: Vec3): ContactLine[] {
  const count = positions.length / 3;
  const along = coordinatesAlong(positions, axis);
  const groups: { offset: [number, number, number]; members: { contact: number; at: number }[] }[] =
    [];
  for (let c = 0; c < count; c++) {
    const at = along[c];
    const offset: [number, number, number] = [
      positions[c * 3] - at * axis[0],
      positions[c * 3 + 1] - at * axis[1],
      positions[c * 3 + 2] - at * axis[2],
    ];
    const group = groups.find(
      (g) =>
        Math.hypot(g.offset[0] - offset[0], g.offset[1] - offset[1], g.offset[2] - offset[2]) <=
        ON_LINE_UM
    );
    if (group) group.members.push({ contact: c, at });
    else groups.push({ offset, members: [{ contact: c, at }] });
  }

  const lines: ContactLine[] = [];
  for (const { members } of groups) {
    if (members.length < MIN_LINE_CONTACTS) continue;
    members.sort((a, b) => a.at - b.at);
    const gaps = members.slice(1).map((m, i) => m.at - members[i].at);
    const spacing = median(gaps);
    if (spacing <= 0) continue;
    if (gaps.every((gap) => Math.abs(gap - spacing) <= spacing * EVEN_GAP_SHARE)) {
      lines.push({
        axis,
        contacts: members.map((m) => m.contact),
        coordinates: members.map((m) => m.at),
        spacing,
      });
    }
  }
  return lines;
}

export type CurrentSourceDensity = {
  /** The middle of each column, in ms. */
  times: Float64Array;
  /** nA/mm³ at `CONDUCTIVITY`, a row per inner contact of the line, each `times.length` long. */
  values: Float32Array;
  /** The rows: the line's contacts without its two ends. */
  rows: number;
  /** The 99.5th percentile of |values|, for a colour scale that one outlier doesn't flatten. */
  limit: number;
};

/**
 * −σ ∂²φ/∂z² along a line of contacts, at full resolution then averaged into
 * columns: `field` holds the line's rows in order. Sinks come out negative.
 * Each contact's mean over the run is left out, as a steady offset between
 * contacts would otherwise read as a current that never changes.
 */
export function currentSourceDensity(
  field: LfpField,
  spacing: number
): CurrentSourceDensity | null {
  const { contacts, bins, data, scale } = field;
  if (contacts < 3 || bins === 0) return null;
  const rows = contacts - 2;
  const columns = Math.min(bins, MAX_CSD_COLUMNS);
  const perStep = (-CSD_UNIT * scale) / (spacing * spacing);
  const blocks = new Float64Array(contacts * columns);
  for (let c = 0; c < contacts; c++) {
    const row = c * bins;
    let total = 0;
    for (let column = 0; column < columns; column++) {
      const from = Math.floor((column * bins) / columns);
      const to = Math.floor(((column + 1) * bins) / columns);
      let sum = 0;
      for (let b = from; b < to; b++) sum += data[row + b];
      total += sum;
      blocks[c * columns + column] = sum / (to - from);
    }
    const mean = total / bins;
    for (let column = 0; column < columns; column++) blocks[c * columns + column] -= mean;
  }
  const values = new Float32Array(rows * columns);
  for (let r = 0; r < rows; r++) {
    for (let column = 0; column < columns; column++) {
      const above = blocks[r * columns + column];
      const at = blocks[(r + 1) * columns + column];
      const below = blocks[(r + 2) * columns + column];
      values[r * columns + column] = (above - 2 * at + below) * perStep;
    }
  }
  const sorted = Float32Array.from(values, Math.abs).sort();
  return {
    times: Float64Array.from(
      { length: columns },
      (_, column) => field.start + ((column + 0.5) * (bins * field.binMs)) / columns
    ),
    values,
    rows,
    limit: sorted[Math.floor((sorted.length - 1) * 0.995)] || 1,
  };
}

export type ProfilePoint = { at: number; value: number };

/**
 * A value over positions along an axis, from low to high: each contact's where
 * there are few places, else their means over stretches of the axis.
 */
export function profileAlong(
  coordinate: ArrayLike<number>,
  value: (contact: number) => number
): ProfilePoint[] {
  const count = coordinate.length;
  let low = Infinity;
  let high = -Infinity;
  for (let c = 0; c < count; c++) {
    low = Math.min(low, coordinate[c]);
    high = Math.max(high, coordinate[c]);
  }
  const span = high - low || 1;
  const atSum = new Float64Array(MAX_PROFILE_BINS);
  const valueSum = new Float64Array(MAX_PROFILE_BINS);
  const inBin = new Uint32Array(MAX_PROFILE_BINS);
  for (let c = 0; c < count; c++) {
    const bin = Math.min(
      MAX_PROFILE_BINS - 1,
      Math.floor(((coordinate[c] - low) / span) * MAX_PROFILE_BINS)
    );
    atSum[bin] += coordinate[c];
    valueSum[bin] += value(c);
    inBin[bin]++;
  }
  const points: ProfilePoint[] = [];
  for (let bin = 0; bin < MAX_PROFILE_BINS; bin++) {
    if (inBin[bin] > 0)
      points.push({ at: atSum[bin] / inBin[bin], value: valueSum[bin] / inBin[bin] });
  }
  return points;
}

function rowSignals(field: LfpField, rows: readonly FieldRow[]): Float64Array[] {
  const { bins } = field;
  return rows.map((row) => {
    const signal = new Float64Array(bins);
    for (const contact of row.contacts) {
      for (let b = 0; b < bins; b++) signal[b] += binMiddle(field, contact * bins + b);
    }
    return signal;
  });
}

export function rowCorrelation(field: LfpField, rows: readonly FieldRow[]): Float32Array {
  const signals = rowSignals(field, rows);
  const centred = signals.map((signal) => {
    let mean = 0;
    for (const v of signal) mean += v / signal.length;
    let squares = 0;
    const off = signal.map((v) => {
      squares += (v - mean) ** 2;
      return v - mean;
    });
    return { off, norm: Math.sqrt(squares) };
  });
  const n = rows.length;
  const matrix = new Float32Array(n * n);
  for (let a = 0; a < n; a++) {
    for (let b = a; b < n; b++) {
      const norm = centred[a].norm * centred[b].norm;
      if (norm <= 0) continue;
      let sum = 0;
      for (let i = 0; i < centred[a].off.length; i++) sum += centred[a].off[i] * centred[b].off[i];
      const r = sum / norm;
      matrix[a * n + b] = r;
      matrix[b * n + a] = r;
    }
  }
  return matrix;
}

export function matrixOverRows(
  matrix: ArrayLike<number>,
  contacts: number,
  rows: readonly FieldRow[],
  scale: number
): Float32Array {
  const n = rows.length;
  const out = new Float32Array(n * n);
  rows.forEach((a, i) => {
    rows.forEach((b, j) => {
      let sum = 0;
      for (const ca of a.contacts) {
        for (const cb of b.contacts) sum += matrix[ca * contacts + cb];
      }
      out[i * n + j] = (sum / (a.contacts.length * b.contacts.length)) * scale;
    });
  });
  return out;
}
