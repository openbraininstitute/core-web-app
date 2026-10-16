import type { MorphologySegments } from '../types';

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
