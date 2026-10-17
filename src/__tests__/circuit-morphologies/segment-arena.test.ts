// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import {
  CELL_MASK,
  HOLE,
  TYPE_SHIFT,
} from '@/features/circuit-viewer/morphologies/engine/impostors';
import {
  BLOCK,
  roomFor,
  SegmentArena,
} from '@/features/circuit-viewer/morphologies/engine/segment-arena';

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

/** An arena of `capacity` segments, with room for `base`, its arrays and what it told its uploads. */
function arenaOf(capacity: number, base?: number[]) {
  const told: [number, number, boolean][] = [];
  const dispose = vi.fn();
  let arrays: { ends: Float32Array; words: Uint32Array; blocks: Float32Array } = {
    ends: new Float32Array(),
    words: new Uint32Array(),
    blocks: new Float32Array(),
  };
  const arena = new SegmentArena(
    new THREE.InstancedBufferGeometry(),
    capacity,
    (ends, words, blocks) => {
      arrays = { ends, words, blocks };
      return { upload: (...range) => told.push(range), dispose };
    },
    base
  );
  return { arena, ...arrays, blockWords: new Uint32Array(arrays.blocks.buffer), told, dispose };
}

type Made = ReturnType<typeof arenaOf>;

/** `blocks` marked, a bit a block. */
const marked = (...blocks: number[]) => {
  const words = new Uint32Array(2);
  for (const block of blocks) words[block >> 5] |= 1 << (block & 31);
  return words;
};

const cellAt = (words: Uint32Array, i: number) => words[i] & CELL_MASK;
const typeAt = (words: Uint32Array, i: number) => words[i] >>> TYPE_SHIFT;

/**
 * What is drawn is the segments of `drawn`, each box whole and unchanged and together from the start of a block, holes
 * aside, and nothing else; those of `put` put, the others their bases.
 */
function expectDrawn({ arena, ends, words }: Made, drawn: Map<number, number>, put = drawn) {
  const seen: number[] = [];
  const wrong: number[] = [];
  let holes = 0;
  for (let i = 0; i < arena.geometry.instanceCount; i++) {
    if (typeAt(words, i) === HOLE) {
      holes++;
      continue;
    }
    const cell = cellAt(words, i);
    seen.push(cell);
    let right = typeAt(words, i) === cell % 251;
    for (let k = 0; k < 8; k++) right &&= ends[8 * i + k] === cell + k;
    // A box's first segment starts a block, and the next segment of the same box comes next.
    right &&= cell % 1000 === 0 ? i % BLOCK === 0 : cellAt(words, i - 1) === cell - 1;
    if (!right) wrong.push(i);
  }
  expect(wrong).toEqual([]);
  const want = [...drawn].flatMap(([box, n]) => Array.from(segmentsOf(box, n).segmentCells));
  expect(seen.sort((a, b) => a - b)).toEqual(want.sort((a, b) => a - b));
  expect(arena.segments).toBe(want.length);
  expect(holes).toBe(arena.geometry.instanceCount - want.length);
  expect(arena.geometry.instanceCount % BLOCK).toBe(0);
  for (const [box, n] of put) expect(arena.sizeOf(box)).toBe(n);
}

/**
 * Each block's box over its segments drawn, those its first, every end 1.15 of its radius out; a block with none all
 * zeros.
 */
function expectBlocks({ arena, ends, words, blocks, blockWords }: Made) {
  for (let b = 0; b < arena.capacity / BLOCK; b++) {
    const row = Array.from(blocks.subarray(8 * b, 8 * b + 8));
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    let count = 0;
    let last = BLOCK * b - 1;
    for (let i = BLOCK * b; i < BLOCK * (b + 1) && i < arena.geometry.instanceCount; i++) {
      if (typeAt(words, i) === HOLE) continue;
      count++;
      last = i;
      for (const k of [8 * i, 8 * i + 4]) {
        for (let a = 0; a < 3; a++) {
          lo[a] = Math.min(lo[a], ends[k + a] - 1.15 * ends[k + 3]);
          hi[a] = Math.max(hi[a], ends[k + a] + 1.15 * ends[k + 3]);
        }
      }
    }
    if (count === 0) {
      expect(Array.from(blockWords.subarray(8 * b, 8 * b + 8))).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
      continue;
    }
    // Its segments are its first.
    expect(last).toBe(BLOCK * b + count - 1);
    expect([row[0], row[1], row[2]]).toEqual(lo.map(Math.fround));
    expect([row[4], row[5], row[6]]).toEqual(hi.map(Math.fround));
    expect(blockWords[8 * b + 3]).toBe(BLOCK * b);
    expect(blockWords[8 * b + 7]).toBe(count);
  }
}

/** The segments and blocks that differ from `before`, each within a range told, or past the end. */
function expectUploaded({ arena, ends, words, blocks, told }: Made, before: Made) {
  const end = arena.geometry.instanceCount;
  const toldOf = (i: number, ofEnds: boolean) =>
    told.some(
      ([start, count, wordsOnly]) => start <= i && i < start + count && !(ofEnds && wordsOnly)
    );
  const untold: string[] = [];
  for (let i = 0; i < end; i++) {
    if (words[i] !== before.words[i] && !toldOf(i, false)) untold.push(`word ${i}`);
    if (typeAt(words, i) === HOLE) continue;
    const moved = ends.subarray(8 * i, 8 * i + 8).some((v, k) => v !== before.ends[8 * i + k]);
    if (moved && !toldOf(i, true)) untold.push(`ends ${i}`);
  }
  for (let b = 0; b < end / BLOCK; b++) {
    const changed = blocks
      .subarray(8 * b, 8 * b + 8)
      .some((v, k) => v !== before.blocks[8 * b + k]);
    if (
      changed &&
      !told.some(([start, count]) => start < BLOCK * (b + 1) && BLOCK * b < start + count)
    ) {
      untold.push(`block ${b}`);
    }
  }
  expect(untold).toEqual([]);
}

const copyOf = (made: Made): Made => ({
  ...made,
  ends: made.ends.slice(),
  words: made.words.slice(),
  blocks: made.blocks.slice(),
});

describe('SegmentArena', () => {
  it('puts each box at the start of a block, its last block filled out with holes', () => {
    const made = arenaOf(4 * BLOCK);
    const { arena, words, told } = made;
    expect(arena.put(1, segmentsOf(1, 3))).toBe(BLOCK);
    expect(arena.put(2, segmentsOf(2, 70))).toBe(2 * BLOCK);

    expect(told).toEqual([
      [0, BLOCK, false],
      [BLOCK, 2 * BLOCK, false],
    ]);
    expect(typeAt(words, 3)).toBe(HOLE);
    expect(typeAt(words, 3 * BLOCK - 1)).toBe(HOLE);
    expect(arena.geometry.instanceCount).toBe(3 * BLOCK);
    expect(arena.free).toBe(BLOCK);
    expectDrawn(
      made,
      new Map([
        [1, 3],
        [2, 70],
      ])
    );
    expectBlocks(made);
  });

  it('keeps with each block the box its segments are drawn in, and how many', () => {
    const made = arenaOf(4 * BLOCK);
    const { arena, blocks, blockWords } = made;
    // Every segment a point at the origin but the first, whose ends are the first block's least and greatest.
    const segments = { ...segmentsOf(2, 70), segments: new Float32Array(8 * 70) };
    segments.segments.set([-10, -20, -30, 2, 500, 600, 700, 4]);
    arena.put(2, segments);

    const near = [-10, -20, -30].map((v) => Math.fround(v - 1.15 * 2));
    const far = [500, 600, 700].map((v) => Math.fround(v + 1.15 * 4));
    expect(Array.from(blocks.subarray(0, 3))).toEqual(near);
    expect(Array.from(blocks.subarray(4, 7))).toEqual(far);
    expect([blockWords[3], blockWords[7]]).toEqual([0, BLOCK]);
    expect([blockWords[8 + 3], blockWords[8 + 7]]).toEqual([BLOCK, 6]);
    expectBlocks(made);

    arena.remove(2);
    expect(blockWords.every((word) => word === 0)).toBe(true);
  });

  it('leaves a hole where a box is let go of, uploading its words alone, its blocks emptied', () => {
    const made = arenaOf(4 * BLOCK);
    const { arena, words, told } = made;
    arena.put(1, segmentsOf(1, 5));
    arena.put(2, segmentsOf(2, 6));
    told.length = 0;
    expect(arena.remove(1)).toBe(1);

    expect([0, 1, 2, 3, 4].map((i) => typeAt(words, i))).toEqual([HOLE, HOLE, HOLE, HOLE, HOLE]);
    expect(told).toEqual([[0, 5, true]]);
    expect(arena.geometry.instanceCount).toBe(2 * BLOCK);
    expect(arena.free).toBe(3 * BLOCK);
    expectDrawn(made, new Map([[2, 6]]));
    expectBlocks(made);
  });

  it('puts a box in the smallest hole it fits in, else after the last', () => {
    const { arena, told } = arenaOf(30 * BLOCK);
    // Of 5, 1, 3, 1 and 4 blocks.
    for (const [box, n] of [
      [1, 300],
      [2, 10],
      [3, 150],
      [4, 10],
      [5, 200],
    ]) {
      arena.put(box, segmentsOf(box, n));
    }
    arena.remove(1);
    arena.remove(3);
    told.length = 0;
    arena.put(6, segmentsOf(6, 100));

    // Into the hole of 3 blocks at the sixth, not the one of 5 at the first.
    expect(told).toEqual([[6 * BLOCK, 2 * BLOCK, false]]);
    arena.put(7, segmentsOf(7, 400));
    expect(told.at(-1)).toEqual([14 * BLOCK, 7 * BLOCK, false]);
    expect(arena.geometry.instanceCount).toBe(21 * BLOCK);
  });

  it('draws only up to the last box, and less once it goes, the holes before it with it, uploading nothing past it', () => {
    const made = arenaOf(4 * BLOCK);
    const { arena, told } = made;
    arena.put(1, segmentsOf(1, 3));
    arena.put(2, segmentsOf(2, 3));
    arena.put(3, segmentsOf(3, 3));
    arena.remove(2);
    expect(arena.geometry.instanceCount).toBe(3 * BLOCK);
    told.length = 0;
    expect(arena.remove(3)).toBe(0);
    expect(arena.geometry.instanceCount).toBe(BLOCK);
    expect(told).toEqual([]);
    expectBlocks(made);
    arena.put(4, segmentsOf(4, 2));
    expect(told).toEqual([[BLOCK, BLOCK, false]]);
  });

  it('closes the holes where a box fits neither in one nor after the last, uploading every box, its blocks with it', () => {
    const made = arenaOf(3 * BLOCK);
    const { arena, told } = made;
    arena.put(1, segmentsOf(1, 3));
    arena.put(2, segmentsOf(2, 3));
    arena.put(3, segmentsOf(3, 3));
    arena.remove(1);
    arena.remove(3);
    expect(arena.geometry.instanceCount).toBe(2 * BLOCK);
    told.length = 0;

    expect(arena.put(4, segmentsOf(4, 70))).toBe(2 * BLOCK + BLOCK);
    expect(told).toEqual([
      [0, BLOCK, false],
      [BLOCK, 2 * BLOCK, false],
    ]);
    expect(arena.geometry.instanceCount).toBe(3 * BLOCK);
    expectDrawn(
      made,
      new Map([
        [2, 3],
        [4, 70],
      ])
    );
    expectBlocks(made);
  });

  it('tells the boxes drawn with a block marked, a bit a block', () => {
    const { arena } = arenaOf(40 * BLOCK);
    // Blocks 0 and 1, block 2, none, and blocks 3 to 32.
    arena.put(1, segmentsOf(1, BLOCK + 6));
    arena.put(2, segmentsOf(2, 10));
    arena.put(3, segmentsOf(3, 0));
    arena.put(4, segmentsOf(4, 30 * BLOCK));
    expect(arena.boxesMarked(marked())).toEqual([]);
    expect(arena.boxesMarked(marked(1, 32))).toEqual([1, 4]);
    expect(arena.boxesMarked(marked(2, 3, 4))).toEqual([2, 4]);
    arena.remove(2);
    expect(arena.boxesMarked(marked(2))).toEqual([]);
  });

  it('moves nothing for a box not drawn, nor one with no segments', () => {
    const { arena, told } = arenaOf(BLOCK);
    expect(arena.remove(9)).toBe(0);
    expect(arena.put(1, segmentsOf(1, 0))).toBe(0);
    expect(arena.sizeOf(1)).toBe(0);
    expect(arena.free).toBe(BLOCK);
    expect(arena.remove(1)).toBe(0);
    expect(arena.sizeOf(1)).toBeUndefined();
    expect(arena.geometry.instanceCount).toBe(0);
    expect(told).toEqual([]);
  });

  it('holds a whole number of blocks, and hands its uploads its arrays, letting them go when let go of', () => {
    const { arena, ends, words, blocks, dispose } = arenaOf(100);
    expect(arena.capacity).toBe(2 * BLOCK);
    expect([ends.length, words.length, blocks.length]).toEqual([16 * BLOCK, 2 * BLOCK, 16]);
    expect(arena.geometry.getAttribute('aCell')).toBeUndefined();

    arena.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("uploads to three's attributes where it is given no uploads", () => {
    const arena = new SegmentArena(new THREE.InstancedBufferGeometry(), 4 * BLOCK);
    const { geometry } = arena;
    const ends = (geometry.getAttribute('aA') as THREE.InterleavedBufferAttribute).data;
    const words = geometry.getAttribute('aCell') as THREE.InstancedBufferAttribute;
    arena.put(1, segmentsOf(1, 3));
    arena.put(2, segmentsOf(2, 3));
    arena.remove(1);

    expect(ends.updateRanges).toEqual([
      { start: 0, count: 8 * BLOCK },
      { start: 8 * BLOCK, count: 8 * BLOCK },
    ]);
    expect(words.updateRanges).toEqual([
      { start: 0, count: BLOCK },
      { start: BLOCK, count: BLOCK },
      { start: 0, count: 3 },
    ]);
    expect(ends.array[8 * BLOCK]).toBe(2000);
    expect(words.array[BLOCK] & CELL_MASK).toBe(2000);
  });

  it('refuses a box drawn already, or one that does not fit', () => {
    const { arena } = arenaOf(BLOCK);
    arena.put(1, segmentsOf(1, 3));
    expect(() => arena.put(1, segmentsOf(1, 1))).toThrow('drawn already');
    expect(() => arena.put(2, segmentsOf(2, 2))).toThrow(RangeError);
  });

  it.each([
    ['', false],
    [', and bases', true],
  ])('stays whole over a long run of boxes put and let go of%s', (_, withBase) => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const base = Array.from({ length: 60 }, () => 1 + Math.floor(random() * 100));
    const baseRoom = base.reduce((room, n) => room + roomFor(n), 0);
    const made = withBase ? arenaOf(5000 + baseRoom, base) : arenaOf(5000);
    const { arena, told } = made;
    const put = new Map<number, number>();
    const based = new Map<number, number>();
    const drawn = () => new Map([...based, ...put]);
    for (let step = 0; step < 1500; step++) {
      const box = Math.floor(random() * 60);
      const before = copyOf(made);
      told.length = 0;
      if (withBase && !arena.hasBase(box) && random() < 0.5) {
        arena.putBase(box, segmentsOf(box, base[box]));
        based.set(box, base[box]);
      } else if (put.has(box) && random() < 0.5) {
        arena.remove(box);
        put.delete(box);
      } else if (put.has(box)) {
        const n = Math.floor(random() * 300);
        if (arena.growthOf(box, n) > arena.free) continue;
        arena.replace(box, segmentsOf(box, n));
        put.set(box, n);
      } else {
        const n = Math.floor(random() * 300);
        if (roomFor(n) > arena.free) continue;
        arena.put(box, segmentsOf(box, n));
        put.set(box, n);
      }
      expectUploaded(made, before);
      expect(arena.geometry.instanceCount).toBeLessThanOrEqual(arena.capacity);
      if (step % 50 === 0) {
        expectDrawn(made, drawn(), put);
        expectBlocks(made);
      }
    }
    expect(based.size).toBe(withBase ? 60 : 0);
    expectDrawn(made, drawn(), put);
    expectBlocks(made);
  });

  describe('with a base', () => {
    it('keeps room for each box at its start, in the order of the boxes, holes until its base is put', () => {
      const made = arenaOf(10 * BLOCK, [3, 70, 0, 5]);
      const { arena, words, told } = made;
      expect(arena.keepsBase).toBe(true);
      expect(arena.baseRoom).toBe(4 * BLOCK);
      expect(told).toEqual([[0, 4 * BLOCK, true]]);
      expect(arena.geometry.instanceCount).toBe(4 * BLOCK);
      expect(arena.free).toBe(6 * BLOCK);
      expect(words.subarray(0, 4 * BLOCK).every((word) => word >>> TYPE_SHIFT === HOLE)).toBe(true);
      expect([0, 1, 2, 3].map((box) => arena.hasBase(box))).toEqual([false, false, true, false]);

      told.length = 0;
      expect(arena.putBase(1, segmentsOf(1, 70))).toBe(70);
      expect(told).toEqual([[BLOCK, 70, false]]);
      // Box 2's base has no segments.
      arena.put(2, segmentsOf(2, 10));
      expect(told.at(-1)).toEqual([4 * BLOCK, BLOCK, false]);
      expectDrawn(
        made,
        new Map([
          [1, 70],
          [2, 10],
        ]),
        new Map([[2, 10]])
      );
      expectBlocks(made);
    });

    it('hides the base of a box put, its blocks emptied, and draws it again once the box is let go of', () => {
      const made = arenaOf(10 * BLOCK, [3, 70]);
      const { arena, told } = made;
      arena.putBase(0, segmentsOf(0, 3));
      arena.putBase(1, segmentsOf(1, 70));
      told.length = 0;

      // Its room, and its base's words.
      expect(arena.put(1, segmentsOf(1, 10))).toBe(BLOCK + Math.ceil((4 * 70) / 36));
      expect(told).toEqual([
        [3 * BLOCK, BLOCK, false],
        [BLOCK, 70, true],
      ]);
      const put = new Map([[1, 10]]);
      expectDrawn(made, new Map([[0, 3], ...put]), put);
      expectBlocks(made);

      told.length = 0;
      // The box was the last: its words are past the end once it goes.
      expect(arena.remove(1)).toBe(Math.ceil((4 * 70) / 36));
      expect(told).toEqual([[BLOCK, 70, true]]);
      expect(arena.geometry.instanceCount).toBe(3 * BLOCK);
      expectDrawn(
        made,
        new Map([
          [0, 3],
          [1, 70],
        ]),
        new Map()
      );
      expectBlocks(made);
    });

    it('puts a box in place of what it has with its base hidden all along, uploading none of the base', () => {
      const made = arenaOf(10 * BLOCK, [70]);
      const { arena, told } = made;
      arena.putBase(0, segmentsOf(0, 70));
      arena.put(0, segmentsOf(0, 10));
      told.length = 0;

      // The box was the last: its words past the end once it goes, and the new ones in its place.
      expect(arena.replace(0, segmentsOf(0, 100))).toBe(2 * BLOCK);
      expect(told).toEqual([[2 * BLOCK, 2 * BLOCK, false]]);
      const put = new Map([[0, 100]]);
      expectDrawn(made, put, put);
      expectBlocks(made);
    });

    it('moves no base where it closes the holes', () => {
      const made = arenaOf(4 * BLOCK, [3, 0, 0, 0, 0, 0]);
      const { arena } = made;
      arena.putBase(0, segmentsOf(0, 3));
      arena.put(1, segmentsOf(1, 3));
      arena.put(2, segmentsOf(2, 3));
      arena.remove(1);
      arena.remove(2);
      arena.put(3, segmentsOf(3, 3));
      arena.put(4, segmentsOf(4, 3));
      arena.remove(3);

      expect(arena.put(5, segmentsOf(5, 70))).toBe(BLOCK + 2 * BLOCK);
      const put = new Map([
        [4, 3],
        [5, 70],
      ]);
      expectDrawn(made, new Map([[0, 3], ...put]), put);
      expectBlocks(made);
    });

    it('tells the boxes with a block of their base marked, unless they are put', () => {
      const { arena } = arenaOf(10 * BLOCK, [3, 70]);
      arena.putBase(0, segmentsOf(0, 3));
      arena.putBase(1, segmentsOf(1, 70));
      expect(arena.boxesMarked(marked(0))).toEqual([0]);
      expect(arena.boxesMarked(marked(2))).toEqual([1]);
      arena.put(1, segmentsOf(1, 10));
      expect(arena.boxesMarked(marked(2))).toEqual([]);
      expect(arena.boxesMarked(marked(0, 3))).toEqual([1, 0]);
    });

    it('refuses a base where it keeps no room for one, larger than its room, or put already', () => {
      expect(() => arenaOf(BLOCK).arena.putBase(0, segmentsOf(0, 1))).toThrow('no room');
      expect(() => arenaOf(BLOCK, [70])).toThrow(RangeError);
      const { arena } = arenaOf(4 * BLOCK, [3]);
      expect(() => arena.putBase(0, segmentsOf(0, 70))).toThrow(RangeError);
      arena.putBase(0, segmentsOf(0, 3));
      expect(() => arena.putBase(0, segmentsOf(0, 3))).toThrow('drawn already');
    });
  });
});
