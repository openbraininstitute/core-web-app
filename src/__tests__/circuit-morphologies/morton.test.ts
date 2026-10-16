import { describe, expect, it } from 'vitest';

import { mortonOrder } from '@/features/circuit-viewer/morphologies/load/morton';

import type { MorphologySegments } from '@/features/circuit-viewer/morphologies/types';

/** A segment a point, from it to a micrometre along x, each of a cell and a type of its own. */
const segmentsFrom = (points: number[][]): MorphologySegments => ({
  segments: Float32Array.from(points.flatMap(([x, y, z]) => [x, y, z, 1, x + 1, y, z, 2])),
  segmentCells: Uint32Array.from(points, (_, i) => 10 + i),
  segmentTypes: Uint8Array.from(points, (_, i) => i + 1),
});

const startsOf = ({ segments, segmentCells }: MorphologySegments) =>
  Array.from(segmentCells, (_, i) => Array.from(segments.subarray(8 * i, 8 * i + 3)));

describe('mortonOrder', () => {
  it('orders segments by their midpoints, x, y then z at each step, each with its cell and type', () => {
    const corners = [
      [0, 10, 10],
      [10, 0, 0],
      [10, 10, 0],
      [0, 0, 10],
      [0, 0, 0],
      [10, 0, 10],
      [0, 10, 0],
      [10, 10, 10],
    ];
    const out = mortonOrder(segmentsFrom(corners));
    const starts = startsOf(out);
    expect(starts).toEqual([
      [0, 0, 0],
      [10, 0, 0],
      [0, 10, 0],
      [10, 10, 0],
      [0, 0, 10],
      [10, 0, 10],
      [0, 10, 10],
      [10, 10, 10],
    ]);
    starts.forEach(([x, y, z], i) => {
      const was = corners.findIndex((corner) => corner.join() === [x, y, z].join());
      expect(out.segmentCells[i]).toBe(10 + was);
      expect(out.segmentTypes[i]).toBe(was + 1);
      expect(Array.from(out.segments.subarray(8 * i + 3, 8 * i + 8))).toEqual([1, x + 1, y, z, 2]);
    });
  });

  it('keeps the order they came in for segments of one code', () => {
    const together = [
      [5, 5, 5],
      [0, 0, 0],
      [5, 5, 5.001],
      [5, 5, 5.002],
    ];
    const out = mortonOrder(segmentsFrom(together));
    expect(Array.from(out.segmentCells)).toEqual([11, 10, 12, 13]);
  });

  it('leaves a single segment as it is', () => {
    const one = segmentsFrom([[1, 2, 3]]);
    expect(mortonOrder(one)).toBe(one);
  });
});
