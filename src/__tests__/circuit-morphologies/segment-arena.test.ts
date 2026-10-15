// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import { SegmentArena } from '@/features/circuit-viewer/morphologies/engine/segment-arena';

import type { MorphologySegments } from '@/features/circuit-viewer/morphologies/types';

/** `count` segments of `box`, each told apart by its cell, `1000 * box + i`, which its ends and type carry too. */
function segmentsOf(box: number, count: number): MorphologySegments {
  const cells = Uint32Array.from({ length: count }, (_, i) => 1000 * box + i);
  return {
    segments: Float32Array.from(
      { length: 8 * count },
      (_, k) => cells[Math.floor(k / 8)] + (k % 8)
    ),
    segmentCells: cells,
    segmentTypes: Uint8Array.from(cells, (cell) => cell % 251),
  };
}

const arenaOf = (capacity: number) =>
  new SegmentArena(new THREE.InstancedBufferGeometry(), capacity);

function attributes(arena: SegmentArena) {
  const { geometry } = arena;
  const ends = (geometry.getAttribute('aA') as THREE.InterleavedBufferAttribute).data;
  const cells = geometry.getAttribute('aCell') as THREE.InstancedBufferAttribute;
  const types = geometry.getAttribute('aType') as THREE.InstancedBufferAttribute;
  return { ends, cells, types };
}

/** What is drawn is the segments of `drawn`, each whole and unchanged, and nothing else. */
function expectDrawn(arena: SegmentArena, drawn: Map<number, number>) {
  const { ends, cells, types } = attributes(arena);
  const count = arena.segments;
  expect(arena.geometry.instanceCount).toBe(count);
  const seen: number[] = [];
  for (let i = 0; i < count; i++) {
    const cell = cells.array[i];
    seen.push(cell);
    expect(types.array[i]).toBe(cell % 251);
    for (let k = 0; k < 8; k++) expect(ends.array[8 * i + k]).toBe(cell + k);
  }
  const want = [...drawn].flatMap(([box, n]) => Array.from(segmentsOf(box, n).segmentCells));
  expect(seen.sort((a, b) => a - b)).toEqual(want.sort((a, b) => a - b));
  for (const [box, n] of drawn) expect(arena.sizeOf(box)).toBe(n);
}

/** The segments that differ between two copies of the cells, each within a range marked for upload. */
function expectUploaded(arena: SegmentArena, before: Uint32Array) {
  const { cells } = attributes(arena);
  const ranges = cells.updateRanges;
  for (let i = 0; i < arena.segments; i++) {
    if (cells.array[i] === before[i]) continue;
    expect(ranges.some(({ start, count }) => start <= i && i < start + count)).toBe(true);
  }
}

describe('SegmentArena', () => {
  it('draws the boxes put in it one after another', () => {
    const arena = arenaOf(10);
    expect(arena.put(1, segmentsOf(1, 3))).toBe(3);
    expect(arena.put(2, segmentsOf(2, 4))).toBe(4);
    expectDrawn(
      arena,
      new Map([
        [1, 3],
        [2, 4],
      ])
    );
    expect(arena.free).toBe(3);
  });

  it('fills the place of a box let go of with the last segments, and uploads only those', () => {
    const arena = arenaOf(20);
    arena.put(1, segmentsOf(1, 5));
    arena.put(2, segmentsOf(2, 6));
    arena.put(3, segmentsOf(3, 2));
    const { cells } = attributes(arena);
    cells.clearUpdateRanges();
    const before = cells.array.slice() as Uint32Array;
    expect(arena.remove(1)).toBe(5);
    expectDrawn(
      arena,
      new Map([
        [2, 6],
        [3, 2],
      ])
    );
    expectUploaded(arena, before);
    expect(cells.updateRanges).toEqual([{ start: 0, count: 5 }]);
  });

  it('moves nothing for the last box let go of', () => {
    const arena = arenaOf(10);
    arena.put(1, segmentsOf(1, 3));
    arena.put(2, segmentsOf(2, 3));
    expect(arena.remove(2)).toBe(0);
    expect(arena.remove(9)).toBe(0);
    expectDrawn(arena, new Map([[1, 3]]));
  });

  it('takes a box with no segments', () => {
    const arena = arenaOf(4);
    arena.put(1, segmentsOf(1, 0));
    expect(arena.sizeOf(1)).toBe(0);
    expect(arena.remove(1)).toBe(0);
    expect(arena.sizeOf(1)).toBeUndefined();
  });

  it('refuses a box drawn already, or one that does not fit', () => {
    const arena = arenaOf(4);
    arena.put(1, segmentsOf(1, 3));
    expect(() => arena.put(1, segmentsOf(1, 1))).toThrow('drawn already');
    expect(() => arena.put(2, segmentsOf(2, 2))).toThrow(RangeError);
  });

  it('stays whole and dense over a long run of boxes put and let go of', () => {
    const arena = arenaOf(5000);
    const drawn = new Map<number, number>();
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let step = 0; step < 600; step++) {
      const box = Math.floor(random() * 60);
      const { cells } = attributes(arena);
      cells.clearUpdateRanges();
      const before = cells.array.slice() as Uint32Array;
      if (drawn.has(box)) {
        const moved = arena.remove(box);
        expect(moved).toBeLessThanOrEqual(drawn.get(box) ?? 0);
        drawn.delete(box);
      } else {
        const n = Math.floor(random() * 200);
        if (n > arena.free) continue;
        arena.put(box, segmentsOf(box, n));
        drawn.set(box, n);
      }
      expectUploaded(arena, before);
      if (step % 50 === 0) expectDrawn(arena, drawn);
    }
    expectDrawn(arena, drawn);
  });
});
