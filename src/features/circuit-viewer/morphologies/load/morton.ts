import type { MorphologySegments } from '../types';

/** The bits per axis of a Morton code, and per pass of its sort. */
const MORTON_BITS = 10;
const SIDE = 1 << MORTON_BITS;

/** Spreads the lowest 10 bits of `bits` 3 apart. */
function spread(bits: number): number {
  let v = (bits | (bits << 16)) & 0x030000ff;
  v = (v | (v << 8)) & 0x0300f00f;
  v = (v | (v << 4)) & 0x030c30c3;
  return (v | (v << 2)) & 0x09249249;
}

/**
 * The Morton order of the points, x, y and z after one another, over the box they span: for each place in the order,
 * the index of the point there. Points of one code keep the order they came in, and points with no position sort among
 * the first.
 */
export function mortonPermutation(points: Float32Array): Uint32Array {
  const n = Math.floor(points.length / 3);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < 3 * n; i++) {
    const k = i % 3;
    if (!Number.isFinite(points[i])) continue;
    lo[k] = Math.min(lo[k], points[i]);
    hi[k] = Math.max(hi[k], points[i]);
  }
  const scale = lo.map((least, k) => SIDE / Math.max(hi[k] - least, 1e-6));
  let codes = new Uint32Array(n);
  let order = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let code = 0;
    for (let k = 0; k < 3; k++) {
      code |= spread(Math.min(SIDE - 1, Math.floor((points[3 * i + k] - lo[k]) * scale[k]))) << k;
    }
    codes[i] = code;
    order[i] = i;
  }
  // Sorts ten bits of the code a pass, the lowest first; each pass keeps the order of the pass before for equal bits.
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
  return order;
}

/** Points in the Morton order (`mortonPermutation`): where each comes from, and their positions in that order. */
export interface MortonSorted {
  order: Uint32Array;
  sorted: Float32Array;
}

/** `points`, three floats each, in the Morton order of their positions. */
export function mortonSorted(points: Float32Array): MortonSorted {
  const order = mortonPermutation(points);
  const sorted = new Float32Array(3 * order.length);
  for (let to = 0; to < order.length; to++) {
    for (let k = 0; k < 3; k++) sorted[3 * to + k] = points[3 * order[to] + k];
  }
  return { order, sorted };
}

/**
 * The segments in the Morton order of their midpoints over the box they span, segments of one code in the order they
 * came. The WebGPU tier culls blocks of 64 consecutive segments by the box around each block, and this order keeps
 * those boxes small.
 */
export function mortonOrder(read: MorphologySegments): MorphologySegments {
  const { segments, segmentCells, segmentTypes } = read;
  const n = segmentCells.length;
  if (n < 2) return read;
  // Each midpoint doubled (the sum of the ends), which gives the same order.
  const mids = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) mids[3 * i + k] = segments[8 * i + k] + segments[8 * i + 4 + k];
  }
  const order = mortonPermutation(mids);
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
