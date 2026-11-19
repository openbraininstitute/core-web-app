// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  PACKED_FAR_WGSL,
  PACKED_NEAR_WGSL,
} from '@/features/circuit-viewer/morphologies/engine/webgpu/packed-ends-wgsl';
import {
  endSums,
  floatsOf,
  MOST_STEP,
  PACKED_WORDS,
  packFar,
  strideOf,
} from '@/features/circuit-viewer/morphologies/load/packed-ends';

import { PACKING, packedOf, unpackedOf } from './packed';

const { gridUm } = PACKING;
const NEAR = [1.5, -2.25, 1000];

/** A segment from `NEAR`, its far end `steps` grid steps away, with its ends' radius steps; and whether it was clamped. */
function packed(steps: number[], radii = [0, 0]) {
  const words = new Uint32Array(PACKED_WORDS);
  floatsOf(words).set(NEAR);
  const clamped = packFar(words, 0, steps[0], steps[1], steps[2], radii[0], radii[1]);
  const ends = unpackedOf(words);
  const far = [0, 1, 2].map((k) => (ends[4 + k] - NEAR[k]) / gridUm);
  return { words, clamped, far, near: [...ends.subarray(0, 3)], radii: [ends[3], ends[7]] };
}

describe('packed ends', () => {
  it('hold the far end in 15 bits an axis, and each radius step in a byte', () => {
    const { words } = packed([1, -1, 2], [-1, 3]);
    expect(words[3]).toBe(1 | (0x7fff << 15));
    expect(words[4]).toBe((2 | (0xff << 16) | (3 << 24)) >>> 0);
  });

  it('unpack to the near end as given and the far end to the step, up to the most steps either way', () => {
    const { clamped, far, near, radii } = packed([-MOST_STEP, MOST_STEP, -1], [-128, 127]);
    expect(clamped).toBe(false);
    expect(near).toEqual(NEAR);
    for (const [k, steps] of [-MOST_STEP, MOST_STEP, -1].entries())
      expect(far[k]).toBeCloseTo(steps, 1);
    expect(radii[0]).toBeCloseTo(2 ** -8, 8);
    expect(radii[1]).toBeCloseTo(2 ** (127 / 16), 2);
  });

  it('round a longer segment to steps four times coarser at a time, without clamping it', () => {
    const fourfold = packed([MOST_STEP + 2, -9, 6]);
    expect(fourfold.clamped).toBe(false);
    expect(fourfold.words[3] >>> 30).toBe(1);
    expect(fourfold.far.map(Math.round)).toEqual([MOST_STEP + 1, -8, 8]);

    const coarsest = packed([0, -64 * MOST_STEP, 640]);
    expect(coarsest.clamped).toBe(false);
    expect(coarsest.words[3] >>> 30).toBe(3);
    expect(coarsest.far.map(Math.round)).toEqual([0, -64 * MOST_STEP, 640]);
  });

  it('round a longer segment by half a coarser step on an axis at the most', () => {
    const steps = [MOST_STEP + 3, 4098, -6];
    const { clamped, words, far } = packed(steps);
    expect(clamped).toBe(false);
    expect(words[3] >>> 30).toBe(1);
    expect(far.map((to, k) => Math.round(to) - steps[k])).toEqual([2, 2, 2]);
  });

  it('unpack in the shaders with the shifts the page reads them by', () => {
    expect(PACKED_FAR_WGSL).toContain(
      'bitcast<i32>(d << 17u) >> 17u, bitcast<i32>(d << 2u) >> 17u'
    );
    expect(PACKED_FAR_WGSL).toContain('bitcast<i32>(e << 17u) >> 17u');
    expect(PACKED_FAR_WGSL).toContain('f32(1u << (2u * (d >> 30u)))');
    expect(PACKED_FAR_WGSL).toContain('packedRadius(e >> 24u');
    expect(PACKED_NEAR_WGSL).toContain('packedRadius(e >> 16u');
  });

  it('cut a segment past the coarsest steps short along its line, and say so', () => {
    const { clamped, far } = packed([4 * 64 * MOST_STEP, 0, -4 * 64]);
    expect(clamped).toBe(true);
    expect(far.map(Math.round)).toEqual([64 * MOST_STEP, 0, -64]);
  });

  it('hold a radius step within a byte, and say so', () => {
    const thick = packed([1, 1, 1], [200, 0]);
    expect(thick.clamped).toBe(true);
    expect(thick.radii[0]).toBeCloseTo(2 ** (127 / 16), 2);
    const thin = packed([1, 1, 1], [0, -200]);
    expect(thin.clamped).toBe(true);
    expect(thin.radii[1]).toBeCloseTo(2 ** -8, 8);
  });

  it('sum to twice their midpoints', () => {
    const ends = Float32Array.of(
      ...[0, 10, 20, 1, 2.5, 9, 20, 2],
      ...[-3, 0, 4, 0.5, 400, -800, 1200, 0.25],
      ...[0, 0, 0, 1, 4000, 0, -40, 1],
      ...[0, 0, 0, 1, 16, -25000, 0, 1]
    );
    const words = packedOf(ends);
    expect([0, 1, 2, 3].map((i) => words[5 * i + 3] >>> 30)).toEqual([0, 1, 2, 3]);
    const sums = new Float32Array(12);
    endSums(words, gridUm, sums);
    const unpacked = unpackedOf(words);
    for (let k = 0; k < 12; k++) {
      const o = 8 * Math.floor(k / 3) + (k % 3);
      expect(sums[k]).toBeCloseTo(unpacked[o] + unpacked[o + 4], 3);
    }
    expect([...unpacked]).toEqual([...ends]);
  });

  it('take five words a segment, where floats take eight', () => {
    expect(strideOf(new Uint32Array(5))).toBe(5);
    expect(strideOf(new Float32Array(8))).toBe(8);
  });
});
