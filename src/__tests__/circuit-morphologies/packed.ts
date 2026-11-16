import {
  floatsOf,
  PACKED_WORDS,
  packFar,
  unpackerOf,
} from '@/features/circuit-viewer/morphologies/load/packed-ends';

import type { Packing } from '@/features/circuit-viewer/morphologies/types';

export const PACKING: Packing = { gridUm: 0.025, radiusSteps: 16 };

/**
 * Segments' ends, eight floats each, packed: each far end at the nearest grid step from its near end, each radius at
 * the nearest radius step.
 */
export function packedOf(ends: ArrayLike<number>, packing = PACKING): Uint32Array {
  const words = new Uint32Array((PACKED_WORDS * ends.length) / 8);
  const near = floatsOf(words);
  const steps = (o: number) => Math.round((ends[o + 4] - ends[o]) / packing.gridUm);
  const radius = (o: number) => Math.round(Math.log2(ends[o]) * packing.radiusSteps);
  for (let o = 0, p = 0; o < ends.length; o += 8, p += PACKED_WORDS) {
    for (let k = 0; k < 3; k++) near[p + k] = ends[o + k];
    packFar(words, p, steps(o), steps(o + 1), steps(o + 2), radius(o + 3), radius(o + 7));
  }
  return words;
}

/** Packed ends as eight floats each. */
export function unpackedOf(packed: Uint32Array, packing = PACKING): Float32Array {
  const count = packed.length / PACKED_WORDS;
  return unpackerOf(packing, count)(packed)(0, count);
}
