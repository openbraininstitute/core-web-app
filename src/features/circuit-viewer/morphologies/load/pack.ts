/**
 * Reads a morphology pack: the binary file OBI-One writes of a circuit's morphologies, simplified, placed in the circuit
 * and cut into chunks of space. The format is specified in OBI-One's `docs/internal/circuit-morphology-pack.md`. The
 * index and the somas are read when the pack is opened, and the chunks a box of space at a time: a level's box over its
 * base's, whose boxes read last are kept a while for the finer levels.
 */
// The whole of zod comes with `z` imported by name, and the reader runs in a worker of its own.
import * as z from 'zod';

import type { CircuitMorphologyData, MorphologySegments, PackBoxes, Vec3 } from '../types';

const MAGIC = 0x4b43504d;
const VERSION = 1;
const HEADER_BYTES = 12;
const COUNTS_BYTES = 16;
const SOMA_BYTES = 16;
const SCRATCH_STREAMS = 13;
/** What a box read as whole numbers takes a segment: two ends of four numbers, its cell and its type. */
const GRID_BYTES = 37;
/** How much of the boxes read last is kept for the finer levels read over them. */
const KEPT_BYTES = 64 * 1024 * 1024;
/** Radius steps whose radius is looked up rather than worked out. */
const RADIUS_TABLE = 512;

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
  populations: z.array(z.object({ name: z.string(), cells: count })),
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

async function inflate(deflated: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream('deflate');
  const writer = stream.writable.getWriter();
  // What is not deflate fails the read below, and these with it.
  writer.write(deflated as Uint8Array<ArrayBuffer>).catch(() => {});
  writer.close().catch(() => {});
  try {
    return new Uint8Array(await new Response(stream.readable).arrayBuffer());
  } catch (cause) {
    throw new PackError('morphology pack with a damaged block', { cause });
  }
}

/** The index, and the bytes its offsets count in. */
async function openIndex(bytes: Uint8Array): Promise<{ index: PackIndex; blocks: Uint8Array }> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < HEADER_BYTES || view.getUint32(0, true) !== MAGIC) {
    throw new PackError('not a morphology pack');
  }
  const version = view.getUint16(4, true);
  if (version !== VERSION) throw new PackError(`morphology pack version ${version}`);
  const end = HEADER_BYTES + view.getUint32(8, true);
  if (end > bytes.byteLength) throw new PackError(CUT_SHORT);
  const json = new TextDecoder().decode(await inflate(bytes.subarray(HEADER_BYTES, end)));
  let index: PackIndex;
  try {
    index = indexSchema.parse(JSON.parse(json));
  } catch (cause) {
    throw new PackError('morphology pack with a malformed index', { cause });
  }
  if (index.layout !== 'space') throw new PackError(`morphology pack laid out by ${index.layout}`);
  return { index, blocks: bytes.subarray(end) };
}

/** Whether the levels' chunks agree with one another and with their bases. */
function soundLevels({ levels }: PackIndex): boolean {
  const withChunks = levels.filter(({ chunks }) => chunks.bytes.length > 0);
  return levels.every(
    ({ chunks, chunkSteps, segments, base }, level) =>
      chunks.box.length === 3 * chunks.bytes.length &&
      chunks.segments.length === chunks.bytes.length &&
      chunks.reach.length === chunks.bytes.length &&
      sum(chunks.segments) === segments &&
      (chunkSteps > 0 || chunks.bytes.length === 0) &&
      withChunks.every((other) => other.chunkSteps === chunkSteps || chunks.bytes.length === 0) &&
      (base === null || (base > level && base < levels.length))
  );
}

function blockAt(blocks: Uint8Array, offset: number, bytes: number): Uint8Array {
  if (offset + bytes > blocks.byteLength) throw new PackError(CUT_SHORT);
  return blocks.subarray(offset, offset + bytes);
}

const sum = (numbers: number[]) => numbers.reduce((total, n) => total + n, 0);

/** A stream's `count` numbers into `out`, and where the next stream starts. */
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
  out.fill(0, 0, count);
  for (let plane = 0, from = at + 1; plane < width; plane++, from += count) {
    const shift = 8 * plane;
    for (let i = 0; i < count; i++) out[i] |= data[from + i] << shift;
  }
  if (signed) for (let i = 0; i < count; i++) out[i] = (out[i] >>> 1) ^ -(out[i] & 1);
  return end;
}

/** A box's segments at a level, as whole numbers of the grid and of the radius' steps, in the order read. */
interface Grid {
  count: number;
  /** x, y, z and radius step of each segment's near end. */
  near: Int32Array;
  far: Int32Array;
  cells: Uint32Array;
  types: Uint8Array;
}

const gridOf = (count: number): Grid => ({
  count,
  near: new Int32Array(4 * count),
  far: new Int32Array(4 * count),
  cells: new Uint32Array(count),
  types: new Uint8Array(count),
});

/** The base of a level read alone, never handed over. */
const NO_BASE = gridOf(0);

/** The chord's guess of the next point: a `left`-th of the way from `from` on to `to`, rounded down. */
const towards = (from: number, to: number, left: number) => from + Math.floor((to - from) / left);
/** A step guessed from the one before it in its run. */
const guessed = (before: number) => Math.floor((3 * before + 2) / 4);

/**
 * The segments that follow the base's in `grid` from the first on: for each base segment, from its near end through its
 * inner points to its far end. `counts` and `inner` are the streams read.
 */
function follow(base: Grid, counts: Int32Array, inner: Int32Array[], grid: Grid) {
  const [ix, iy, iz, ir] = inner;
  const { near, far, cells, types } = grid;
  let p = 0;
  let s = 0;
  for (let b = 0; b < base.count; b++) {
    const k = counts[b];
    if (k === 0) continue;
    const o = 4 * b;
    let x = base.near[o];
    let y = base.near[o + 1];
    let z = base.near[o + 2];
    let r = base.near[o + 3];
    const qx = base.far[o];
    const qy = base.far[o + 1];
    const qz = base.far[o + 2];
    const qr = base.far[o + 3];
    for (let left = k; left > 0; left--, s++) {
      const e = 4 * s;
      near[e] = x;
      near[e + 1] = y;
      near[e + 2] = z;
      near[e + 3] = r;
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
      far[e] = x;
      far[e + 1] = y;
      far[e + 2] = z;
      far[e + 3] = r;
      cells[s] = base.cells[b];
      types[s] = base.types[b];
    }
  }
}

/** A chunk's runs read from `at` into `grid` from `first` on, of the pack's `cells`; where they end. */
function readRuns(
  data: Uint8Array,
  at: number,
  corner: Vec3,
  grid: Grid,
  first: number,
  cells: number,
  scratch: Scratch
): number {
  const view = new DataView(data.buffer, data.byteOffset, COUNTS_BYTES);
  const runs = view.getUint32(8, true);
  const segments = view.getUint32(12, true);
  if (runs > segments) throw new PackError(AT_ODDS);
  const s = scratch.streams;
  let next = at;
  for (let k = 0; k < 4; k++) next = readStream(data, next, runs, false, s[k]);
  const [cellSteps, types, lengths, back] = s;
  let whole = 0;
  for (let r = 0; r < runs; r++) if (back[r] === 0) whole++;
  for (let k = 0; k < 4; k++) next = readStream(data, next, whole, true, s[4 + k]);
  next = readStream(data, next, runs - whole, true, s[8]);
  for (let k = 0; k < 4; k++) next = readStream(data, next, segments, true, s[9 + k]);
  const [sx, sy, sz, sr, referred, dx, dy, dz, dr] = s.slice(4);
  const ends = scratch.ends;
  const { near, far, cells: segmentCells, types: segmentTypes } = grid;

  let cell = 0;
  let w = 0;
  let v = 0;
  let i = 0;
  for (let r = 0; r < runs; r++) {
    cell += cellSteps[r];
    const end = i + lengths[r];
    if (cell < 0 || cell >= cells || end > segments || lengths[r] < 1 || back[r] > r) {
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
      x = ends[e];
      y = ends[e + 1];
      z = ends[e + 2];
      rad = ends[e + 3] + referred[v++];
    }
    // The run's first step is stored whole, the others less the guess from the one before.
    let stepX = 0;
    let stepY = 0;
    let stepZ = 0;
    for (let guess = 0; i < end; i++, guess = 1) {
      stepX = dx[i] + guess * guessed(stepX);
      stepY = dy[i] + guess * guessed(stepY);
      stepZ = dz[i] + guess * guessed(stepZ);
      const s = first + i;
      const o = 4 * s;
      near[o] = x;
      near[o + 1] = y;
      near[o + 2] = z;
      near[o + 3] = rad;
      x += stepX;
      y += stepY;
      z += stepZ;
      rad += dr[i];
      far[o] = x;
      far[o + 1] = y;
      far[o + 2] = z;
      far[o + 3] = rad;
      segmentCells[s] = cell;
      segmentTypes[s] = types[r];
    }
    ends[4 * r] = x;
    ends[4 * r + 1] = y;
    ends[4 * r + 2] = z;
    ends[4 * r + 3] = rad;
  }
  if (i !== segments) throw new PackError(AT_ODDS);
  return next;
}

interface Scratch {
  /** Arrays as long as the largest chunk has segments, for its streams. */
  streams: Int32Array[];
  /** Each run's far end, four numbers a run. */
  ends: Int32Array;
}

/** A chunk's inflated block read over `base`, the base's segments in its box: `count` segments. */
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
  const runSegments = view.getUint32(12, true);
  if (followed !== base.count || inner > count || runSegments > count) throw new PackError(AT_ODDS);
  const [counts, ...points] = scratch.streams;
  let at = readStream(data, COUNTS_BYTES, followed, false, counts);
  for (let k = 0; k < 4; k++) at = readStream(data, at, inner, true, points[k]);
  let following = 0;
  let innerPoints = 0;
  for (let b = 0; b < followed; b++) {
    following += counts[b];
    innerPoints += Math.max(counts[b] - 1, 0);
  }
  if (following + runSegments !== count || innerPoints !== inner) throw new PackError(AT_ODDS);
  const grid = gridOf(count);
  follow(base, counts, points, grid);
  at = readRuns(data, at, corner, grid, following, cells, scratch);
  if (at !== data.length) throw new PackError('morphology pack chunk with bytes left over');
  return grid;
}

const hasPosition = (somas: Float32Array, i: number) =>
  Number.isFinite(somas[i] + somas[i + 1] + somas[i + 2]);

/** Around the pack's points and the somas that have a position, in µm in the circuit's frame; null if none. */
function boxOf(index: PackIndex, somas: Float32Array) {
  // The index's bounds are the first level's, and the origin alone where it has no segments.
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
 * Every level's chunks gathered in boxes, a box each place a level has a chunk: each box's corner in grid steps, its
 * cube grown by the farthest its chunks reach, least then greatest, and its chunk at each level, -1 for none.
 */
function gatherBoxes(index: PackIndex): { corners: number[]; corner: number[]; inBox: number[][] } {
  const numbers = new Map<string, number>();
  const corners: number[] = [];
  const corner: number[] = [];
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
        corner.push(...least);
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
      inBox[box][level] = chunk;
    }
  });
  return { corners, corner, inBox };
}

/** The boxes read last, as whole numbers, kept for the finer levels read over them while they fit in `bytes`. */
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

/** A pack opened: its somas and frame, where its segments lie, and each box's read when asked for. */
export interface Pack extends PackBoxes {
  /** The somas, the populations, the frame and the bounds, with no segments; the level is the finest. */
  data: CircuitMorphologyData;
  /** The segments level `level` has in box `box`, their cells numbered as the pack numbers them. */
  readBox(level: number, box: number): Promise<MorphologySegments>;
}

/** The index and the somas of a pack, read now; its chunks are read a box at a time (`readBox`). */
export async function openPack(bytes: Uint8Array): Promise<Pack> {
  const { index, blocks } = await openIndex(bytes);
  if (!soundLevels(index)) throw new PackError(AT_ODDS);
  const cells = sum(index.populations.map((p) => p.cells));
  const somaBytes = await inflate(blockAt(blocks, index.somas.offset, index.somas.bytes));
  if (somaBytes.byteLength !== SOMA_BYTES * cells) throw new PackError(AT_ODDS);
  const somas = new Float32Array(somaBytes.buffer);

  const box = boxOf(index, somas) ?? { min: [0, 0, 0], max: [0, 0, 0] };
  const centre = box.min.map((lowest, k) => (lowest + box.max[k]) / 2) as Vec3;
  const around = (point: Vec3) => point.map((value, k) => value - centre[k]) as Vec3;
  for (let i = 0; i < somas.length; i += 4) {
    const placed = hasPosition(somas, i);
    for (let k = 0; k < 3; k++) somas[i + k] = placed ? somas[i + k] - centre[k] : NaN;
  }
  const { toleranceUm, pruneUm } = index.levels[0];
  const data: CircuitMorphologyData = {
    segments: new Float32Array(0),
    segmentCells: new Uint32Array(0),
    segmentTypes: new Uint8Array(0),
    somas,
    populations: index.populations,
    centre,
    bounds: { min: around(box.min), max: around(box.max) },
    level: { toleranceUm, pruneUm },
  };

  const { corners, corner, inBox } = gatherBoxes(index);
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
    let at = offset;
    for (const bytes of chunks.bytes) {
      starts.push(at);
      at += bytes;
    }
    return starts;
  });
  const isBase = index.levels.map((_, level) => index.levels.some(({ base }) => base === level));
  const largest = Math.max(0, ...index.levels.flatMap(({ chunks }) => chunks.segments));
  // Made at the first read, and shared by every read: a chunk is read with no wait between.
  let scratch: Scratch | null = null;
  const kept = new Kept(KEPT_BYTES);

  const readGrid = async (level: number, b: number): Promise<Grid> => {
    const { base, chunks } = index.levels[level];
    const chunk = inBox[b][level];
    // Its own, not the shared one: a box read is handed over.
    if (chunk < 0) return gridOf(0);
    const [under, inflated] = await Promise.all([
      base === null ? NO_BASE : gridAt(base, b),
      inflate(blockAt(blocks, offsets[level][chunk], chunks.bytes[chunk])),
    ]);
    scratch ??= {
      streams: Array.from({ length: SCRATCH_STREAMS }, () => new Int32Array(largest)),
      ends: new Int32Array(4 * largest),
    };
    const at = corner.slice(3 * b, 3 * b + 3) as Vec3;
    return readChunk(inflated, at, under, chunks.segments[chunk], cells, scratch);
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
    const { count: n, near, far, cells: segmentCells, types } = await gridAt(level, b);
    const segments = new Float32Array(8 * n);
    const [cx, cy, cz] = centre;
    const { gridUm } = index;
    for (let s = 0; s < n; s++) {
      const o = 8 * s;
      const e = 4 * s;
      segments[o] = near[e] * gridUm - cx;
      segments[o + 1] = near[e + 1] * gridUm - cy;
      segments[o + 2] = near[e + 2] * gridUm - cz;
      segments[o + 3] = radius(near[e + 3]);
      segments[o + 4] = far[e] * gridUm - cx;
      segments[o + 5] = far[e + 1] * gridUm - cy;
      segments[o + 6] = far[e + 2] * gridUm - cz;
      segments[o + 7] = radius(far[e + 3]);
    }
    // A box kept for the finer levels is not handed over: its cells are numbered again in place.
    if (!isBase[level]) return { segments, segmentCells, segmentTypes: types };
    return { segments, segmentCells: segmentCells.slice(), segmentTypes: types.slice() };
  };
  return { data, boxes, levels, readBox };
}
