import type { LfpField } from '@/features/lfp-viewer/summary';

/** Bins the measurements are taken over at most: blocks of the overview's, averaged. */
const MEASURED_BINS = 512;
const MODE_ITERATIONS = 50;
const MODE_TOLERANCE = 1e-6;
/** Above this many contacts, rows are bins of contacts. */
const CONTACTS_PER_ROW_ABOVE = 64;

export type RowOrder = 'along' | 'similar' | 'contacts';

export type FieldRow = {
  contacts: number[];
  /** What a click on the row picks: its contact the field swings most at. */
  lead: number;
  label: string;
};

export type FieldStructure = {
  /** The share of the field's variance that all contacts have in common, from 0 to 1. */
  sharedShare: number;
  /** Per contact, its weight in the main pattern of what differs between contacts. */
  mode: Float32Array;
};

/** The field at bin midpoints, averaged into at most `MEASURED_BINS` bins: contact × bin. */
function measuredValues(field: LfpField): { values: Float32Array; bins: number } {
  const bins = Math.min(field.bins, MEASURED_BINS);
  const values = new Float32Array(field.contacts * bins);
  for (let c = 0; c < field.contacts; c++) {
    for (let b = 0; b < bins; b++) {
      const from = Math.floor((b * field.bins) / bins);
      const to = Math.floor(((b + 1) * field.bins) / bins);
      let sum = 0;
      for (let i = from; i < to; i++) {
        const at = c * field.bins + i;
        sum +=
          field.kind === 'value'
            ? field.data[at]
            : (field.data[at * 2] + field.data[at * 2 + 1]) / 2;
      }
      values[c * bins + b] = (sum / (to - from)) * field.scale;
    }
  }
  return { values, bins };
}

/** The leading right singular vector of contact × bin values, by power iteration on them. */
function leadingVector(values: Float32Array, contacts: number, bins: number): Float32Array {
  // Deterministic and with no symmetry the field could share.
  let vector = Float64Array.from({ length: contacts }, (_, c) => 1 + ((c * 7919) % 101) / 101);
  const inBins = new Float64Array(bins);
  for (let iteration = 0; iteration < MODE_ITERATIONS; iteration++) {
    inBins.fill(0);
    for (let c = 0; c < contacts; c++) {
      const row = c * bins;
      for (let b = 0; b < bins; b++) inBins[b] += values[row + b] * vector[c];
    }
    const next = new Float64Array(contacts);
    for (let c = 0; c < contacts; c++) {
      const row = c * bins;
      let sum = 0;
      for (let b = 0; b < bins; b++) sum += values[row + b] * inBins[b];
      next[c] = sum;
    }
    const norm = Math.hypot(...next);
    if (norm === 0) break;
    let change = 0;
    for (let c = 0; c < contacts; c++) {
      next[c] /= norm;
      change += Math.abs(next[c] - vector[c]);
    }
    vector = next;
    if (change < MODE_TOLERANCE) break;
  }
  // Its sign is arbitrary: fixed, so that a map does not flip between visits.
  let largest = 0;
  for (let c = 1; c < contacts; c++) {
    if (Math.abs(vector[c]) > Math.abs(vector[largest])) largest = c;
  }
  const sign = vector[largest] < 0 ? -1 : 1;
  return Float32Array.from(vector, (v) => v * sign);
}

export function describeField(field: LfpField): FieldStructure {
  const { contacts } = field;
  const { values, bins } = measuredValues(field);
  let grand = 0;
  for (const v of values) grand += v;
  grand /= values.length || 1;

  const shared = new Float64Array(bins);
  let total = 0;
  for (let c = 0; c < contacts; c++) {
    for (let b = 0; b < bins; b++) {
      const v = values[c * bins + b];
      shared[b] += v / contacts;
      total += (v - grand) ** 2;
    }
  }
  let common = 0;
  for (const v of shared) common += contacts * (v - grand) ** 2;

  const residual = new Float32Array(values.length);
  for (let c = 0; c < contacts; c++) {
    for (let b = 0; b < bins; b++) residual[c * bins + b] = values[c * bins + b] - shared[b];
  }
  return {
    sharedShare: total === 0 ? 1 : common / total,
    mode: leadingVector(residual, contacts, bins),
  };
}

function solve3(a: number[][], b: number[]): number[] | null {
  const det = (m: number[][]) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const whole = det(a);
  if (whole === 0) return null;
  return b.map((_, i) => det(a.map((row, r) => row.map((v, c) => (c === i ? b[r] : v)))) / whole);
}

/**
 * The straight line through the array the contacts' weights change along: a unit vector whose
 * largest component is positive, or null where they do not change with position. An array that
 * is a line or a plane gives a line within it: the small ridge keeps its missing axes at zero.
 */
export function fieldDirection(
  mode: Float32Array,
  positions: Float32Array
): [number, number, number] | null {
  const n = mode.length;
  const centre = [0, 0, 0];
  for (let c = 0; c < n; c++) {
    for (let k = 0; k < 3; k++) centre[k] += positions[c * 3 + k] / n;
  }
  const a = [0, 1, 2].map(() => [0, 0, 0]);
  const b = [0, 0, 0];
  for (let c = 0; c < n; c++) {
    for (let i = 0; i < 3; i++) {
      const pi = positions[c * 3 + i] - centre[i];
      b[i] += pi * mode[c];
      for (let j = 0; j < 3; j++) a[i][j] += pi * (positions[c * 3 + j] - centre[j]);
    }
  }
  const trace = a[0][0] + a[1][1] + a[2][2];
  if (trace === 0) return null;
  for (let i = 0; i < 3; i++) a[i][i] += trace * 1e-6;
  const solved = solve3(a, b);
  if (!solved) return null;
  const norm = Math.hypot(...solved);
  if (norm === 0) return null;
  const largest = solved.reduce(
    (best, v, i) => (Math.abs(v) > Math.abs(solved[best]) ? i : best),
    0
  );
  const sign = solved[largest] < 0 ? -1 : 1;
  return [(solved[0] * sign) / norm, (solved[1] * sign) / norm, (solved[2] * sign) / norm];
}

/** Each contact's distance along a direction through the array's centre, in its units. */
export function coordinatesAlong(
  positions: Float32Array,
  direction: readonly [number, number, number]
): Float32Array {
  const n = positions.length / 3;
  const centre = [0, 0, 0];
  for (let c = 0; c < n; c++) {
    for (let k = 0; k < 3; k++) centre[k] += positions[c * 3 + k] / n;
  }
  return Float32Array.from({ length: n }, (_, c) => {
    let along = 0;
    for (let k = 0; k < 3; k++) along += (positions[c * 3 + k] - centre[k]) * direction[k];
    return along;
  });
}

function signedMicrons(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded)} µm`;
}

/**
 * The map's rows, top to bottom: the contacts from highest `coordinate` to lowest, or in their
 * own order without one. Each contact is a row up to `CONTACTS_PER_ROW_ABOVE`; past that, rows
 * hold as many contacts each. A row of many is named by `unit`: its middle µm, or its place.
 */
export function buildRows(
  contacts: number,
  coordinate: Float32Array | null,
  unit: 'microns' | 'place',
  swing: (contact: number) => number
): FieldRow[] {
  const order = Array.from({ length: contacts }, (_, c) => c);
  if (coordinate) order.sort((a, b) => coordinate[b] - coordinate[a] || a - b);
  const count =
    contacts <= CONTACTS_PER_ROW_ABOVE ? contacts : Math.max(1, Math.ceil(Math.sqrt(contacts)));
  return Array.from({ length: count }, (_, r) => {
    const members = order.slice(
      Math.floor((r * contacts) / count),
      Math.floor(((r + 1) * contacts) / count)
    );
    const middle = members[Math.floor(members.length / 2)];
    let lead = members[0];
    for (const c of members) if (swing(c) > swing(lead)) lead = c;
    let label = `e${members[0]}`;
    if (members.length > 1 && coordinate) {
      label = unit === 'microns' ? signedMicrons(coordinate[middle]) : `#${r + 1}`;
    }
    return { contacts: members, lead, label };
  });
}

/**
 * What differs between contacts: the mean across contacts taken off each bin, in a field of its
 * own scale since what is left can be far smaller than what was shared.
 */
export function withoutShared(field: LfpField): LfpField {
  const { contacts, bins, kind } = field;
  const perBin = kind === 'value' ? 1 : 2;
  const mean = new Float64Array(bins * perBin);
  for (let c = 0; c < contacts; c++) {
    for (let i = 0; i < mean.length; i++) mean[i] += field.data[c * mean.length + i] / contacts;
  }
  const residual = new Float64Array(field.data.length);
  let largest = 0;
  for (let c = 0; c < contacts; c++) {
    for (let b = 0; b < bins; b++) {
      for (let k = 0; k < perBin; k++) {
        const i = b * perBin + k;
        const at = c * mean.length + i;
        residual[at] = (field.data[at] - mean[i]) * field.scale;
        largest = Math.max(largest, Math.abs(residual[at]));
      }
      if (perBin === 2) {
        const low = c * mean.length + b * 2;
        // Taken off each end apart, the ends can cross.
        if (residual[low] > residual[low + 1]) {
          const swap = residual[low];
          residual[low] = residual[low + 1];
          residual[low + 1] = swap;
        }
      }
    }
  }
  const scale = largest > 0 ? largest / 32767 : field.scale;
  return { ...field, scale, data: Int16Array.from(residual, (v) => Math.round(v / scale)) };
}
