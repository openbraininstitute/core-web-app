import type { FieldRow } from '@/features/lfp-viewer/field-structure';
import type { LfpField } from '@/features/lfp-viewer/summary';

const MAX_SPECTROGRAM_COLUMNS = 600;
const MIN_SPECTROGRAM_SEGMENT = 32;
const MAX_SPECTROGRAM_SEGMENT = 4096;
const MIN_COHERENCE_SEGMENT = 64;
const MAX_COHERENCE_SEGMENT = 1 << 14;
/** Coherence is 1 at every frequency from a single segment, so it needs many. */
const COHERENCE_SEGMENTS = 16;
const MAX_COHERENCE_AVERAGES = 256;
const MAX_TRIGGERS = 10_000;
const MAX_CSD_COLUMNS = 1024;
/** Fewer contacts on a line leave too few second differences to read a profile from. */
const MIN_LINE_CONTACTS = 5;
/** How far a contact can lie from a line and still be on it. */
const ON_LINE_UM = 1;
/** How far a gap can differ from the line's typical one, as a share of it. */
const EVEN_GAP_SHARE = 0.05;
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

function hann(n: number): Float64Array {
  return Float64Array.from({ length: n }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n));
}

function powerOfTwoBelow(value: number): number {
  return 2 ** Math.floor(Math.log2(Math.max(1, value)));
}

/** A segment of `values` at `from`, its mean off and windowed, into `re`, with `im` cleared. */
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
  const hop = Math.max(
    segment / 4,
    Math.ceil((steps - segment) / (MAX_SPECTROGRAM_COLUMNS - 1)) || 1
  );
  const columns = Math.floor((steps - segment) / hop) + 1;
  const bands = segment / 2 + 1;
  const fs = 1000 / dtMs;
  const window = hann(segment);
  let squares = 0;
  for (const w of window) squares += w * w;
  const norm = (scale * scale) / (fs * squares);

  const re = new Float64Array(segment);
  const im = new Float64Array(segment);
  const decibels = new Float32Array(columns * bands);
  for (let column = 0; column < columns; column++) {
    loadSegment(row, column * hop, window, re, im);
    fft(re, im);
    for (let band = 0; band < bands; band++) {
      const edge = band === 0 || band === bands - 1;
      const density = (re[band] * re[band] + im[band] * im[band]) * norm * (edge ? 1 : 2);
      decibels[band * columns + column] = 10 * Math.log10(Math.max(density, 1e-30));
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
  if (steps < n * 2) return null;
  const available = Math.floor((steps - n) / (n / 2)) + 1;
  const segments = Math.min(available, MAX_COHERENCE_AVERAGES);
  const hop = Math.floor((steps - n) / Math.max(1, segments - 1));
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
  /** The standard error of each mean. */
  errors: Float32Array[];
  /** How many triggers went in: those with their whole window inside the run, at most 10,000. */
  triggers: number;
  /** How many separate moments they fall at, half a window apart: a volley is one, however many spikes. */
  events: number;
};

function separateEvents(centres: readonly number[], apart: number): number {
  const sorted = [...centres].sort((a, b) => a - b);
  let events = 0;
  let last = -Infinity;
  for (const centre of sorted) {
    if (centre - last >= apart) {
      events++;
      last = centre;
    }
  }
  return events;
}

/** The field around each trigger, averaged: `field` at full resolution, a row per contact. */
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
  const errors: Float32Array[] = [];
  for (let contact = 0; contact < field.contacts; contact++) {
    const sum = new Float64Array(length);
    const squares = new Float64Array(length);
    const row = contact * field.bins;
    for (const centre of picked) {
      const first = row + centre - half;
      for (let i = 0; i < length; i++) {
        const v = field.data[first + i] * field.scale;
        sum[i] += v;
        squares[i] += v * v;
      }
    }
    means.push(Float32Array.from(sum, (s) => (count > 0 ? s / count : 0)));
    errors.push(
      Float32Array.from(sum, (s, i) => {
        if (count < 2) return 0;
        const variance = (squares[i] - (s * s) / count) / (count - 1);
        return Math.sqrt(Math.max(0, variance) / count);
      })
    );
  }
  return {
    lags: Float64Array.from({ length }, (_, i) => (i - half) * field.binMs),
    means,
    errors,
    triggers: picked.length,
    events: separateEvents(picked, half),
  };
}

/** The axis contacts spread along most, its largest component positive. Null if they don't. */
export function arrayAxis(positions: Float32Array): [number, number, number] | null {
  const count = positions.length / 3;
  const mean = [0, 0, 0];
  for (let c = 0; c < count; c++) {
    for (let k = 0; k < 3; k++) mean[k] += positions[c * 3 + k] / count;
  }
  const covariance = new Float64Array(9);
  for (let c = 0; c < count; c++) {
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) {
        covariance[a * 3 + b] +=
          (positions[c * 3 + a] - mean[a]) * (positions[c * 3 + b] - mean[b]);
      }
    }
  }
  if (covariance[0] + covariance[4] + covariance[8] <= 0) return null;
  // Off every axis at the start, which a covariance's main axis can be orthogonal to otherwise.
  let axis = [0.57, 0.58, 0.59];
  for (let iteration = 0; iteration < 100; iteration++) {
    const next = [0, 1, 2].map(
      (a) =>
        covariance[a * 3] * axis[0] +
        covariance[a * 3 + 1] * axis[1] +
        covariance[a * 3 + 2] * axis[2]
    );
    const norm = Math.hypot(next[0], next[1], next[2]);
    if (norm === 0) return null;
    axis = next.map((v) => v / norm);
  }
  const largest = axis.reduce((best, v) => (Math.abs(v) > Math.abs(best) ? v : best), 0);
  const sign = largest < 0 ? -1 : 1;
  return [axis[0] * sign, axis[1] * sign, axis[2] * sign];
}

export type ContactLine = {
  /** Along the line, from its lowest coordinate. */
  contacts: number[];
  /** The gap between neighbours, in µm. */
  spacing: number;
};

/**
 * The evenly spaced lines of contacts along the array's main axis, as a probe
 * has one of and a grid many: what a second derivative along that axis can be
 * read from. Empty where contacts are scattered.
 */
export function contactLines(positions: Float32Array): ContactLine[] {
  const axis = arrayAxis(positions);
  if (!axis) return [];
  const count = positions.length / 3;
  const groups: { offset: [number, number, number]; members: { contact: number; at: number }[] }[] =
    [];
  for (let c = 0; c < count; c++) {
    const at =
      positions[c * 3] * axis[0] + positions[c * 3 + 1] * axis[1] + positions[c * 3 + 2] * axis[2];
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
    const spacing = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
    if (spacing <= 0) continue;
    if (gaps.every((gap) => Math.abs(gap - spacing) <= spacing * EVEN_GAP_SHARE)) {
      lines.push({ contacts: members.map((m) => m.contact), spacing });
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
  const values = new Float32Array(rows * columns);
  for (let r = 0; r < rows; r++) {
    const above = r * bins;
    const at = (r + 1) * bins;
    const below = (r + 2) * bins;
    let total = 0;
    for (let b = 0; b < bins; b++) total += data[above + b] - 2 * data[at + b] + data[below + b];
    const mean = total / bins;
    for (let column = 0; column < columns; column++) {
      const from = Math.floor((column * bins) / columns);
      const to = Math.floor(((column + 1) * bins) / columns);
      let sum = 0;
      for (let b = from; b < to; b++) sum += data[above + b] - 2 * data[at + b] + data[below + b];
      values[r * columns + column] = (sum / (to - from) - mean) * perStep;
    }
  }
  return {
    times: Float64Array.from(
      { length: columns },
      (_, column) => field.start + ((column + 0.5) * (bins * field.binMs)) / columns
    ),
    values,
    rows,
  };
}

export type ProfilePoint = { at: number; value: number };

/**
 * A value over positions along an axis, from low to high: each contact's where
 * there are few places, else their means over at most 64 stretches of the axis.
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
  const bins = high > low ? MAX_PROFILE_BINS : 1;
  const atSum = new Float64Array(bins);
  const valueSum = new Float64Array(bins);
  const inBin = new Uint32Array(bins);
  for (let c = 0; c < count; c++) {
    const bin =
      high > low
        ? Math.min(bins - 1, Math.floor(((coordinate[c] - low) / (high - low)) * bins))
        : 0;
    atSum[bin] += coordinate[c];
    valueSum[bin] += value(c);
    inBin[bin]++;
  }
  const points: ProfilePoint[] = [];
  for (let bin = 0; bin < bins; bin++) {
    if (inBin[bin] > 0)
      points.push({ at: atSum[bin] / inBin[bin], value: valueSum[bin] / inBin[bin] });
  }
  return points;
}

function rowSignals(field: LfpField, rows: readonly FieldRow[]): Float64Array[] {
  const { bins, kind, data } = field;
  return rows.map((row) => {
    const signal = new Float64Array(bins);
    for (const contact of row.contacts) {
      for (let b = 0; b < bins; b++) {
        const at = contact * bins + b;
        signal[b] += kind === 'value' ? data[at] : (data[at * 2] + data[at * 2 + 1]) / 2;
      }
    }
    return signal;
  });
}

/** The correlation between rows' mean signals in `field`, row-major. */
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
      let sum = 0;
      if (norm > 0) {
        for (let i = 0; i < centred[a].off.length; i++)
          sum += centred[a].off[i] * centred[b].off[i];
      }
      const r = norm > 0 ? sum / norm : 0;
      matrix[a * n + b] = r;
      matrix[b * n + a] = r;
    }
  }
  return matrix;
}

/** A contact × contact matrix as rows × rows: the mean over each pair of rows' contacts. */
export function matrixOverRows(
  matrix: ArrayLike<number>,
  contacts: number,
  rows: readonly FieldRow[],
  scale = 1
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
