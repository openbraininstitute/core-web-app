import { z } from 'zod';

import { ApiError } from '@/api/error';

const datasetSchema = z.object({
  offset: z.number().int().nonnegative(),
  shape: z.array(z.number().int().nonnegative()),
  dtype: z.enum(['<i2', '<f4', '<u8']),
});

const ITEM_BYTES = { '<i2': 2, '<f4': 4, '<u8': 8 };

/** Past Starlette's 100 ranges a request is answered with the whole file. */
const MAX_RANGES_PER_REQUEST = 100;

const axisSchema = z.object({
  name: z.string(),
  groups: z.array(z.string()).min(1),
  /** µV per int16 unit, one per group. */
  scales: z.array(z.number()),
  /** A group's part in the total's variance. */
  shares: z.array(z.number()),
  /** Full resolution, then the overview if that is too long: the total's by min/max, a group's by means, which add up. */
  levels: z
    .array(
      z.object({
        step: z.number().int().positive(),
        kind: z.enum(['value', 'mean', 'min_max']),
        dataset: z.string(),
        /** Where its rows lie, each deflated in a chunk of its own: only with an overview to read them for. */
        chunks: z.string().optional(),
      })
    )
    .min(1),
  stats: z.string(),
  psd: z.string(),
  psd_frequencies: z.array(z.number()),
  /** Group × contact × contact, if it is stored. */
  correlation: z.object({ dataset: z.string(), scale: z.number() }).optional(),
  /** Group × contact: a group's part in the total's variance at each contact. */
  contact_shares: z.string(),
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
  /** The axes the cells differ on that the build left out, and why. */
  axes_left_out: z.record(z.string(), z.string()),
  /** Why there are no groups, where that is not down to the report: they are built once someone who can read what they need opens it. */
  groups_unavailable: z.string().nullable(),
  datasets: z.record(z.string(), datasetSchema),
});

export type LfpSummaryIndex = z.infer<typeof lfpSummaryIndexSchema>;
export type LfpDataset = z.infer<typeof datasetSchema>;
export type LfpAxis = z.infer<typeof axisSchema>;
export type LfpSummaryRequest = { url: string; headers: Record<string, string> };
export type ByteRange = { offset: number; length: number };
/** A range of a summary's bytes. A part of a multipart answer may lie at any offset of its buffer. */
export type ReadRange = (range: ByteRange) => Promise<Uint8Array<ArrayBuffer>>;

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

const rangeHeader = (ranges: readonly ByteRange[]) =>
  `bytes=${ranges.map(({ offset, length }) => `${offset}-${offset + length - 1}`).join(',')}`;

async function readByRange(
  request: LfpSummaryRequest,
  ranges: readonly ByteRange[]
): Promise<Response> {
  const response = await fetch(request.url, {
    headers: { ...request.headers, Range: rangeHeader(ranges) },
  });
  if (response.status === 412) throw new LfpSummaryChangedError();
  if (!response.ok) throw new Error(`Reading the LFP summary failed (${response.status})`);
  if (response.status !== 206) {
    // Else the whole file would be downloaded.
    response.body?.cancel();
    throw new Error('The LFP summary was not read by range');
  }
  return response;
}

type Part = { start: number; bytes: Uint8Array<ArrayBuffer> };

const PART_HEADERS_BYTES = 512;

/** The parts of a multipart/byteranges answer, each by the range its header gives. */
function multipartParts(bytes: Uint8Array<ArrayBuffer>, boundary: string): Part[] {
  // Only each part's headers are read as text, one character per byte, as the parts' lengths are
  // in them.
  const latin1 = new TextDecoder('latin1');
  const delimiter = `--${boundary}`;
  const parts: Part[] = [];
  let at = 0;
  for (;;) {
    const headers = latin1.decode(bytes.subarray(at, at + PART_HEADERS_BYTES));
    const begins = headers.indexOf(delimiter);
    if (begins < 0 || headers.startsWith('--', begins + delimiter.length)) return parts;
    const headersEnd = headers.indexOf('\r\n\r\n', begins);
    const range = /content-range:\s*bytes (\d+)-(\d+)/i.exec(headers.slice(begins, headersEnd));
    if (headersEnd < 0 || !range) throw new Error('The LFP summary was not read by range');
    const start = Number(range[1]);
    const from = at + headersEnd + 4;
    const length = Number(range[2]) - start + 1;
    parts.push({ start, bytes: bytes.subarray(from, from + length) });
    at = from + length;
  }
}

async function readSomeRanges(
  request: LfpSummaryRequest,
  ranges: readonly ByteRange[]
): Promise<Uint8Array<ArrayBuffer>[]> {
  const response = await readByRange(request, ranges);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const boundary = /boundary="?([^";\s]+)/.exec(response.headers.get('content-type') ?? '')?.[1];
  // A server may answer ranges that touch as one part, and all of them as one range.
  const single = /bytes (\d+)-/.exec(response.headers.get('content-range') ?? '')?.[1];
  if (!boundary && !single) throw new Error('The LFP summary was not read by range');
  const parts = boundary ? multipartParts(bytes, boundary) : [{ start: Number(single), bytes }];
  return ranges.map(({ offset, length }) => {
    const part = parts.find(
      (p) => p.start <= offset && offset + length <= p.start + p.bytes.length
    );
    if (!part) throw new Error('The LFP summary was cut short');
    return part.bytes.subarray(offset - part.start, offset - part.start + length);
  });
}

/** Ranges' bytes, in the order given, with as few requests as the server takes. */
export async function readRanges(
  request: LfpSummaryRequest,
  ranges: readonly ByteRange[]
): Promise<Uint8Array<ArrayBuffer>[]> {
  const requests = [];
  for (let i = 0; i < ranges.length; i += MAX_RANGES_PER_REQUEST) {
    requests.push(readSomeRanges(request, ranges.slice(i, i + MAX_RANGES_PER_REQUEST)));
  }
  return (await Promise.all(requests)).flat();
}

/** A slice of a dataset's bytes, copied to a buffer of their own to be read as their type. */
export async function readSlice(
  read: ReadRange,
  entry: LfpDataset,
  leading: readonly number[] = []
): Promise<ArrayBuffer> {
  const { offset, length } = sliceOf(entry, leading);
  return (await read({ offset, length })).slice().buffer;
}

/** A chunk's int16 values: HDF5's deflate and shuffle filters undone. */
export async function inflateRow(
  chunk: ArrayBuffer | Uint8Array<ArrayBuffer>
): Promise<Int16Array> {
  const stream = new Response(chunk).body?.pipeThrough(new DecompressionStream('deflate'));
  const shuffled = new Uint8Array(await new Response(stream).arrayBuffer());
  const steps = shuffled.length / 2;
  const row = new Int16Array(steps);
  for (let i = 0; i < steps; i++) row[i] = shuffled[i] | (shuffled[steps + i] << 8);
  return row;
}

/** Where a group's rows lie: contact × (offset, size). */
export async function readChunkTable(
  read: ReadRange,
  index: LfpSummaryIndex,
  axis: LfpAxis,
  group: number
): Promise<BigUint64Array> {
  const { chunks } = axis.levels[0];
  if (!chunks) throw new Error(`The rows of ${axis.name} are not in chunks`);
  return new BigUint64Array(await readSlice(read, datasetOf(index, chunks), [group]));
}

/** The level an axis is overviewed at: its coarsest, at most the format's 2,048 bins. */
export function overviewLevel(axis: LfpAxis) {
  return axis.levels[axis.levels.length - 1];
}

/** A group's whole field at a level, every contact. */
export async function readField(
  read: ReadRange,
  index: LfpSummaryIndex,
  axis: LfpAxis,
  group: number,
  level: LfpAxis['levels'][number]
): Promise<LfpField> {
  const entry = datasetOf(index, level.dataset);
  const data = new Int16Array(await readSlice(read, entry, [group]));
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
  read: ReadRange,
  index: LfpSummaryIndex,
  axis: LfpAxis,
  group: number
): Promise<GroupStats> {
  const [stats, psd] = await Promise.all([
    readSlice(read, datasetOf(index, axis.stats), [group]),
    readSlice(read, datasetOf(index, axis.psd), [group]),
  ]);
  return { stats: new Float32Array(stats), psd: new Float32Array(psd) };
}

/** A group's part in the total's variance at each contact. */
export async function readContactShares(
  read: ReadRange,
  index: LfpSummaryIndex,
  axis: LfpAxis,
  group: number
): Promise<Float32Array> {
  return new Float32Array(await readSlice(read, datasetOf(index, axis.contact_shares), [group]));
}

/** Where a contact's row lies, deflated, by its group's chunk table. */
export function rowRange(table: BigUint64Array, contact: number): ByteRange {
  return { offset: Number(table[contact * 2]), length: Number(table[contact * 2 + 1]) };
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
