import { maxBy } from 'es-toolkit';

import { extentOf } from '@/features/circuit-viewer/morphologies/extent';
import { binMiddle } from '@/features/lfp-viewer/summary';

import type { LfpField } from '@/features/lfp-viewer/summary';

/** Bins the measurements are taken over at most: blocks of the overview's, averaged. */
const MEASURED_BINS = 512;
const MODE_ITERATIONS = 50;
const MODE_TOLERANCE = 1e-6;
/** Rows a map has at least, where there are as many contacts. */
const ROWS_AT_LEAST = 64;
/** A share of the field's variance this small, left once the shared signal is off, is rounding. */
const ROUNDING_SHARE = 1e-9;
/**
 * How far above chance a straight line has to explain the contacts' weights: a random pattern fits
 * 3 / (contacts - 1) of its variance to three axes on average, and a few contacts fit anything.
 */
const LINE_ABOVE_CHANCE = 4;
/** Rows open along the field where a straight line explains this share of the weights. */
const LINE_EXPLAINS_MOST = 0.5;
/** Differences up to this many steps of a stored field are its rounding. */
const ROUNDING_STEPS = 1;

export type RowOrder = 'along' | 'similar' | 'contacts';

export type FieldRow = {
  contacts: number[];
  /** What a click on the row picks: its contact the field swings most at. */
  lead: number;
  label: string;
};

type FieldStructure = {
  /** The share of the field's variance that all contacts have in common, from 0 to 1. */
  sharedShare: number;
  /** Per contact, its weight in the main pattern of what differs between contacts. */
  mode: Float32Array;
};

export type FieldDirection = {
  /** A unit vector whose largest component is positive. */
  axis: [number, number, number];
  /** The share of the contacts' weights a straight line along it explains, from 0 to 1. */
  explained: number;
};

function measuredValues(field: LfpField): { values: Float32Array; bins: number } {
  const bins = Math.min(field.bins, MEASURED_BINS);
  const values = new Float32Array(field.contacts * bins);
  for (let c = 0; c < field.contacts; c++) {
    for (let b = 0; b < bins; b++) {
      const from = Math.floor((b * field.bins) / bins);
      const to = Math.floor(((b + 1) * field.bins) / bins);
      let sum = 0;
      for (let i = from; i < to; i++) sum += binMiddle(field, c * field.bins + i);
      values[c * bins + b] = (sum / (to - from)) * field.scale;
    }
  }
  return { values, bins };
}

export function signOfLargest(values: ArrayLike<number>): 1 | -1 {
  let largest = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i]) > Math.abs(values[largest])) largest = i;
  }
  return values[largest] < 0 ? -1 : 1;
}

export function leadingVector(values: Float32Array, contacts: number, bins: number): Float32Array {
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
    let squares = 0;
    for (const v of next) squares += v * v;
    const norm = Math.sqrt(squares);
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
  const sign = signOfLargest(vector);
  return Float32Array.from(vector, (v) => v * sign);
}

function measuredSharedSignal(field: LfpField) {
  const { contacts } = field;
  const { values, bins } = measuredValues(field);
  let grand = 0;
  for (const v of values) grand += v;
  grand /= values.length;

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
  return { values, bins, shared, total, sharedShare: total === 0 ? 1 : common / total };
}

/** The part of a field's variance that every contact shares. */
export const sharedShareOf = (field: LfpField) => measuredSharedSignal(field).sharedShare;

export function describeField(field: LfpField): FieldStructure {
  const { contacts } = field;
  const { values, bins, shared, total, sharedShare } = measuredSharedSignal(field);
  const residual = new Float32Array(values.length);
  let left = 0;
  for (let c = 0; c < contacts; c++) {
    for (let b = 0; b < bins; b++) {
      const v = values[c * bins + b] - shared[b];
      residual[c * bins + b] = v;
      left += v * v;
    }
  }
  return {
    sharedShare,
    mode:
      left <= total * ROUNDING_SHARE
        ? new Float32Array(contacts)
        : leadingVector(residual, contacts, bins),
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

export function fieldDirection(mode: Float32Array, positions: Float32Array): FieldDirection | null {
  const centre = extentOf(positions)?.mean;
  if (!centre) return null;
  const a = [0, 1, 2].map(() => [0, 0, 0]);
  const b = [0, 0, 0];
  const n = mode.length;
  let meanWeight = 0;
  for (const weight of mode) meanWeight += weight / n;
  let weights = 0;
  for (let c = 0; c < n; c++) {
    weights += (mode[c] - meanWeight) ** 2;
    for (let i = 0; i < 3; i++) {
      const pi = positions[c * 3 + i] - centre[i];
      b[i] += pi * mode[c];
      for (let j = 0; j < 3; j++) a[i][j] += pi * (positions[c * 3 + j] - centre[j]);
    }
  }
  const trace = a[0][0] + a[1][1] + a[2][2];
  if (trace === 0) return null;
  // An array that is a line or a plane gives a line within it: this keeps its missing axes at zero.
  for (let i = 0; i < 3; i++) a[i][i] += trace * 1e-6;
  const solved = solve3(a, b);
  if (!solved) return null;
  const norm = Math.hypot(...solved);
  if (norm === 0) return null;
  const explained = (solved[0] * b[0] + solved[1] * b[1] + solved[2] * b[2]) / weights;
  if (explained < LINE_ABOVE_CHANCE * (3 / (n - 1))) return null;
  const sign = signOfLargest(solved);
  return {
    axis: [(solved[0] * sign) / norm, (solved[1] * sign) / norm, (solved[2] * sign) / norm],
    explained,
  };
}

export function openingOrder({ mode }: FieldStructure, direction: FieldDirection | null): RowOrder {
  if (direction && direction.explained >= LINE_EXPLAINS_MOST) return 'along';
  return mode.length > ROWS_AT_LEAST && mode.some((weight) => weight !== 0)
    ? 'similar'
    : 'contacts';
}

export function coordinatesAlong(
  positions: Float32Array,
  direction: readonly [number, number, number]
): Float32Array {
  const centre = extentOf(positions)?.mean ?? [0, 0, 0];
  return Float32Array.from({ length: positions.length / 3 }, (_, c) => {
    let along = 0;
    for (let k = 0; k < 3; k++) along += (positions[c * 3 + k] - centre[k]) * direction[k];
    return along;
  });
}

function signedMicrons(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded)} µm`;
}

export function buildRows(
  contacts: number,
  coordinate: Float32Array | null,
  unit: 'microns' | 'place',
  swing: (contact: number) => number
): FieldRow[] {
  const order = Array.from({ length: contacts }, (_, c) => c);
  if (coordinate) order.sort((a, b) => coordinate[b] - coordinate[a] || a - b);
  const count = Math.min(contacts, Math.max(ROWS_AT_LEAST, Math.ceil(Math.sqrt(contacts))));
  return Array.from({ length: count }, (_, r) => {
    const members = order.slice(
      Math.floor((r * contacts) / count),
      Math.floor(((r + 1) * contacts) / count)
    );
    const middle = members[Math.floor(members.length / 2)];
    let label = `e${members[0]}`;
    if (contacts > count && coordinate) {
      label = unit === 'microns' ? signedMicrons(coordinate[middle]) : `#${r + 1}`;
    }
    return { contacts: members, lead: maxBy(members, swing) ?? members[0], label };
  });
}

export function fieldRows(
  order: RowOrder,
  { mode }: FieldStructure,
  positions: Float32Array | null,
  direction: FieldDirection | null,
  swing: (contact: number) => number
): FieldRow[] {
  if (order === 'along' && positions && direction) {
    return buildRows(mode.length, coordinatesAlong(positions, direction.axis), 'microns', swing);
  }
  return buildRows(mode.length, order === 'similar' ? mode : null, 'place', swing);
}

/** What each trace is called: where it lies along the field, unless two traced lie alike. */
export function traceLabels(traces: readonly number[], along: Float32Array | null): string[] {
  const microns = along && traces.map((c) => signedMicrons(along[c]));
  return microns && new Set(microns).size === microns.length ? microns : traces.map((c) => `e${c}`);
}

/** Each trace's height in px, for those that scroll: Fit has every one in the pane. */
export const LANE_HEIGHTS = { fit: null, small: 16, medium: 32, large: 64 } as const;
export type LaneHeight = keyof typeof LANE_HEIGHTS;
/** Above this many traces they open at Small, scrolling, as Fit would squeeze them. */
const FIT_AT_MOST = 64;

/** The height picked, or until one is, Fit for as few traces as it shows well and Small for more. */
export function laneHeightOf(chosen: LaneHeight | null, traced: number): LaneHeight {
  return chosen ?? (traced > FIT_AT_MOST ? 'small' : 'fit');
}

// The ticked alone, or every contact while none are, as the spike raster and a voltage report draw theirs;
// in the rows' order, so that both views read from top to bottom alike.
export function tracedContacts(rows: readonly FieldRow[], ticked: readonly number[]): number[] {
  const ordered = rows.flatMap((row) => row.contacts);
  if (ticked.length === 0) return ordered;
  const shown = new Set(ticked);
  return ordered.filter((c) => shown.has(c));
}

export function withoutShared(field: LfpField): LfpField {
  const { contacts, bins, kind, data } = field;
  const perContact = bins * (kind === 'min_max' ? 2 : 1);
  const mean = new Float64Array(perContact);
  for (let c = 0; c < contacts; c++) {
    for (let i = 0; i < perContact; i++) mean[i] += data[c * perContact + i];
  }
  // Summed first: a signal every contact shares then leaves exactly nothing, not rounding noise.
  for (let i = 0; i < perContact; i++) mean[i] /= contacts;

  let largest = 0;
  for (let at = 0; at < data.length; at++) {
    largest = Math.max(largest, Math.abs(data[at] - mean[at % perContact]));
  }
  if (largest <= ROUNDING_STEPS) return { ...field, data: new Int16Array(data.length) };
  // A scale of its own: what is left can be far smaller than what was shared.
  const stretch = 32767 / largest;
  const residual = new Int16Array(data.length);
  for (let at = 0; at < data.length; at++) {
    residual[at] = Math.round((data[at] - mean[at % perContact]) * stretch);
  }
  if (kind === 'min_max') {
    // Taken off each end apart, the ends can cross.
    for (let low = 0; low < residual.length; low += 2) {
      if (residual[low] > residual[low + 1]) {
        const swap = residual[low];
        residual[low] = residual[low + 1];
        residual[low + 1] = swap;
      }
    }
  }
  return { ...field, scale: field.scale / stretch, data: residual };
}
