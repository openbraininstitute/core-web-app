import { z } from 'zod';

import { ApiError } from '@/api/error';

const datasetSchema = z.object({
  offset: z.number().int().nonnegative(),
  shape: z.array(z.number().int().nonnegative()),
  dtype: z.enum(['<i2', '<f4', '<u8', '|u1']),
});

const ITEM_BYTES = { '<i2': 2, '<f4': 4, '<u8': 8, '|u1': 1 };

/** Past Starlette's 100 ranges a request is answered with the whole file. */
const MAX_RANGES_PER_REQUEST = 100;

/** A level's contacts' rows cut in blocks, each deflated in a chunk of its own. */
const blocksSchema = z.object({
  /** Where each lies: group × contact × block × (offset, size). */
  chunks: z.string(),
  /** Bins per block, the last one padded. */
  steps: z.number().int().positive(),
  /** µV per int16 unit of each block, group × contact × block, where not the group's. */
  scales: z.string().optional(),
  /**
   * How many times each block's values were taken less the one before, group × contact × block,
   * where they were.
   */
  predictors: z.string().optional(),
});

const levelSchema = z.object({
  step: z.number().int().positive(),
  kind: z.enum(['value', 'mean', 'min_max']),
  dataset: z.string(),
  blocks: blocksSchema,
});

const axisSchema = z.object({
  name: z.string(),
  groups: z.array(z.string()).min(1),
  /** µV per int16 unit, one per group. */
  scales: z.array(z.number()),
  /** A group's part in the total's variance. */
  shares: z.array(z.number()),
  /**
   * Full resolution in blocks, then its overviews, finest to coarsest, a quarter of the bins each:
   * the total's by min/max, a group's by means, which add up. A short run's one overview is its
   * values.
   */
  levels: z.tuple([levelSchema, levelSchema], levelSchema),
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
  ranges: readonly ByteRange[],
  signal?: AbortSignal
): Promise<Response> {
  const response = await fetch(request.url, {
    headers: { ...request.headers, Range: rangeHeader(ranges) },
    signal,
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
  ranges: readonly ByteRange[],
  signal?: AbortSignal
): Promise<Uint8Array<ArrayBuffer>[]> {
  const response = await readByRange(request, ranges, signal);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const boundary = /boundary="?([^";\s]+)/.exec(response.headers.get('content-type') ?? '')?.[1];
  // A server may answer ranges that touch as one part, and all of them as one range.
  const single = /bytes (\d+)-/.exec(response.headers.get('content-range') ?? '')?.[1];
  if (!boundary && !single) throw new Error('The LFP summary was not read by range');
  const parts = boundary ? multipartParts(bytes, boundary) : [{ start: Number(single), bytes }];
  return ranges.map((range) =>
    bytesOf(
      parts.find((part) => holds(part, range)),
      range
    )
  );
}

const holds = (part: Part, { offset, length }: ByteRange) =>
  part.start <= offset && offset + length <= part.start + part.bytes.length;

function bytesOf(part: Part | undefined, range: ByteRange): Uint8Array<ArrayBuffer> {
  if (!part || !holds(part, range)) throw new Error('The LFP summary was cut short');
  const at = range.offset - part.start;
  return part.bytes.subarray(at, at + range.length);
}

/** The part of parts in the order of the file that a range would lie in. */
function partAt(parts: readonly Part[], offset: number): Part | undefined {
  let [low, high] = [0, parts.length - 1];
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (parts[middle].start <= offset) low = middle;
    else high = middle - 1;
  }
  return parts[low];
}

/** Ranges that touch or overlap as one, in the order of the file. */
export function mergedRanges(ranges: readonly ByteRange[]): ByteRange[] {
  const merged: ByteRange[] = [];
  for (const { offset, length } of [...ranges].sort((a, b) => a.offset - b.offset)) {
    const last = merged[merged.length - 1];
    if (last && offset <= last.offset + last.length) {
      last.length = Math.max(last.length, offset + length - last.offset);
    } else merged.push({ offset, length });
  }
  return merged;
}

/**
 * Ranges' bytes, in the order given, with as few requests as the server takes: those that touch
 * asked for as one, as a group's chunks of a level mostly do.
 */
export async function readRanges(
  request: LfpSummaryRequest,
  ranges: readonly ByteRange[],
  signal?: AbortSignal
): Promise<Uint8Array<ArrayBuffer>[]> {
  const merged = mergedRanges(ranges);
  const requests = [];
  for (let i = 0; i < merged.length; i += MAX_RANGES_PER_REQUEST) {
    const some = merged.slice(i, i + MAX_RANGES_PER_REQUEST);
    requests.push(
      readSomeRanges(request, some, signal).then((read) =>
        read.map((bytes, j): Part => ({ start: some[j].offset, bytes }))
      )
    );
  }
  const parts = (await Promise.all(requests)).flat();
  return ranges.map((range) => bytesOf(partAt(parts, range.offset), range));
}

/** A slice of a dataset's bytes, copied to a buffer of their own to be read as their type. */
export async function readSlice(
  read: ReadRange,
  entry: LfpDataset,
  leading: readonly number[] = [],
  count = 1
): Promise<ArrayBuffer> {
  const { offset, length } = sliceOf(entry, leading, count);
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

/**
 * Where a group's blocks of a level lie, contact × block × (offset, size), and, where stored, each
 * block's scale and order of prediction, contact × block.
 */
export type BlockCoding = { table: BigUint64Array; scales?: Float32Array; predictors?: Uint8Array };

export async function readBlockCoding(
  read: ReadRange,
  index: LfpSummaryIndex,
  level: LfpAxis['levels'][number],
  group: number
): Promise<BlockCoding> {
  const { chunks, scales, predictors } = level.blocks;
  const slice = (name: string) => readSlice(read, datasetOf(index, name), [group]);
  const [table, scaleBytes, predictorBytes] = await Promise.all([
    slice(chunks),
    scales ? slice(scales) : undefined,
    predictors ? slice(predictors) : undefined,
  ]);
  return {
    table: new BigUint64Array(table),
    scales: scaleBytes && new Float32Array(scaleBytes),
    predictors: predictorBytes && new Uint8Array(predictorBytes),
  };
}

/** The level an axis is overviewed at: its coarsest, at most the format's 2,048 bins. */
export const overviewAt = (axis: LfpAxis) => axis.levels.length - 1;

/** A group's whole field at a level, every contact, its tiles one after another. */
export async function readField(
  read: ReadRange,
  index: LfpSummaryIndex,
  axis: LfpAxis,
  group: number,
  levelAt: number
): Promise<LfpField> {
  const coding = await readBlockCoding(read, index, axis.levels[levelAt], group);
  const tileIds = Array.from({ length: levelTiling(index, axis, levelAt).count }, (_, t) => t);
  const tiles = await Promise.all(
    Array.from({ length: index.contacts }, (_, contact) =>
      Promise.all(
        tileIds.map((tile) =>
          readTile(read, index, axis, { group, contact, levelAt, tile }, coding)
        )
      )
    )
  );
  return windowField(index, axis, group, levelAt, tileIds, tiles);
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

/** Where a contact's block of a level lies, deflated, by its group's chunk table. */
export function blockRange(
  table: BigUint64Array,
  blocks: number,
  contact: number,
  block: number
): ByteRange {
  const at = (contact * blocks + block) * 2;
  return { offset: Number(table[at]), length: Number(table[at + 1]) };
}

/** A block's values from its own scale to the group's. */
export function toGroupScale(values: Int16Array, blockScale: number, scale: number): Int16Array {
  const ratio = blockScale / scale;
  return values.map((v) => Math.round(v * ratio));
}

/**
 * A block's values from its residuals of `order`, in place: added back up as many times as they
 * were taken, wrapping as int16 does as they wrapped.
 */
export function undoResiduals(residuals: Int16Array, order: number): Int16Array {
  for (let o = 0; o < order; o++) {
    for (let i = 1; i < residuals.length; i++) residuals[i] += residuals[i - 1];
  }
  return residuals;
}

/**
 * What a level is read in: its bins, how many a tile holds (its blocks, the unit its windows are
 * read and kept in), how many tiles a row has, and the values a bin has.
 */
export function levelTiling(index: LfpSummaryIndex, axis: LfpAxis, levelAt: number) {
  const level = axis.levels[levelAt];
  const bins = Math.ceil(index.time.steps / level.step);
  const tileBins = level.blocks.steps;
  return {
    level,
    bins,
    tileBins,
    count: Math.ceil(bins / tileBins),
    width: level.kind === 'min_max' ? 2 : 1,
  };
}

/**
 * The level to draw `steps` steps from across `width` pixels: the coarsest with a bin a pixel at
 * least, else full resolution.
 */
export function windowLevel(axis: LfpAxis, steps: number, width: number): number {
  for (let at = axis.levels.length - 1; at > 0; at--) {
    if (steps / axis.levels[at].step >= width) return at;
  }
  return 0;
}

/** The tiles of a level a window of time lies in, with a bin either side to carry the line across its edges. */
export function windowTiles(
  index: LfpSummaryIndex,
  axis: LfpAxis,
  levelAt: number,
  [from, to]: readonly [number, number]
): number[] {
  const { level, bins, tileBins } = levelTiling(index, axis, levelAt);
  const binMs = level.step * index.time.dt;
  const first = Math.max(0, Math.floor((from - index.time.start) / binMs) - 1);
  const last = Math.min(bins, Math.ceil((to - index.time.start) / binMs) + 1);
  if (last <= first) return [];
  const tiles = [];
  for (let t = Math.floor(first / tileBins); t * tileBins < last; t++) tiles.push(t);
  return tiles;
}

/**
 * A contact's tile of a level, by its group's block coding: its padding left off, its residuals
 * added back up and brought to the group's scale where it was stored so.
 */
export async function readTile(
  read: ReadRange,
  index: LfpSummaryIndex,
  axis: LfpAxis,
  at: { group: number; contact: number; levelAt: number; tile: number },
  { table, scales, predictors }: BlockCoding
): Promise<Int16Array> {
  const { bins, tileBins, count, width } = levelTiling(index, axis, at.levelAt);
  const block = at.contact * count + at.tile;
  const stored = await inflateRow(await read(blockRange(table, count, at.contact, at.tile)));
  // Prefix sums only look back, so the padding can go first
  const cut = stored.subarray(0, Math.min(tileBins, bins - at.tile * tileBins) * width);
  const values = undoResiduals(cut, predictors?.[block] ?? 0);
  return scales ? toGroupScale(values, scales[block], axis.scales[at.group]) : values;
}

/**
 * One group's field over a window: a row per contact, each its tiles one after another, `tiles`
 * holding a contact's in the order of `tileIds`.
 */
export function windowField(
  index: LfpSummaryIndex,
  axis: LfpAxis,
  group: number,
  levelAt: number,
  tileIds: readonly number[],
  tiles: readonly (readonly Int16Array[])[]
): LfpField {
  const { level, bins: allBins, tileBins, width } = levelTiling(index, axis, levelAt);
  const begin = tileIds[0] * tileBins;
  const bins = Math.min(allBins, (tileIds[tileIds.length - 1] + 1) * tileBins) - begin;
  const data = new Int16Array(tiles.length * bins * width);
  tiles.forEach((row, c) => {
    row.forEach((tile, t) => {
      data.set(tile, (c * bins + tileIds[t] * tileBins - begin) * width);
    });
  });
  const binMs = level.step * index.time.dt;
  return {
    contacts: tiles.length,
    bins,
    binMs,
    start: index.time.start + begin * binMs,
    kind: level.kind,
    data,
    scale: axis.scales[group],
  };
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
