// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';

import {
  CELL_MASK,
  HOLE,
  TYPE_SHIFT,
} from '@/features/circuit-viewer/morphologies/engine/impostors';
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
  const words = geometry.getAttribute('aCell') as THREE.InstancedBufferAttribute;
  return { ends, words };
}

const cellAt = (words: THREE.InstancedBufferAttribute, i: number) => words.array[i] & CELL_MASK;
const typeAt = (words: THREE.InstancedBufferAttribute, i: number) => words.array[i] >>> TYPE_SHIFT;

/** What is drawn is the segments of `drawn`, each whole and unchanged and together, holes aside, and nothing else. */
function expectDrawn(arena: SegmentArena, drawn: Map<number, number>) {
  const { ends, words } = attributes(arena);
  const seen: number[] = [];
  let holes = 0;
  for (let i = 0; i < arena.geometry.instanceCount; i++) {
    if (typeAt(words, i) === HOLE) {
      holes++;
      continue;
    }
    const cell = cellAt(words, i);
    seen.push(cell);
    expect(typeAt(words, i)).toBe(cell % 251);
    for (let k = 0; k < 8; k++) expect(ends.array[8 * i + k]).toBe(cell + k);
    // The next segment of the same box comes next.
    if (cell % 1000 > 0) expect(cellAt(words, i - 1)).toBe(cell - 1);
  }
  const want = [...drawn].flatMap(([box, n]) => Array.from(segmentsOf(box, n).segmentCells));
  expect(seen.sort((a, b) => a - b)).toEqual(want.sort((a, b) => a - b));
  expect(arena.segments).toBe(want.length);
  expect(holes).toBe(arena.geometry.instanceCount - want.length);
  for (const [box, n] of drawn) expect(arena.sizeOf(box)).toBe(n);
}

/** The segments that differ between two copies of the words, each within a range marked for upload. */
function expectUploaded(arena: SegmentArena, before: Uint32Array) {
  const { words } = attributes(arena);
  for (let i = 0; i < arena.geometry.instanceCount; i++) {
    if (words.array[i] === before[i]) continue;
    expect(words.updateRanges.some(({ start, count }) => start <= i && i < start + count)).toBe(
      true
    );
  }
}

const clearRanges = (arena: SegmentArena) => {
  for (const attribute of Object.values(attributes(arena))) attribute.clearUpdateRanges();
};

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
    expect(arena.geometry.instanceCount).toBe(7);
    expect(arena.free).toBe(3);
  });

  it('leaves a hole where a box is let go of, uploading its words alone', () => {
    const arena = arenaOf(20);
    arena.put(1, segmentsOf(1, 5));
    arena.put(2, segmentsOf(2, 6));
    clearRanges(arena);
    expect(arena.remove(1)).toBe(1);

    const { ends, words } = attributes(arena);
    expect([0, 1, 2, 3, 4].map((i) => typeAt(words, i))).toEqual([HOLE, HOLE, HOLE, HOLE, HOLE]);
    // The cells stay.
    expect([0, 1, 2, 3, 4].map((i) => cellAt(words, i))).toEqual([1000, 1001, 1002, 1003, 1004]);
    expect(words.updateRanges).toEqual([{ start: 0, count: 5 }]);
    expect(ends.updateRanges).toEqual([]);
    expect(arena.geometry.instanceCount).toBe(11);
    expectDrawn(arena, new Map([[2, 6]]));
  });

  it('puts a box in the smallest hole it fits in, else after the last', () => {
    const arena = arenaOf(40);
    for (const [box, n] of [
      [1, 6],
      [2, 1],
      [3, 3],
      [4, 1],
      [5, 4],
    ]) {
      arena.put(box, segmentsOf(box, n));
    }
    arena.remove(1);
    arena.remove(3);
    clearRanges(arena);
    arena.put(6, segmentsOf(6, 2));

    // Into the hole of 3 at 7, not the one of 6 at 0.
    expect(attributes(arena).words.updateRanges).toEqual([{ start: 7, count: 2 }]);
    arena.put(7, segmentsOf(7, 7));
    expect(attributes(arena).words.updateRanges.at(-1)).toEqual({ start: 15, count: 7 });
    expect(arena.geometry.instanceCount).toBe(22);
  });

  it('draws only up to the last box, and less once it goes, the holes before it with it', () => {
    const arena = arenaOf(20);
    arena.put(1, segmentsOf(1, 3));
    arena.put(2, segmentsOf(2, 3));
    arena.put(3, segmentsOf(3, 3));
    arena.remove(2);
    expect(arena.geometry.instanceCount).toBe(9);
    arena.remove(3);
    expect(arena.geometry.instanceCount).toBe(3);
    arena.put(4, segmentsOf(4, 2));
    expect(attributes(arena).words.updateRanges.at(-1)).toEqual({ start: 3, count: 2 });
  });

  it('closes the holes where a box fits neither in one nor after the last, uploading every box', () => {
    const arena = arenaOf(10);
    arena.put(1, segmentsOf(1, 3));
    arena.put(2, segmentsOf(2, 3));
    arena.put(3, segmentsOf(3, 3));
    arena.remove(1);
    arena.remove(3);
    expect(arena.geometry.instanceCount).toBe(6);

    expect(arena.put(4, segmentsOf(4, 6))).toBe(6 + 3);
    expect(arena.geometry.instanceCount).toBe(9);
    expectDrawn(
      arena,
      new Map([
        [2, 3],
        [4, 6],
      ])
    );
  });

  it('moves nothing for a box not drawn, nor one with no segments', () => {
    const arena = arenaOf(4);
    expect(arena.remove(9)).toBe(0);
    arena.put(1, segmentsOf(1, 0));
    expect(arena.sizeOf(1)).toBe(0);
    expect(arena.remove(1)).toBe(0);
    expect(arena.sizeOf(1)).toBeUndefined();
    expect(arena.geometry.instanceCount).toBe(0);
  });

  it('refuses a box drawn already, or one that does not fit', () => {
    const arena = arenaOf(4);
    arena.put(1, segmentsOf(1, 3));
    expect(() => arena.put(1, segmentsOf(1, 1))).toThrow('drawn already');
    expect(() => arena.put(2, segmentsOf(2, 2))).toThrow(RangeError);
  });

  it('stays whole over a long run of boxes put and let go of', () => {
    const arena = arenaOf(5000);
    const drawn = new Map<number, number>();
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let step = 0; step < 1500; step++) {
      const box = Math.floor(random() * 60);
      const before = attributes(arena).words.array.slice() as Uint32Array;
      clearRanges(arena);
      if (drawn.has(box)) {
        arena.remove(box);
        drawn.delete(box);
      } else {
        const n = Math.floor(random() * 300);
        if (n > arena.free) continue;
        arena.put(box, segmentsOf(box, n));
        drawn.set(box, n);
      }
      expectUploaded(arena, before);
      expect(arena.geometry.instanceCount).toBeLessThanOrEqual(arena.capacity);
      if (step % 50 === 0) expectDrawn(arena, drawn);
    }
    expectDrawn(arena, drawn);
  });
});
