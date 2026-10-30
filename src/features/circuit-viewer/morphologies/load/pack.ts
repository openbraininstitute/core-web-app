/**
 * Reads a morphology pack: the binary file Bluenaas writes of a circuit's morphologies, simplified, placed in the
 * circuit and cut into chunks of space. The format is specified in Bluenaas's `app/core/morphology_pack/docs/`
 * (`format.md`; what this reader relies on is in `reader-contract.md`). The reader reads the index and the somas when
 * it opens the pack, and the chunks one box of space at a time. A level's box is read over its base level's box, and
 * the base boxes read last are kept a while for the finer levels.
 */
// Importing `z` by name brings in the whole of zod, and this reader runs in a worker with a bundle of its own.
import * as z from 'zod';

import { Arriving } from './arriving';

import type { CircuitMorphologyData, MorphologySegments, PackBoxes, Vec3 } from '../types';

const MAGIC = 0x4b43504d;
const VERSION = 1;
const HEADER_BYTES = 12;
const COUNTS_BYTES = 16;
const SOMA_BYTES = 16;
const SCRATCH_STREAMS = 13;
/** The bytes a segment takes in a box read as whole numbers: two ends of four numbers, its cell and its type. */
const GRID_BYTES = 37;
/** How many bytes of the boxes read last are kept for the finer levels read over them. */
const KEPT_BYTES = 64 * 1024 * 1024;
/** Radius steps whose radius is looked up rather than worked out. */
const RADIUS_TABLE = 512;
/** The most deflate can inflate a byte to. */
const MOST_INFLATED = 1032;
/** The most an index may inflate to, far more than any pack's index needs. */
const MOST_INDEX_BYTES = 64 * 1024 * 1024;
/** The most bytes a segment takes in a chunk: its own four steps and its run's numbers, four bytes each. */
const MOST_SEGMENT_BYTES = 13 * 4;

const CUT_SHORT = 'morphology pack cut short';
const AT_ODDS = 'morphology pack at odds with its index';

/** The bytes are not a sound pack of this version. */
export class PackError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PackError';
  }
}

const count = z.number().int().nonnegative();
const steps = z.number().int();
const corner = z.tuple([steps, steps, steps]);

const indexSchema = z.object({
  layout: z.string(),
  gridUm: z.number().positive(),
  radiusSteps: z.number().positive(),
  bounds: z.tuple([corner, corner]),
  populations: z.array(
    z.object({
      name: z.string(),
      cells: count,
      // By section type; absent from a pack written before populations had them.
      boxes: z.record(z.string(), z.tuple([corner, corner])).nullish(),
    })
  ),
  somas: z.object({ offset: count, bytes: count }),
  levels: z
    .array(
      z.object({
        toleranceUm: z.number(),
        pruneUm: z.number(),
        chunkSteps: count,
        segments: count,
        offset: count,
        base: count.nullable(),
        chunks: z.object({
          box: z.array(steps),
          bytes: z.array(count),
          segments: z.array(count),
          reach: z.array(count),
        }),
      })
    )
    .min(1),
});

type PackIndex = z.infer<typeof indexSchema>;

/** Inflates a block, which is damaged if it inflates to more than `maxBytes`. */
async function inflate(deflated: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  const stream = new DecompressionStream('deflate');
  const writer = stream.writable.getWriter();
  // Bytes that are not deflate make the read below fail, and these two calls fail with it; the read reports it.
  writer.write(deflated as Uint8Array<ArrayBuffer>).catch(() => {});
  writer.close().catch(() => {});
  const reader = stream.readable.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new Error(`inflates to more than ${maxBytes} bytes`);
      }
      parts.push(value);
    }
  } catch (cause) {
    throw new PackError('morphology pack with a damaged block', { cause });
  }
  const [only] = parts;
  // Only a part that fills its own buffer is returned as it is: the somas are read as floats over the whole buffer.
  if (parts.length === 1 && only.byteOffset === 0 && only.byteLength === only.buffer.byteLength) {
    return only;
  }
  const all = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    all.set(part, at);
    at += part.byteLength;
  }
  return all;
}

/** The index, and where in the file the blocks start: the index's offsets count from there. */
async function openIndex(file: Arriving): Promise<{ index: PackIndex; blocks: number }> {
  const whole = await file.until(HEADER_BYTES);
  const header = file.bytes(0, HEADER_BYTES);
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  if (!whole || view.getUint32(0, true) !== MAGIC) throw new PackError('not a morphology pack');
  const version = view.getUint16(4, true);
  if (version !== VERSION) throw new PackError(`morphology pack version ${version}`);
  const end = HEADER_BYTES + view.getUint32(8, true);
  const json = new TextDecoder().decode(
    await inflate(await blockAt(file, HEADER_BYTES, end - HEADER_BYTES), MOST_INDEX_BYTES)
  );
  let index: PackIndex;
  try {
    index = indexSchema.parse(JSON.parse(json));
  } catch (cause) {
    throw new PackError('morphology pack with a malformed index', { cause });
  }
  if (index.layout !== 'space') throw new PackError(`morphology pack laid out by ${index.layout}`);
  return { index, blocks: end };
}

/**
 * Whether the levels' chunks agree with one another and with their bases, and whether each chunk's bytes could hold the
 * segments it claims. Once inflated, a segment takes at least a byte.
 */
function soundLevels({ levels }: PackIndex): boolean {
  const sizes = new Set(
    levels.filter(({ chunks }) => chunks.bytes.length > 0).map(({ chunkSteps }) => chunkSteps)
  );
  return (
    sizes.size <= 1 &&
    levels.every(
      ({ chunks, chunkSteps, segments, base }, level) =>
        chunks.box.length === 3 * chunks.bytes.length &&
        chunks.segments.length === chunks.bytes.length &&
        chunks.reach.length === chunks.bytes.length &&
        sum(chunks.segments) === segments &&
        chunks.segments.every((count, i) => count <= MOST_INFLATED * chunks.bytes[i]) &&
        (chunkSteps > 0 || chunks.bytes.length === 0) &&
        (base === null || (base > level && base < levels.length))
    )
  );
}

/** The block at `start` in the file, once its bytes are in. */
async function blockAt(file: Arriving, start: number, bytes: number): Promise<Uint8Array> {
  if (!(await file.until(start + bytes))) throw new PackError(CUT_SHORT);
  return file.bytes(start, start + bytes);
}

const sum = (numbers: number[]) => numbers.reduce((total, n) => total + n, 0);

/** Reads a stream's `count` numbers into `out` and returns where the next stream starts. */
function readStream(
  data: Uint8Array,
  at: number,
  count: number,
  signed: boolean,
  out: Int32Array
): number {
  const width = data[at];
  const end = at + 1 + width * count;
  if (!(width >= 1 && width <= 4) || end > data.length) throw new PackError(CUT_SHORT);
  for (let i = 0; i < count; i++) out[i] = data[at + 1 + i];
  for (let plane = 1, from = at + 1 + count; plane < width; plane++, from += count) {
    const shift = 8 * plane;
    for (let i = 0; i < count; i++) out[i] |= data[from + i] << shift;
  }
  if (signed) for (let i = 0; i < count; i++) out[i] = (out[i] >>> 1) ^ -(out[i] & 1);
  return end;
}

/** A box's segments at one level, in grid steps and radius steps, in the order they were read. */
interface Grid {
  count: number;
  /** x, y, z and radius step of each segment's near end, then of its far end. */
  ends: Int32Array;
  cells: Uint32Array;
  types: Uint8Array;
}

const gridOf = (count: number): Grid => ({
  count,
  ends: new Int32Array(8 * count),
  cells: new Uint32Array(count),
  types: new Uint8Array(count),
});

/** The base of a level that has none. It is shared, so it is never handed over. */
const NO_BASE = gridOf(0);

/** Guesses the next point on the chord: a `left`-th of the way from `from` to `to`, rounded down. */
const towards = (from: number, to: number, left: number) => from + Math.floor((to - from) / left);
/** Guesses a step from the step before it in its run. A run's first step has 0 before it, so it is guessed as 0. */
const guessed = (before: number) => (3 * before + 2) >> 2;

/**
 * Writes into `grid`, from its first segment on, the segments that follow the base's: for each base segment, from its
 * near end through its inner points to its far end. `counts` and `inner` are the streams read.
 */
function follow(base: Grid, counts: Int32Array, inner: Int32Array[], grid: Grid) {
  const [ix, iy, iz, ir] = inner;
  const { ends, cells, types } = grid;
  let p = 0;
  let s = 0;
  for (let b = 0; b < base.count; b++) {
    const k = counts[b];
    if (k === 0) continue;
    const o = 8 * b;
    let x = base.ends[o];
    let y = base.ends[o + 1];
    let z = base.ends[o + 2];
    let r = base.ends[o + 3];
    const qx = base.ends[o + 4];
    const qy = base.ends[o + 5];
    const qz = base.ends[o + 6];
    const qr = base.ends[o + 7];
    for (let left = k; left > 0; left--, s++) {
      const e = 8 * s;
      ends[e] = x;
      ends[e + 1] = y;
      ends[e + 2] = z;
      ends[e + 3] = r;
      if (left > 1) {
        x = towards(x, qx, left) + ix[p];
        y = towards(y, qy, left) + iy[p];
        z = towards(z, qz, left) + iz[p];
        r = towards(r, qr, left) + ir[p];
        p++;
      } else {
        x = qx;
        y = qy;
        z = qz;
        r = qr;
      }
      ends[e + 4] = x;
      ends[e + 5] = y;
      ends[e + 6] = z;
      ends[e + 7] = r;
      cells[s] = base.cells[b];
      types[s] = base.types[b];
    }
  }
}

/** Reads a chunk's runs from `at` into the end of `grid` and returns where they end. The pack has `cells` cells. */
function readRuns(
  data: Uint8Array,
  at: number,
  runs: number,
  segments: number,
  corner: Vec3,
  grid: Grid,
  cells: number,
  scratch: Scratch
): number {
  const { streams, runEnds } = scratch;
  let next = at;
  for (let k = 0; k < 4; k++) next = readStream(data, next, runs, false, streams[k]);
  const [cellSteps, types, lengths, back] = streams;
  let whole = 0;
  for (let r = 0; r < runs; r++) if (back[r] === 0) whole++;
  for (let k = 0; k < 4; k++) next = readStream(data, next, whole, true, streams[4 + k]);
  next = readStream(data, next, runs - whole, true, streams[8]);
  for (let k = 0; k < 4; k++) next = readStream(data, next, segments, true, streams[9 + k]);
  const [sx, sy, sz, sr, referred, dx, dy, dz, dr] = streams.slice(4);
  const { ends, cells: segmentCells, types: segmentTypes } = grid;
  const first = grid.count - segments;

  let cell = 0;
  let w = 0;
  let v = 0;
  let i = 0;
  for (let r = 0; r < runs; r++) {
    cell += cellSteps[r];
    const end = i + lengths[r];
    if (
      cell < 0 ||
      cell >= cells ||
      end > segments ||
      lengths[r] < 1 ||
      back[r] < 0 ||
      back[r] > r
    ) {
      throw new PackError(AT_ODDS);
    }
    let x: number;
    let y: number;
    let z: number;
    let rad: number;
    if (back[r] === 0) {
      x = corner[0] + sx[w];
      y = corner[1] + sy[w];
      z = corner[2] + sz[w];
      rad = sr[w++];
    } else {
      const e = 4 * (r - back[r]);
      x = runEnds[e];
      y = runEnds[e + 1];
      z = runEnds[e + 2];
      rad = runEnds[e + 3] + referred[v++];
    }
    let stepX = 0;
    let stepY = 0;
    let stepZ = 0;
    for (; i < end; i++) {
      stepX = dx[i] + guessed(stepX);
      stepY = dy[i] + guessed(stepY);
      stepZ = dz[i] + guessed(stepZ);
      const s = first + i;
      const o = 8 * s;
      ends[o] = x;
      ends[o + 1] = y;
      ends[o + 2] = z;
      ends[o + 3] = rad;
      x += stepX;
      y += stepY;
      z += stepZ;
      rad += dr[i];
      ends[o + 4] = x;
      ends[o + 5] = y;
      ends[o + 6] = z;
      ends[o + 7] = rad;
      segmentCells[s] = cell;
      segmentTypes[s] = types[r];
    }
    runEnds[4 * r] = x;
    runEnds[4 * r + 1] = y;
    runEnds[4 * r + 2] = z;
    runEnds[4 * r + 3] = rad;
  }
  if (i !== segments) throw new PackError(AT_ODDS);
  return next;
}

interface Scratch {
  /** Arrays for a chunk's streams, each as long as the largest chunk's count of segments. */
  streams: Int32Array[];
  /** Each run's far end, four numbers a run. */
  runEnds: Int32Array;
}

/** Reads a chunk's inflated block, `count` segments, over `base`: the base level's segments in the same box. */
function readChunk(
  data: Uint8Array,
  corner: Vec3,
  base: Grid,
  count: number,
  cells: number,
  scratch: Scratch
): Grid {
  if (data.length < COUNTS_BYTES) throw new PackError(CUT_SHORT);
  const view = new DataView(data.buffer, data.byteOffset, COUNTS_BYTES);
  const followed = view.getUint32(0, true);
  const inner = view.getUint32(4, true);
  const runs = view.getUint32(8, true);
  const runSegments = view.getUint32(12, true);
  if (followed !== base.count || inner > count || runSegments > count || runs > runSegments) {
    throw new PackError(AT_ODDS);
  }
  const [counts, ...points] = scratch.streams;
  let at = readStream(data, COUNTS_BYTES, followed, false, counts);
  for (let k = 0; k < 4; k++) at = readStream(data, at, inner, true, points[k]);
  let following = 0;
  let innerPoints = 0;
  for (let b = 0; b < followed; b++) {
    if (counts[b] < 0) throw new PackError(AT_ODDS);
    following += counts[b];
    innerPoints += Math.max(counts[b] - 1, 0);
  }
  if (following + runSegments !== count || innerPoints !== inner) throw new PackError(AT_ODDS);
  const grid = gridOf(count);
  follow(base, counts, points, grid);
  at = readRuns(data, at, runs, runSegments, corner, grid, cells, scratch);
  if (at !== data.length) throw new PackError('morphology pack chunk with bytes left over');
  return grid;
}

const hasPosition = (somas: Float32Array, i: number) =>
  Number.isFinite(somas[i] + somas[i + 1] + somas[i + 2]);

/** The box around the pack's points and the somas that have a position, µm in the circuit's frame; null if none. */
function boxOf(index: PackIndex, somas: Float32Array) {
  // The index's bounds are the first level's, and only the origin where that level has no segments.
  const none = index.levels[0].segments === 0;
  const min = index.bounds[0].map((steps) => (none ? Infinity : steps * index.gridUm)) as Vec3;
  const max = index.bounds[1].map((steps) => (none ? -Infinity : steps * index.gridUm)) as Vec3;
  for (let i = 0; i < somas.length; i += 4) {
    if (!hasPosition(somas, i)) continue;
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], somas[i + k]);
      max[k] = Math.max(max[k], somas[i + k]);
    }
  }
  return min[0] <= max[0] ? { min, max } : null;
}

/**
 * Gathers every level's chunks into boxes, one box for each place where any level has a chunk. `corners` holds each
 * box's cube in grid steps, grown by the farthest any of its chunks reaches, least corner then greatest. `inBox` holds
 * each box's chunk at each level, -1 for none.
 */
function gatherBoxes(index: PackIndex): { corners: number[]; inBox: number[][] } {
  const numbers = new Map<string, number>();
  const corners: number[] = [];
  const inBox: number[][] = [];
  index.levels.forEach(({ chunks, chunkSteps }, level) => {
    for (let chunk = 0; 3 * chunk < chunks.box.length; chunk++) {
      const least = [0, 1, 2].map((k) => chunks.box[3 * chunk + k] * chunkSteps);
      const key = least.join();
      const reach = chunks.reach[chunk];
      let box = numbers.get(key);
      if (box === undefined) {
        box = numbers.size;
        numbers.set(key, box);
        corners.push(...least, ...least.map((at) => at + chunkSteps));
        inBox.push(index.levels.map(() => -1));
      }
      for (let k = 0; k < 3; k++) {
        corners[6 * box + k] = Math.min(corners[6 * box + k], least[k] - reach);
        corners[6 * box + 3 + k] = Math.max(
          corners[6 * box + 3 + k],
          least[k] + chunkSteps + reach
        );
      }
      if (inBox[box][level] !== -1) throw new PackError(AT_ODDS);
      inBox[box][level] = chunk;
    }
  });
  return { corners, inBox };
}

/** Keeps the boxes read last, as whole numbers, for the finer levels read over them, as long as they fit in `bytes`. */
class Kept {
  private readonly held = new Map<number, { grid: Promise<Grid>; bytes: number }>();
  private total = 0;

  constructor(private readonly bytes: number) {}

  get(key: number, read: () => Promise<Grid>): Promise<Grid> {
    const found = this.held.get(key);
    if (found) {
      this.held.delete(key);
      this.held.set(key, found);
      return found.grid;
    }
    const entry = { grid: read(), bytes: 0 };
    this.held.set(key, entry);
    entry.grid.then(
      (grid) => {
        if (this.held.get(key) !== entry) return;
        entry.bytes = GRID_BYTES * grid.count;
        this.total += entry.bytes;
        this.held.delete(key);
        this.held.set(key, entry);
        for (const [oldest, kept] of this.held) {
          if (this.total <= this.bytes || oldest === key) break;
          this.held.delete(oldest);
          this.total -= kept.bytes;
        }
      },
      () => {
        if (this.held.get(key) === entry) this.held.delete(key);
      }
    );
    return entry.grid;
  }
}

/** An open pack: its somas and frame, where its segments lie, and a read of each box when asked. */
export interface Pack extends PackBoxes {
  /** The somas, the populations, the frame and the bounds, with no segments. The bounds hold the finest level and every placed soma. */
  data: CircuitMorphologyData;
  /** Reads the segments of box `box` at level `level`, with their cells numbered as the pack numbers them. */
  readBox(level: number, box: number): Promise<MorphologySegments>;
  /**
   * For each level, how many bytes of the file must be in before each box can be read at it: up to the end of its chunk
   * and of its bases' chunks (0 where there are none).
   */
  readableAt: Float64Array[];
}

/**
 * Opens a pack: reads its index and somas now, or once their bytes are in if the pack is still coming in. Its chunks
 * are read a box at a time (`readBox`), each once its bytes and its bases' bytes are in.
 */
export async function openPack(bytes: Uint8Array | Arriving): Promise<Pack> {
  const file = bytes instanceof Arriving ? bytes : Arriving.whole(bytes);
  const { index, blocks } = await openIndex(file);
  if (!soundLevels(index)) throw new PackError(AT_ODDS);
  const cells = sum(index.populations.map((p) => p.cells));
  const somaBytes = await inflate(
    await blockAt(file, blocks + index.somas.offset, index.somas.bytes),
    SOMA_BYTES * cells
  );
  if (somaBytes.byteLength !== SOMA_BYTES * cells) throw new PackError(AT_ODDS);
  const somas = new Float32Array(somaBytes.buffer);

  const box = boxOf(index, somas) ?? { min: [0, 0, 0], max: [0, 0, 0] };
  const centre = box.min.map((lowest, k) => (lowest + box.max[k]) / 2) as Vec3;
  const around = (point: Vec3) => point.map((value, k) => value - centre[k]) as Vec3;
  const fromSteps = (steps: Vec3) => around(steps.map((step) => step * index.gridUm) as Vec3);
  for (let i = 0; i < somas.length; i += 4) {
    const placed = hasPosition(somas, i);
    for (let k = 0; k < 3; k++) somas[i + k] = placed ? somas[i + k] - centre[k] : NaN;
  }
  const data: CircuitMorphologyData = {
    segments: new Float32Array(0),
    segmentCells: new Uint32Array(0),
    segmentTypes: new Uint8Array(0),
    somas,
    populations: index.populations.map(({ name, cells }) => ({ name, cells })),
    boxes: index.populations.every((p) => p.boxes)
      ? Object.fromEntries(
          index.populations.map(({ name, boxes }) => [
            name,
            Object.fromEntries(
              Object.entries(boxes ?? {}).map(([type, [least, most]]) => [
                type,
                { min: fromSteps(least), max: fromSteps(most) },
              ])
            ),
          ])
        )
      : undefined,
    centre,
    bounds: { min: around(box.min), max: around(box.max) },
  };

  const { corners, inBox } = gatherBoxes(index);
  const count = inBox.length;
  const boxes = Float32Array.from(corners, (steps, i) => steps * index.gridUm - centre[i % 3]);
  const levels = index.levels.map(({ toleranceUm, pruneUm, chunks }, level) => ({
    toleranceUm,
    pruneUm,
    segments: Uint32Array.from({ length: count }, (_, b) =>
      inBox[b][level] < 0 ? 0 : chunks.segments[inBox[b][level]]
    ),
  }));
  const offsets = index.levels.map(({ offset, chunks }) => {
    const starts: number[] = [];
    let at = blocks + offset;
    for (const bytes of chunks.bytes) {
      starts.push(at);
      at += bytes;
    }
    return starts;
  });
  const readableAt = index.levels.map(() => new Float64Array(count));
  // A level's base is coarser, and later in the index.
  for (let level = index.levels.length - 1; level >= 0; level--) {
    const { base, chunks } = index.levels[level];
    for (let b = 0; b < count; b++) {
      const chunk = inBox[b][level];
      const own = chunk < 0 ? 0 : offsets[level][chunk] + chunks.bytes[chunk];
      readableAt[level][b] = Math.max(own, base === null ? 0 : readableAt[base][b]);
    }
  }
  const isBase = index.levels.map((_, level) => index.levels.some(({ base }) => base === level));
  const declared = (level: number, b: number) => {
    const chunk = inBox[b][level];
    return chunk < 0 ? 0 : index.levels[level].chunks.segments[chunk];
  };
  // Shared by every read: `readChunk` never waits, so no two reads use it at once. Grown to the largest chunk so far.
  let scratch: Scratch | null = null;
  const kept = new Kept(KEPT_BYTES);

  const readGrid = async (level: number, b: number): Promise<Grid> => {
    const { base, chunks, chunkSteps } = index.levels[level];
    const chunk = inBox[b][level];
    // A fresh empty grid, not `NO_BASE`: the box read is handed over.
    if (chunk < 0) return gridOf(0);
    const count = chunks.segments[chunk];
    // Each base segment's count takes up to four bytes.
    const mostBytes =
      COUNTS_BYTES + 16 + 4 * (base === null ? 0 : declared(base, b)) + MOST_SEGMENT_BYTES * count;
    const [under, inflated] = await Promise.all([
      base === null ? NO_BASE : gridAt(base, b),
      blockAt(file, offsets[level][chunk], chunks.bytes[chunk]).then((block) =>
        inflate(block, mostBytes)
      ),
    ]);
    // Checked before anything is made for the chunk's segments: each segment takes at least a byte.
    if (count > inflated.length) throw new PackError(AT_ODDS);
    const most = Math.max(count, under.count);
    if (!scratch || scratch.runEnds.length < 4 * most) {
      scratch = {
        streams: Array.from({ length: SCRATCH_STREAMS }, () => new Int32Array(most)),
        runEnds: new Int32Array(4 * most),
      };
    }
    const at = [0, 1, 2].map((k) => chunks.box[3 * chunk + k] * chunkSteps) as Vec3;
    return readChunk(inflated, at, under, count, cells, scratch);
  };
  const gridAt = (level: number, b: number): Promise<Grid> =>
    isBase[level] ? kept.get(level * count + b, () => readGrid(level, b)) : readGrid(level, b);

  const radii = new Float32Array(2 * RADIUS_TABLE).map(
    (_, i) => 2 ** ((i - RADIUS_TABLE) / index.radiusSteps)
  );
  const radius = (step: number) =>
    step >= -RADIUS_TABLE && step < RADIUS_TABLE
      ? radii[step + RADIUS_TABLE]
      : 2 ** (step / index.radiusSteps);

  const readBox = async (level: number, b: number): Promise<MorphologySegments> => {
    if (!index.levels[level] || !(b >= 0 && b < count)) {
      throw new RangeError(`morphology pack without a box ${b} at level ${level}`);
    }
    const grid = await gridAt(level, b);
    const { ends } = grid;
    // A box kept for the finer levels is copied, not handed over, because its cells are renumbered in place. Any other
    // box's whole numbers become micrometres in the same buffer, each read before it is written over.
    const kept = isBase[level];
    const segments = kept ? new Float32Array(ends.length) : new Float32Array(ends.buffer);
    const [cx, cy, cz] = centre;
    const { gridUm } = index;
    for (let o = 0; o < ends.length; o += 4) {
      segments[o] = ends[o] * gridUm - cx;
      segments[o + 1] = ends[o + 1] * gridUm - cy;
      segments[o + 2] = ends[o + 2] * gridUm - cz;
      segments[o + 3] = radius(ends[o + 3]);
    }
    if (!kept) return { segments, segmentCells: grid.cells, segmentTypes: grid.types };
    return { segments, segmentCells: grid.cells.slice(), segmentTypes: grid.types.slice() };
  };
  return { data, boxes, levels, readBox, readableAt };
}
