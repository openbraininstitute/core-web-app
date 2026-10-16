/**
 * Reads a morphology pack: the binary file OBI-One writes of a circuit's morphologies, simplified, placed in the circuit
 * and cut into chunks of space. The format is specified in OBI-One's `docs/internal/circuit-morphology-pack.md`. The
 * index and the somas are read when the pack is opened, and the chunks a box of space at a time.
 */
// The whole of zod comes with `z` imported by name, and the reader runs in a worker of its own.
import * as z from 'zod';

import type { CircuitMorphologyData, MorphologySegments, PackBoxes, Vec3 } from '../types';

const MAGIC = 0x4b43504d;
const VERSION = 1;
const HEADER_BYTES = 12;
const COUNTS_BYTES = 8;
const SOMA_BYTES = 16;
const RUN_STREAMS = 7;
const UNSIGNED_STREAMS = 3;
const STREAMS = 11;

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
        chunks: z.object({ box: z.array(steps), bytes: z.array(count), segments: z.array(count) }),
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

interface Target {
  out: MorphologySegments;
  centre: Vec3;
  gridUm: number;
  radiusSteps: number;
  cells: number;
  /** An array a stream, as long as the largest chunk has segments. */
  streams: Int32Array[];
}

/** A chunk's inflated block, written out as the `count` segments from `first` on. */
function writeChunk(
  inflated: Uint8Array,
  corner: Vec3,
  first: number,
  count: number,
  { out, centre, gridUm, radiusSteps, cells, streams }: Target
) {
  if (inflated.length < COUNTS_BYTES) throw new PackError(CUT_SHORT);
  const counts = new DataView(inflated.buffer, inflated.byteOffset, COUNTS_BYTES);
  const runs = counts.getUint32(0, true);
  if (counts.getUint32(4, true) !== count || runs > count) throw new PackError(AT_ODDS);
  let at = COUNTS_BYTES;
  for (let s = 0; s < STREAMS; s++) {
    at = readStream(
      inflated,
      at,
      s < RUN_STREAMS ? runs : count,
      s >= UNSIGNED_STREAMS,
      streams[s]
    );
  }
  if (at !== inflated.length) throw new PackError('morphology pack chunk with bytes left over');
  const [cellSteps, types, lengths, startX, startY, startZ, startR, dx, dy, dz, dr] = streams;
  const { segments, segmentCells, segmentTypes } = out;
  const [cx, cy, cz] = centre;
  const radius = (steps: number) => 2 ** (steps / radiusSteps);

  let cell = 0;
  let segment = 0;
  for (let run = 0; run < runs; run++) {
    cell += cellSteps[run];
    const end = segment + lengths[run];
    if (cell < 0 || cell >= cells || end > count) throw new PackError(AT_ODDS);
    let x = corner[0] + startX[run];
    let y = corner[1] + startY[run];
    let z = corner[2] + startZ[run];
    let r = startR[run];
    let radiusUm = radius(r);
    for (; segment < end; segment++) {
      const o = 8 * (first + segment);
      segments[o] = x * gridUm - cx;
      segments[o + 1] = y * gridUm - cy;
      segments[o + 2] = z * gridUm - cz;
      segments[o + 3] = radiusUm;
      x += dx[segment];
      y += dy[segment];
      z += dz[segment];
      r += dr[segment];
      radiusUm = radius(r);
      segments[o + 4] = x * gridUm - cx;
      segments[o + 5] = y * gridUm - cy;
      segments[o + 6] = z * gridUm - cz;
      segments[o + 7] = radiusUm;
      segmentCells[first + segment] = cell;
      segmentTypes[first + segment] = types[run];
    }
  }
  if (segment !== count) throw new PackError(AT_ODDS);
}

/** The bits of a Morton code an axis, and of each pass of its sort. */
const MORTON_BITS = 10;
const SIDE = 1 << MORTON_BITS;

/** `bits`' lowest 10 spread 3 apart. */
function spread(bits: number): number {
  let v = (bits | (bits << 16)) & 0x030000ff;
  v = (v | (v << 8)) & 0x0300f00f;
  v = (v | (v << 4)) & 0x030c30c3;
  return (v | (v << 2)) & 0x09249249;
}

/**
 * The segments in the Morton order of their midpoints over the box they span, those of one code in the order they came:
 * the WebGPU tier's culling tests blocks of 64 segments, one after another, by the box around them, which this keeps
 * small.
 */
export function mortonOrder(read: MorphologySegments): MorphologySegments {
  const { segments, segmentCells, segmentTypes } = read;
  const n = segmentCells.length;
  if (n < 2) return read;
  // Each midpoint taken twice over, which orders them the same.
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      const mid = segments[8 * i + k] + segments[8 * i + 4 + k];
      lo[k] = Math.min(lo[k], mid);
      hi[k] = Math.max(hi[k], mid);
    }
  }
  const scale = lo.map((least, k) => SIDE / Math.max(hi[k] - least, 1e-6));
  let codes = new Uint32Array(n);
  let order = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let code = 0;
    for (let k = 0; k < 3; k++) {
      const mid = segments[8 * i + k] + segments[8 * i + 4 + k];
      code |= spread(Math.min(SIDE - 1, Math.floor((mid - lo[k]) * scale[k]))) << k;
    }
    codes[i] = code;
    order[i] = i;
  }
  // Ten bits of the code a pass, the lowest first, each pass keeping the order of the one before.
  let nextCodes = new Uint32Array(n);
  let nextOrder = new Uint32Array(n);
  const starts = new Uint32Array(SIDE);
  for (let shift = 0; shift < 3 * MORTON_BITS; shift += MORTON_BITS) {
    starts.fill(0);
    for (let i = 0; i < n; i++) starts[(codes[i] >>> shift) & (SIDE - 1)]++;
    for (let b = 0, at = 0; b < SIDE; b++) {
      const count = starts[b];
      starts[b] = at;
      at += count;
    }
    for (let i = 0; i < n; i++) {
      const to = starts[(codes[i] >>> shift) & (SIDE - 1)]++;
      nextCodes[to] = codes[i];
      nextOrder[to] = order[i];
    }
    [codes, nextCodes] = [nextCodes, codes];
    [order, nextOrder] = [nextOrder, order];
  }
  const out: MorphologySegments = {
    segments: new Float32Array(8 * n),
    segmentCells: new Uint32Array(n),
    segmentTypes: new Uint8Array(n),
  };
  for (let to = 0; to < n; to++) {
    const from = order[to];
    for (let k = 0; k < 8; k++) out.segments[8 * to + k] = segments[8 * from + k];
    out.segmentCells[to] = segmentCells[from];
    out.segmentTypes[to] = segmentTypes[from];
  }
  return out;
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
 * Every level's chunks gathered in boxes of the pack's coarsest grid, which a level's chunks lie in as its steps double
 * from one level to the next: each box's least and greatest corner, in grid steps, and the chunks in it, by level.
 */
function gatherBoxes(index: PackIndex): { corners: number[]; inBox: number[][][] } {
  const steps = Math.max(1, ...index.levels.map((level) => level.chunkSteps));
  const numbers = new Map<string, number>();
  const corners: number[] = [];
  const inBox: number[][][] = [];
  index.levels.forEach(({ chunks, chunkSteps }, level) => {
    for (let chunk = 0; 3 * chunk < chunks.box.length; chunk++) {
      const least = [0, 1, 2].map((k) => chunks.box[3 * chunk + k] * chunkSteps);
      const key = least.map((at) => Math.floor(at / steps)).join();
      let box = numbers.get(key);
      if (box === undefined) {
        box = numbers.size;
        numbers.set(key, box);
        corners.push(...least, ...least.map((at) => at + chunkSteps));
        inBox.push(index.levels.map(() => []));
      } else {
        for (let k = 0; k < 3; k++) {
          corners[6 * box + k] = Math.min(corners[6 * box + k], least[k]);
          corners[6 * box + 3 + k] = Math.max(corners[6 * box + 3 + k], least[k] + chunkSteps);
        }
      }
      inBox[box][level].push(chunk);
    }
  });
  return { corners, inBox };
}

/** A pack opened: its somas and frame, where its segments lie, and each box's read when asked for. */
export interface Pack extends PackBoxes {
  /** The somas, the populations, the frame and the bounds, with no segments; the level is the finest. */
  data: CircuitMorphologyData;
  /** The segments level `level` has in box `box`, in Morton order, their cells numbered as the pack numbers them. */
  readBox(level: number, box: number): Promise<MorphologySegments>;
}

/** The index and the somas of a pack, read now; its chunks are read a box at a time (`readBox`). */
export async function openPack(bytes: Uint8Array): Promise<Pack> {
  const { index, blocks } = await openIndex(bytes);
  for (const { chunks, chunkSteps, segments } of index.levels) {
    if (
      chunks.box.length !== 3 * chunks.bytes.length ||
      chunks.segments.length !== chunks.bytes.length ||
      sum(chunks.segments) !== segments ||
      (chunkSteps === 0 && chunks.bytes.length > 0)
    ) {
      throw new PackError(AT_ODDS);
    }
  }
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

  const { corners, inBox } = gatherBoxes(index);
  const count = corners.length / 6;
  const boxes = Float32Array.from(corners, (steps, i) => steps * index.gridUm - centre[i % 3]);
  const levels = index.levels.map(({ toleranceUm, pruneUm, chunks }, level) => ({
    toleranceUm,
    pruneUm,
    segments: Uint32Array.from({ length: count }, (_, b) =>
      sum(inBox[b][level].map((chunk) => chunks.segments[chunk]))
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
  // A level's, as long as its largest chunk, made at its first read.
  const streams: Int32Array[][] = [];

  const readBox = async (level: number, b: number): Promise<MorphologySegments> => {
    const at = index.levels[level];
    if (!at || !(b >= 0 && b < count)) {
      throw new RangeError(`morphology pack without a box ${b} at level ${level}`);
    }
    const { chunks, chunkSteps } = at;
    const n = levels[level].segments[b];
    const out: MorphologySegments = {
      segments: new Float32Array(8 * n),
      segmentCells: new Uint32Array(n),
      segmentTypes: new Uint8Array(n),
    };
    const largest = chunks.segments.reduce((most, n) => Math.max(most, n), 0);
    streams[level] ??= Array.from({ length: STREAMS }, () => new Int32Array(largest));
    const target: Target = {
      out,
      centre,
      gridUm: index.gridUm,
      radiusSteps: index.radiusSteps,
      cells,
      streams: streams[level],
    };
    let first = 0;
    for (const chunk of inBox[b][level]) {
      const inflated = await inflate(blockAt(blocks, offsets[level][chunk], chunks.bytes[chunk]));
      const corner = [0, 1, 2].map((k) => chunks.box[3 * chunk + k] * chunkSteps) as Vec3;
      writeChunk(inflated, corner, first, chunks.segments[chunk], target);
      first += chunks.segments[chunk];
    }
    return mortonOrder(out);
  };
  return { data, boxes, levels, readBox };
}
