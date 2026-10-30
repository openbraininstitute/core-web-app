import { z } from 'zod';

const datasetSchema = z.object({
  offset: z.number().int().nonnegative(),
  shape: z.array(z.number().int().nonnegative()),
  dtype: z.enum(['<i2', '<f4']),
});

const axisSchema = z.object({
  name: z.string(),
  groups: z.array(z.string()).min(1),
  /** µV per int16 unit, one per group. */
  scales: z.array(z.number()),
  /** Full resolution first, then min/max over ever more steps. */
  levels: z
    .array(
      z.object({
        step: z.number().int().positive(),
        kind: z.enum(['value', 'min_max']),
        dataset: z.string(),
      })
    )
    .min(1),
  stats: z.string(),
  psd: z.string(),
});

export const lfpSummaryIndexSchema = z.object({
  format: z.literal('lfp-summary'),
  version: z.literal(1),
  populations: z.array(z.string()),
  time: z.object({ start: z.number(), dt: z.number().positive(), steps: z.number().int() }),
  units: z.string(),
  contacts: z.number().int().nonnegative(),
  stats: z.array(z.string()),
  psd_frequencies: z.array(z.number()),
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
  /** A min/max level holds two values per bin, the lower first. */
  kind: 'value' | 'min_max';
  data: Int16Array;
  scale: number;
};

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
  const itemSize = entry.dtype === '<i2' ? 2 : 4;
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

/** A slice of a dataset's bytes, read with one range request. */
export async function readSlice(
  request: LfpSummaryRequest,
  entry: LfpDataset,
  leading: readonly number[] = [],
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const { offset, length } = sliceOf(entry, leading);
  const response = await fetch(request.url, {
    headers: { ...request.headers, Range: `bytes=${offset}-${offset + length - 1}` },
    signal,
  });
  if (!response.ok) throw new Error(`Reading the LFP summary failed (${response.status})`);
  // Else every read would download the whole file.
  if (response.status !== 206) throw new Error('The LFP summary was not read by range');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== length) throw new Error('The LFP summary was cut short');
  return bytes;
}

/** The level an axis is overviewed at: its coarsest, under the format's 2,048 bins. */
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

/** A contact's full-resolution values, with one range request. */
export async function readRow(
  request: LfpSummaryRequest,
  index: LfpSummaryIndex,
  axis: LfpAxis,
  group: number,
  contact: number,
  signal?: AbortSignal
): Promise<Int16Array> {
  const entry = datasetOf(index, axis.levels[0].dataset);
  return new Int16Array(await readSlice(request, entry, [group, contact], signal));
}

/** Contacts' full-resolution rows as one field, a row each in the order given. */
export function rowsField(
  index: LfpSummaryIndex,
  axis: LfpAxis,
  group: number,
  rows: readonly Int16Array[]
): LfpField {
  const steps = datasetOf(index, axis.levels[0].dataset).shape[2];
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
    scale: axis.scales[group],
  };
}

/** A contact's value in a bin, in µV: of a min/max bin, the one further from zero. */
export function fieldValue(field: LfpField, contact: number, bin: number): number {
  const at = contact * field.bins + bin;
  if (field.kind === 'value') return field.data[at] * field.scale;
  const low = field.data[at * 2];
  const high = field.data[at * 2 + 1];
  return (Math.abs(high) > Math.abs(low) ? high : low) * field.scale;
}

/** The bin a time falls in, clamped to the run. */
export function binAt(field: LfpField, timeMs: number): number {
  return Math.min(field.bins - 1, Math.max(0, Math.floor((timeMs - field.start) / field.binMs)));
}
