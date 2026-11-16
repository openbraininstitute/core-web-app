/**
 * A segment's two ends in five words, as the WebGPU tier holds them (20 bytes, where eight floats take 32):
 *
 * - words 0 to 2: the near end's x, y and z, µm, as floats;
 * - word 3: the far end's x and y in 15 bits each, as whole steps from the near end, then two bits of scale;
 * - word 4: the far end's z in 15 bits, a spare bit, then each end's radius in a signed byte, the near end's first, as
 *   the pack's radius steps (`2 ** (step / radiusSteps)` µm).
 *
 * A step is the pack's grid times 4 to the scale. The scale is 0, and the far end exact, unless the segment is longer
 * than `MOST_STEP` grid steps on an axis (409 µm on a 25 nm grid); a longer one is rounded to the coarser steps, off by
 * under a ten-thousandth of its length. What still does not fit is clamped: a segment past 64 times that reach is cut
 * short along its line, and a radius step is held within a byte. The shaders unpack them (`packed-ends-wgsl.ts`).
 */
import type { Packing } from '../types';

/** The words a segment's ends take packed. */
export const PACKED_WORDS = 5;
export const STEP_BITS = 15;
/** The most whole steps a far end lies from its near end on an axis. */
export const MOST_STEP = 2 ** (STEP_BITS - 1) - 1;
const STEP_MASK = 2 ** STEP_BITS - 1;
const MOST_SCALE = 3;

const inByte = (step: number) => Math.max(-128, Math.min(127, step));

/**
 * Writes words 3 and 4 of the segment at word `at` of `words`: its far end `dx`, `dy` and `dz` grid steps from its
 * near end, and its ends' radius steps. Returns whether any of it was clamped.
 */
export function packFar(
  words: Uint32Array,
  at: number,
  dx: number,
  dy: number,
  dz: number,
  nearRadius: number,
  farRadius: number
): boolean {
  let x = dx;
  let y = dy;
  let z = dz;
  let scale = 0;
  let clamped = false;
  const longest = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
  if (longest > MOST_STEP) {
    while (scale < MOST_SCALE && Math.round(longest / 4 ** scale) > MOST_STEP) scale++;
    const step = 4 ** scale;
    const cut = Math.round(longest / step) > MOST_STEP ? (MOST_STEP * step) / longest : 1;
    clamped = cut < 1;
    x = Math.round((dx * cut) / step);
    y = Math.round((dy * cut) / step);
    z = Math.round((dz * cut) / step);
  }
  const a = inByte(nearRadius);
  const b = inByte(farRadius);
  words[at + 3] = ((x & STEP_MASK) | ((y & STEP_MASK) << STEP_BITS) | (scale << 30)) >>> 0;
  words[at + 4] = ((z & STEP_MASK) | ((a & 0xff) << 16) | ((b & 0xff) << 24)) >>> 0;
  return clamped || a !== nearRadius || b !== farRadius;
}

/** The words each segment's ends take in `segments`: packed, or eight floats. */
export const strideOf = (segments: Float32Array | Uint32Array) =>
  segments instanceof Uint32Array ? PACKED_WORDS : 8;

/** The floats that share `packed`'s words: a near end's coordinates are read through them. */
export const floatsOf = (packed: Uint32Array) =>
  new Float32Array(packed.buffer, packed.byteOffset, packed.length);

/** The radius of each radius byte, µm. */
export function radiiOf({ radiusSteps }: Packing): Float32Array {
  return Float32Array.from({ length: 256 }, (_, byte) => 2 ** (((byte << 24) >> 24) / radiusSteps));
}

/**
 * Writes into `ends` the `count` segments of `packed` from segment `from`, eight floats each: the near end's x, y, z
 * and radius, then the far end's. `near` is `floatsOf(packed)` and `radii` is `radiiOf` the packing.
 */
export function unpackEnds(
  packed: Uint32Array,
  near: Float32Array,
  from: number,
  count: number,
  gridUm: number,
  radii: Float32Array,
  ends: Float32Array
): void {
  for (let i = 0, p = PACKED_WORDS * from, o = 0; i < count; i++, p += PACKED_WORDS, o += 8) {
    const d = packed[p + 3];
    const e = packed[p + 4];
    const step = gridUm * 4 ** (d >>> 30);
    ends[o] = near[p];
    ends[o + 1] = near[p + 1];
    ends[o + 2] = near[p + 2];
    ends[o + 3] = radii[(e >>> 16) & 0xff];
    ends[o + 4] = near[p] + ((d << 17) >> 17) * step;
    ends[o + 5] = near[p + 1] + ((d << 2) >> 17) * step;
    ends[o + 6] = near[p + 2] + ((e << 17) >> 17) * step;
    ends[o + 7] = radii[e >>> 24];
  }
}

/** Writes into `sums`, three floats a segment, the sum of each packed segment's two ends: its midpoint doubled. */
export function endSums(packed: Uint32Array, gridUm: number, sums: Float32Array): void {
  const near = floatsOf(packed);
  for (let p = 0, o = 0; p < packed.length; p += PACKED_WORDS, o += 3) {
    const d = packed[p + 3];
    const step = gridUm * 4 ** (d >>> 30);
    sums[o] = 2 * near[p] + ((d << 17) >> 17) * step;
    sums[o + 1] = 2 * near[p + 1] + ((d << 2) >> 17) * step;
    sums[o + 2] = 2 * near[p + 2] + ((packed[p + 4] << 17) >> 17) * step;
  }
}
