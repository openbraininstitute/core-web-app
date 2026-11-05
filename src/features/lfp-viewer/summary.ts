import { z } from 'zod';

import { ApiError } from '@/api/error';

const datasetSchema = z.object({
  offset: z.number().int().nonnegative(),
  shape: z.array(z.number().int().nonnegative()),
  dtype: z.enum(['<i2', '<f4', '<u8']),
});

const ITEM_BYTES = { '<i2': 2, '<f4': 4, '<u8': 8 };

const axisSchema = z.object({
  name: z.string(),
  groups: z.array(z.string()).min(1),
  /** µV per int16 unit, one per group. */
  scales: z.array(z.number()),
  /** A group's part in the total's variance; only groups have it. */
  shares: z.array(z.number()).optional(),
  /** Full resolution first, then the overview: the total's by min/max over ever more steps, a group's by means, which add up. */
  levels: z
    .array(
      z.object({
        step: z.number().int().positive(),
        kind: z.enum(['value', 'mean', 'min_max']),
        dataset: z.string(),
        /** Where its rows lie, each deflated in a chunk of its own, if they are. */
        chunks: z.string().optional(),
      })
    )
    .min(1),
  stats: z.string(),
  psd: z.string(),
  psd_frequencies: z.array(z.number()),
});

export const lfpSummaryIndexSchema = z.object({
  format: z.literal('lfp-summary'),
  version: z.literal(2),
  populations: z.array(z.string()),
  time: z.object({ start: z.number(), dt: z.number().positive(), steps: z.number().int() }),
  units: z.string(),
  contacts: z.number().int().nonnegative(),
  stats: z.array(z.string()),
  axes: z.array(axisSchema).min(1),
  correlation: z.object({ dataset: z.string(), scale: z.number() }).optional(),
  datasets: z.record(z.string(), datasetSchema),
});

export type LfpSummaryIndex = z.infer<typeof lfpSummaryIndexSchema>;
export type LfpDataset = z.infer<typeof datasetSchema>;
export type LfpAxis = z.infer<typeof axisSchema>;
export type LfpSummaryRequest = { url: string; headers: Record<string, string> };

/** One group's field over every contact, at one level: µV = data × scale. */
export type LfpField = {
  contacts: number;
  bins: number;
  /** Simulated milliseconds per bin. */
  binMs: number;
  start: number;
  /** A value per step, or per bin as a mean. A min/max level holds two per bin, the lower first. */
  kind: 'value' | 'mean' | 'min_max';
  data: Int16Array;
  scale: number;
};

/** Per contact: the index's `stats` columns, and the power at each of the axis's `psd_frequencies`, in µV²/Hz. */
export type GroupStats = { stats: Float32Array; psd: Float32Array };

export function datasetOf(index: LfpSummaryIndex, name: string): LfpDataset {
  const entry = index.datasets[name];
  if (!entry) throw new Error(`The LFP summary has no dataset ${name}`);
  return entry;
}

/**
 * Where a slice of a row-major dataset lies in the file: the leading indices
 * fixed, the last of them spanning `count`.
 */
export function sliceOf(
  entry: LfpDataset,
  leading: readonly number[],
  count = 1
): { offset: number; length: number; shape: number[] } {
  const itemSize = ITEM_BYTES[entry.dtype];
  const strides = entry.shape.map((_, i) => entry.shape.slice(i + 1).reduce((a, b) => a * b, 1));
  if (leading.length === 0) {
    return {
      offset: entry.offset,
      length: entry.shape.reduce((a, b) => a * b, 1) * itemSize,
      shape: entry.shape,
    };
  }
  const k = leading.length;
  if (
    leading.some((at, i) => at < 0 || at >= entry.shape[i]) ||
    leading[k - 1] + count > entry.shape[k - 1]
  ) {
    throw new RangeError(`Slice [${leading}] × ${count} is outside [${entry.shape}]`);
  }
  const first = leading.reduce((sum, at, i) => sum + at * strides[i], 0);
  return {
    offset: entry.offset + first * itemSize,
    length: count * strides[k - 1] * itemSize,
    shape: [count, ...entry.shape.slice(k)],
  };
}

/** The summary was built again since its status was read: its offsets are another file's. */
export class LfpSummaryChangedError extends Error {
  constructor() {
    super('The LFP summary has changed');
    this.name = 'LfpSummaryChangedError';
  }
}

export function isLfpSummaryChanged(error: unknown) {
  return (
    error instanceof LfpSummaryChangedError ||
    (error instanceof ApiError && error.cause?.status === 412)
  );
}

async function readRange(
  request: LfpSummaryRequest,
  offset: number,
  length: number,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const response = await fetch(request.url, {
    headers: { ...request.headers, Range: `bytes=${offset}-${offset + length - 1}` },
    signal,
  });
  if (response.status === 412) throw new LfpSummaryChangedError();
  if (!response.ok) throw new Error(`Reading the LFP summary failed (${response.status})`);
  // Else every read would download the whole file.
  if (response.status !== 206) throw new Error('The LFP summary was not read by range');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== length) throw new Error('The LFP summary was cut short');
  return bytes;
}

/** A slice of a dataset's bytes, read with one range request. */
export function readSlice(
  request: LfpSummaryRequest,
  entry: LfpDataset,
  leading: readonly number[] = [],
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const { offset, length } = sliceOf(entry, leading);
  return readRange(request, offset, length, signal);
}

/** A chunk's int16 values: HDF5's deflate and shuffle filters undone. */
export async function inflateRow(chunk: ArrayBuffer): Promise<Int16Array> {
  const stream = new Response(chunk).body?.pipeThrough(new DecompressionStream('deflate'));
  const shuffled = new Uint8Array(await new Response(stream).arrayBuffer());
  const steps = shuffled.length / 2;
  const row = new Int16Array(steps);
  for (let i = 0; i < steps; i++) row[i] = shuffled[i] | (shuffled[steps + i] << 8);
  return row;
}

/** Where an axis's rows lie: group × contact × (offset, size). Null if they are not in chunks. */
export async function readChunkTable(
  request: LfpSummaryRequest,
  index: LfpSummaryIndex,
  axis: LfpAxis
): Promise<BigUint64Array | null> {
  const { chunks } = axis.levels[0];
  if (!chunks) return null;
  return new BigUint64Array(await readSlice(request, datasetOf(index, chunks)));
}

/** The level an axis is overviewed at: its coarsest, at most the format's 2,048 bins. */
export function overviewLevel(axis: LfpAxis) {
  return axis.levels[axis.levels.length - 1];
}

/** A group's whole field at a level, every contact. */
export async function readField(
  request: LfpSummaryRequest,
  index: LfpSummaryIndex,
  axis: LfpAxis,
  group: number,
  level: LfpAxis['levels'][number],
  signal?: AbortSignal
): Promise<LfpField> {
  const entry = datasetOf(index, level.dataset);
  const data = new Int16Array(await readSlice(request, entry, [group], signal));
  return {
    contacts: entry.shape[1],
    bins: entry.shape[2],
    binMs: level.step * index.time.dt,
    start: index.time.start,
    kind: level.kind,
    data,
    scale: axis.scales[group],
  };
}

/** A group's stats and spectra, each per contact. */
export async function readGroupStats(
  request: LfpSummaryRequest,
  index: LfpSummaryIndex,
  axis: LfpAxis,
  group: number,
  signal?: AbortSignal
): Promise<GroupStats> {
  const [stats, psd] = await Promise.all([
    readSlice(request, datasetOf(index, axis.stats), [group], signal),
    readSlice(request, datasetOf(index, axis.psd), [group], signal),
  ]);
  return { stats: new Float32Array(stats), psd: new Float32Array(psd) };
}

/** A contact's full-resolution values, with one range request. */
export async function readRow(
  request: LfpSummaryRequest,
  index: LfpSummaryIndex,
  axis: LfpAxis,
  group: number,
  contact: number,
  table: BigUint64Array | null,
  signal?: AbortSignal
): Promise<Int16Array> {
  if (table) {
    const at = (group * index.contacts + contact) * 2;
    const chunk = await readRange(request, Number(table[at]), Number(table[at + 1]), signal);
    return inflateRow(chunk);
  }
  const entry = datasetOf(index, axis.levels[0].dataset);
  return new Int16Array(await readSlice(request, entry, [group, contact], signal));
}

/** Contacts' full-resolution rows as one field, a row each in the order given. */
export function rowsField(
  index: LfpSummaryIndex,
  scale: number,
  rows: readonly Int16Array[]
): LfpField {
  const { steps } = index.time;
  const data = new Int16Array(rows.length * steps);
  rows.forEach((row, i) => {
    data.set(row, i * steps);
  });
  return {
    contacts: rows.length,
    bins: steps,
    binMs: index.time.dt,
    start: index.time.start,
    kind: 'value',
    data,
    scale,
  };
}

/**
 * Fields of one shape added up, as µV can be and a min/max level's can't. Each group has a
 * scale of its own, so the sum takes one of its own too.
 */
export function sumFields(fields: readonly LfpField[]): LfpField {
  if (fields.length === 1) return fields[0];
  const sum = new Float64Array(fields[0].data.length);
  for (const { data, scale } of fields) {
    for (let i = 0; i < sum.length; i++) sum[i] += data[i] * scale;
  }
  let peak = 0;
  for (const value of sum) peak = Math.max(peak, Math.abs(value));
  const scale = peak > 0 ? peak / 32767 : 1;
  const data = new Int16Array(sum.length);
  for (let i = 0; i < sum.length; i++) data[i] = Math.round(sum[i] / scale);
  return { ...fields[0], scale, data };
}

/** A field's stats, per contact in the order of `names`, from its values as they stand. */
export function fieldStats(field: LfpField, names: readonly string[]): Float32Array {
  const stats = new Float32Array(field.contacts * names.length);
  for (let c = 0; c < field.contacts; c++) {
    let low = Infinity;
    let high = -Infinity;
    let lowest = 0;
    let sum = 0;
    let squares = 0;
    for (let b = 0; b < field.bins; b++) {
      const value = fieldValue(field, c, b);
      if (value < low) {
        low = value;
        lowest = b;
      }
      high = Math.max(high, value);
      sum += value;
      squares += value * value;
    }
    const measures: Record<string, number> = {
      min: low,
      max: high,
      ptp: high - low,
      rms: Math.sqrt(squares / field.bins),
      mean: sum / field.bins,
      trough_ms: field.start + lowest * field.binMs,
    };
    names.forEach((name, i) => {
      stats[c * names.length + i] = measures[name] ?? 0;
    });
  }
  return stats;
}

/** A contact's value in a bin, in µV: of a min/max bin, the one further from zero. */
export function fieldValue(field: LfpField, contact: number, bin: number): number {
  const at = contact * field.bins + bin;
  if (field.kind !== 'min_max') return field.data[at] * field.scale;
  const low = field.data[at * 2];
  const high = field.data[at * 2 + 1];
  return (Math.abs(high) > Math.abs(low) ? high : low) * field.scale;
}

/** A bin's value as stored, by the field's scale: of a min/max bin, the middle of the two. */
export function binMiddle({ kind, data }: LfpField, at: number): number {
  return kind === 'min_max' ? (data[at * 2] + data[at * 2 + 1]) / 2 : data[at];
}

/** The bin a time falls in, clamped to the run. */
export function binAt(field: LfpField, timeMs: number): number {
  return Math.min(field.bins - 1, Math.max(0, Math.floor((timeMs - field.start) / field.binMs)));
}
