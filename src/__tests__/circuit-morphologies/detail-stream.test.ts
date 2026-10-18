// @vitest-environment node
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DetailStream, LINGER } from '@/features/circuit-viewer/morphologies/engine/detail-stream';
import {
  BLOCK,
  SegmentArena,
  type UploadsOf,
} from '@/features/circuit-viewer/morphologies/engine/segment-arena';

import { boxesAt } from './boxes';

import type { DetailView } from '@/features/circuit-viewer/morphologies/engine/detail';
import type {
  BoxRead,
  DetailRules,
  MorphologyChunks,
  MorphologySegments,
} from '@/features/circuit-viewer/morphologies/types';

const h = vi.hoisted(() => ({ logError: vi.fn() }));
vi.mock('@/utils/logger', () => ({ logError: h.logError }));

const RULES: DetailRules = { budget: Infinity, pixels: 2, culling: true };
/** Each box's segments at each level, the finest first. */
const COUNTS = [100, 50, 10];
const DEPTHS = [20, 40, 60, 80];

const segmentsOf = (count: number): MorphologySegments => ({
  segments: new Float32Array(8 * count),
  segmentCells: new Uint32Array(count),
  segmentTypes: new Uint8Array(count),
});

/** Four boxes 10 µm wide down -z, and every read waiting for the test to end it. */
function chunksOf() {
  const reads: { wanted: BoxRead[]; resolve(): void; reject(e: unknown): void }[] = [];
  const chunks: MorphologyChunks = {
    ...boxesAt(DEPTHS, COUNTS),
    read: (wanted) =>
      new Promise((resolve, reject) => {
        reads.push({
          wanted,
          resolve: () => resolve(wanted.map(({ level }) => segmentsOf(COUNTS[level]))),
          reject,
        });
      }),
  };
  return { chunks, reads };
}

/**
 * An orthographic view `half` µm either side of the middle, 1000 device pixels high: 500 and more draws the coarsest
 * level, 100 the middle one, 20 the finest. The focus is on the first box.
 */
function viewOf(half: number, shift = new THREE.Vector3(), far = 1e6): DetailView {
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, far);
  camera.updateMatrixWorld();
  return {
    projection: camera.projectionMatrix,
    view: camera.matrixWorldInverse,
    orthographic: true,
    height: 1000,
    focus: new THREE.Vector3(0, 0, -20),
    shift,
  };
}

/** With `base`, an arena keeping every box's coarsest level, four blocks, and `capacity` past it. */
function make(capacity = 1000, base = false) {
  const { chunks, reads } = chunksOf();
  const arena = new SegmentArena(
    new THREE.InstancedBufferGeometry(),
    base ? 4 * BLOCK + capacity : capacity,
    undefined,
    base ? chunks.levels[2].segments : undefined
  );
  const onRead = vi.fn();
  const stream = new DetailStream(chunks, arena, onRead);
  return { stream, arena, reads, onRead };
}

/** Boxes 0 and 1 behind the eye, the focus on box 3. */
const behindOf = (half: number): DetailView => ({
  ...viewOf(half, new THREE.Vector3(0, 0, 50)),
  focus: new THREE.Vector3(0, 0, -30),
});

/** Lets the reads that were ended be taken in. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

const levelsDrawn = (stream: DetailStream) => stream.stats(RULES).levels.map(({ boxes }) => boxes);

/** Every box drawn at `half`'s level, the view still. */
async function drawnAt(half: number) {
  const made = make();
  made.stream.update(viewOf(half), RULES, true);
  made.reads[0].resolve();
  await settled();
  made.stream.apply();
  made.reads.length = 0;
  return made;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('DetailStream', () => {
  it('reads every box in view at its level, the nearest the focus first, and places them as they come', async () => {
    const { stream, arena, reads, onRead } = make();
    stream.update(viewOf(500), RULES, false);

    expect(reads.map(({ wanted }) => wanted)).toEqual([
      [0, 1, 2, 3].map((box) => ({ level: 2, box })),
    ]);
    expect(stream.apply()).toEqual({ changed: false, more: false });
    reads[0].resolve();
    await settled();
    expect(onRead).toHaveBeenCalledTimes(1);
    expect(stream.apply()).toEqual({ changed: true, more: false });
    expect(arena.segments).toBe(40);
    expect(levelsDrawn(stream)).toEqual([0, 0, 4]);
    expect(stream.stats(RULES)).toMatchObject({ drawn: 40, wanted: 40, leftOut: 0 });
  });

  it('goes finer only while the view is still', async () => {
    const { stream, reads } = await drawnAt(500);
    stream.update(viewOf(20), RULES, false);
    expect(reads).toHaveLength(0);

    stream.update(viewOf(20), RULES, true);
    expect(reads.map(({ wanted }) => wanted.map(({ level }) => level))).toEqual([[0, 0, 0, 0]]);
    reads[0].resolve();
    await settled();
    stream.apply();
    expect(levelsDrawn(stream)).toEqual([4, 0, 0]);
  });

  it('goes coarser at once, the view moving', async () => {
    const { stream, arena, reads } = await drawnAt(20);
    stream.update(viewOf(500), RULES, false);
    reads[0].resolve();
    await settled();
    stream.apply();

    expect(arena.segments).toBe(40);
    expect(levelsDrawn(stream)).toEqual([0, 0, 4]);
  });

  it('lets go of the boxes out of view at once, with no read', async () => {
    const { stream, arena, reads } = await drawnAt(500);

    expect(stream.update(viewOf(500, new THREE.Vector3(10_000, 0, 0)), RULES, false)).toBe(true);
    expect(reads).toHaveLength(0);
    expect(stream.apply()).toEqual({ changed: true, more: false });
    expect(arena.segments).toBe(0);
  });

  it('places no more than the cap in a turn, a box at the least', async () => {
    const { stream, arena, reads } = make();
    stream.update(viewOf(20), RULES, true);
    reads[0].resolve();
    await settled();

    // A box of the finest level takes two blocks of room, 128 segments.
    expect(stream.apply(300)).toEqual({ changed: true, more: true });
    expect(arena.segments).toBe(200);
    expect(stream.apply(50)).toEqual({ changed: true, more: true });
    expect(arena.segments).toBe(300);
    expect(stream.apply(300)).toEqual({ changed: true, more: false });
    expect(arena.segments).toBe(400);
  });

  it('places nothing that came in for a level no longer wanted, and reads the one that is', async () => {
    const { stream, arena, reads } = make();
    stream.update(viewOf(500), RULES, true);
    stream.update(viewOf(20), RULES, true);
    expect(reads).toHaveLength(1);
    reads[0].resolve();
    await settled();

    expect(stream.apply()).toEqual({ changed: false, more: false });
    expect(arena.segments).toBe(0);
    expect(reads.map(({ wanted }) => wanted.map(({ level }) => level))).toEqual([
      [2, 2, 2, 2],
      [0, 0, 0, 0],
    ]);
  });

  it('makes its arena for the budget, holding a larger one only as far as the boxes can take', () => {
    const { chunks } = chunksOf();
    const small = DetailStream.of(chunks, 2 * BLOCK, new THREE.InstancedBufferGeometry(), vi.fn());
    expect(small.holds(2 * BLOCK)).toBe(true);
    expect(small.holds(4 * BLOCK)).toBe(false);
    // Every box at the finest takes two blocks: eight in all, whatever the budget past them.
    const whole = DetailStream.of(chunks, 8 * BLOCK, new THREE.InstancedBufferGeometry(), vi.fn());
    expect(whole.holds(1e9)).toBe(true);
  });

  it('is made again for a larger budget, its arena let go of before the new one is made, uploaded alike', () => {
    const { chunks } = chunksOf();
    const said: string[] = [];
    const uploadsOf: UploadsOf = (_ends, words) => {
      said.push(`made ${words.length}`);
      return { upload: vi.fn(), dispose: () => said.push('disposed') };
    };
    const geometry = new THREE.InstancedBufferGeometry();
    const small = DetailStream.of(chunks, 2 * BLOCK, geometry, vi.fn(), uploadsOf);
    const larger = small.remade(4 * BLOCK, new THREE.InstancedBufferGeometry());
    expect(said).toEqual([`made ${3 * BLOCK}`, 'disposed', `made ${5 * BLOCK}`]);
    expect(larger.geometry).not.toBe(geometry);
    expect(larger.holds(4 * BLOCK)).toBe(true);

    // On three's attributes, the new quads take them.
    const quads = new THREE.InstancedBufferGeometry();
    const stream = DetailStream.of(chunks, 2 * BLOCK, new THREE.InstancedBufferGeometry(), vi.fn());
    stream.remade(4 * BLOCK, quads);
    expect(quads.getAttribute('aCell').count).toBe(5 * BLOCK);
  });

  it('made again, reads none of the boxes it could not read, nor logs a failure again', async () => {
    const { stream, reads } = make();
    // The far plane takes the box nearest the focus alone.
    stream.update(viewOf(500, undefined, 30), RULES, true);
    reads[0].reject(new Error('morphology pack chunk cut short'));
    await settled();

    const again = stream.remade(1000, new THREE.InstancedBufferGeometry());
    again.update(viewOf(500), RULES, true);
    expect(reads[1].wanted.map(({ box }) => box)).toEqual([1, 2, 3]);
    reads[1].reject(new Error('morphology pack chunk cut short'));
    await settled();
    expect(h.logError).toHaveBeenCalledTimes(1);
  });

  it('holds the budget to the room the arena holds, a box taking whole blocks', () => {
    // Room for five blocks: a box of the finest level takes two, of the others one.
    const { stream, reads } = make(5 * BLOCK);
    stream.update(viewOf(20), RULES, true);

    expect(reads[0].wanted.map(({ level }) => level)).toEqual([0, 1, 1, 1]);
    expect(stream.stats(RULES).wanted).toBe(250);
  });

  it('reads the other boxes on after a batch fails, and no more of those, logging it once', async () => {
    const { stream, arena, reads } = make();
    // The far plane takes the box nearest the focus alone.
    stream.update(viewOf(500, undefined, 30), RULES, true);
    expect(reads[0].wanted).toEqual([{ level: 2, box: 0 }]);
    reads[0].reject(new Error('morphology pack chunk cut short'));
    await settled();

    stream.update(viewOf(500), RULES, true);
    expect(reads[1].wanted.map(({ box }) => box)).toEqual([1, 2, 3]);
    reads[1].resolve();
    await settled();
    stream.apply();
    expect(arena.sizeOf(0)).toBeUndefined();
    expect(arena.segments).toBe(3 * COUNTS[2]);
    expect(h.logError).toHaveBeenCalledTimes(1);
  });

  it('keeps what is drawn of the boxes of a batch that fails', async () => {
    const { stream, arena, reads } = await drawnAt(500);
    stream.update(viewOf(20), RULES, true);
    reads[0].reject(new Error('the worker ran out of memory'));
    await settled();

    expect(h.logError).toHaveBeenCalledTimes(1);
    stream.update(viewOf(100), RULES, true);
    expect(reads).toHaveLength(1);
    expect(arena.segments).toBe(40);
  });

  it('logs no read cut short by an abort, nor one that fails once it is stopped', async () => {
    const { stream, reads } = make();
    stream.update(viewOf(500), RULES, true);
    reads[0].reject(new DOMException('aborted', 'AbortError'));
    await settled();
    stream.update(viewOf(100), RULES, true);
    stream.stop();
    reads[1].reject(new Error('gone'));
    await settled();

    expect(h.logError).not.toHaveBeenCalled();
  });

  describe('with a base', () => {
    const EVERY_BOX = [0, 1, 2, 3];
    const askedOf = (reads: { wanted: BoxRead[] }[]) =>
      reads.map(({ wanted }) => wanted.map(({ level, box }) => `${box} at ${level}`));

    /** Every read ended as it is asked for, and what came in placed. */
    async function readAll({ stream, reads }: Pick<ReturnType<typeof make>, 'stream' | 'reads'>) {
      for (let read = 0; read < reads.length; read++) {
        reads[read].resolve();
        await settled();
      }
      stream.apply();
    }

    /**
     * A block past the base: box 2 seen and drawn at the middle level; then box 3 seen, nearer the focus, which the
     * budget takes to the middle level in box 2's place, box 2 let go of; then box 3 seen no more before it came in,
     * which leaves the room box 2 had. The view still.
     */
    async function letGoOf2() {
      const made = make(BLOCK, true);
      const { stream } = made;
      seeing(stream, behindOf(20), [2]);
      await readAll(made);
      expect(levelsDrawn(stream)).toEqual([0, 1, 3]);
      expect(stream.see([2, 3], true)).toBe(true);
      stream.update(behindOf(20), RULES, true);
      stream.apply();
      expect(askedOf(made.reads).at(-1)).toEqual(['3 at 1']);
      expect(levelsDrawn(stream)).toEqual([0, 0, 4]);
      for (let read = 0; read <= LINGER.still; read++) stream.see([2], true);
      stream.update(behindOf(20), RULES, true);
      await readAll(made);
      expect(levelsDrawn(stream)).toEqual([0, 0, 4]);
      return made;
    }

    /** At rest at `view`, `boxes` seen by a frame drawn there. */
    function seeing(stream: DetailStream, view: DetailView, boxes = EVERY_BOX) {
      stream.update(view, RULES, true);
      stream.see(boxes, true);
      stream.update(view, RULES, true);
    }

    /** Box 1 with no segments at its base, the coarsest level. */
    function emptyBase() {
      const { chunks, reads } = chunksOf();
      const base = Uint32Array.from([10, 0, 10, 10]);
      const levels = chunks.levels.map((level, k) =>
        k === 2 ? { ...level, segments: base } : level
      );
      const arena = new SegmentArena(new THREE.InstancedBufferGeometry(), 1000, undefined, base);
      return { stream: new DetailStream({ ...chunks, levels }, arena, vi.fn()), reads };
    }

    it('reads the bases of the boxes in view, then the finer levels they want, then the other bases', async () => {
      const { stream, arena, reads } = make(1000, true);
      const asked = () => askedOf(reads);
      seeing(stream, behindOf(20));
      expect(asked()).toEqual([['3 at 2', '2 at 2']]);
      reads[0].resolve();
      await settled();
      expect(asked()[1]).toEqual(['3 at 0', '2 at 0']);
      expect(stream.apply()).toEqual({ changed: true, more: false });
      expect(arena.segments).toBe(20);

      reads[1].resolve();
      await settled();
      expect(asked()[2]).toEqual(['0 at 2', '1 at 2']);
      reads[2].resolve();
      await settled();
      expect(reads).toHaveLength(3);
      stream.apply();
      // The bases of those finer hidden.
      expect(arena.segments).toBe(2 * 10 + 2 * 100);
      expect(levelsDrawn(stream)).toEqual([2, 0, 2]);
      expect(stream.stats(RULES)).toMatchObject({ drawn: 220, wanted: 220, leftOut: 0 });
    });

    it('goes back to it at once, the view moving, with no read', async () => {
      const made = make(1000, true);
      const { stream, arena, reads } = made;
      seeing(stream, behindOf(20));
      await readAll(made);

      expect(stream.update(behindOf(500), RULES, false)).toBe(true);
      expect(stream.apply()).toEqual({ changed: true, more: false });
      expect(reads).toHaveLength(3);
      expect(arena.segments).toBe(40);
      expect(levelsDrawn(stream)).toEqual([0, 0, 4]);
    });

    it('has a box of no segments at the coarsest drawn at it from the start', () => {
      expect(levelsDrawn(emptyBase().stream)).toEqual([0, 0, 1]);
    });

    it('takes a box of no segments at its base as seen, which no culling can mark', async () => {
      const made = emptyBase();
      made.stream.update(viewOf(20), RULES, true);
      await readAll(made);
      expect(levelsDrawn(made.stream)).toEqual([1, 0, 3]);
    });

    it('holds the budget to the room past the base, which it does not count', () => {
      // Two blocks past it: the boxes nearest the focus at the middle level, the others at their bases.
      const { stream } = make(2 * BLOCK, true);
      seeing(stream, viewOf(20));
      expect(stream.stats(RULES)).toMatchObject({ wanted: 50 + 50 + 10 + 10, leftOut: 0 });
    });

    it('draws a box in view at its base until the culling sees it, then finer', async () => {
      const made = make(1000, true);
      const { stream, reads } = made;
      stream.update(behindOf(20), RULES, true);
      await readAll(made);
      expect(askedOf(reads)).toEqual([
        ['3 at 2', '2 at 2'],
        ['0 at 2', '1 at 2'],
      ]);
      expect(levelsDrawn(stream)).toEqual([0, 0, 4]);
      expect(stream.stats(RULES)).toMatchObject({ drawn: 40, wanted: 40 });

      // Behind the eye, which changes nothing the view wants.
      expect(stream.see([0], true)).toBe(false);
      expect(stream.see([3], true)).toBe(true);
      stream.update(behindOf(20), RULES, true);
      await readAll(made);
      expect(askedOf(reads)[2]).toEqual(['3 at 0']);
      expect(levelsDrawn(stream)).toEqual([1, 0, 3]);
    });

    it('tells no change where the pixels take the boxes seen no finer than the base', () => {
      const { stream } = make(1000, true);
      stream.update(behindOf(500), RULES, true);
      expect(stream.see([2, 3], true)).toBe(false);
      stream.update(behindOf(20), RULES, true);
      expect(stream.see([], true)).toBe(false);
      for (let read = 0; read < LINGER.still; read++) stream.see([], true);
      expect(stream.see([2], true)).toBe(true);
    });

    it('keeps what a box seen no more has while the view rests, and takes it to its base once the view moves', async () => {
      const made = make(1000, true);
      const { stream, arena } = made;
      seeing(stream, behindOf(20), [3]);
      await readAll(made);
      expect(levelsDrawn(stream)).toEqual([1, 0, 3]);
      for (let read = 0; read <= LINGER.still; read++) expect(stream.see([], true)).toBe(false);
      expect(stream.update(behindOf(20), RULES, true)).toBe(false);
      expect(levelsDrawn(stream)).toEqual([1, 0, 3]);

      stream.update(behindOf(20), RULES, false);
      for (let read = 0; read < LINGER.moving; read++) stream.see([], false);
      expect(stream.update(behindOf(20), RULES, false)).toBe(true);
      stream.apply();
      expect(levelsDrawn(stream)).toEqual([0, 0, 4]);
      expect(arena.segments).toBe(40);
      expect(stream.stats(RULES)).toMatchObject({ drawn: 40, wanted: 40 });
    });

    it('takes a box as seen for longer while the view moves, and at rest by the frames drawn since', async () => {
      const made = make(1000, true);
      const { stream } = made;
      stream.update(behindOf(20), RULES, false);
      stream.see([2, 3], false);
      for (let read = 0; read < LINGER.moving; read++) expect(stream.see([2], false)).toBe(false);
      expect(stream.see([2], false)).toBe(true);

      // Come to rest, a moving frame's read that comes late is not of the view at rest.
      stream.update(behindOf(20), RULES, true);
      expect(stream.see([2, 3], false)).toBe(false);
      expect(stream.see([2], true)).toBe(true);
      stream.update(behindOf(20), RULES, true);
      await readAll(made);
      expect(levelsDrawn(stream)).toEqual([1, 0, 3]);
      expect(made.reads.flatMap(({ wanted }) => wanted)).toContainEqual({ level: 0, box: 2 });
    });

    it.each([
      ['the view moves', (stream: DetailStream) => stream.update(behindOf(20), RULES, false)],
      [
        'the camera jumps',
        (stream: DetailStream) => stream.update(behindOf(20), RULES, true, true),
      ],
      [
        'the rules change',
        (stream: DetailStream) => stream.update(behindOf(20), { ...RULES }, true),
      ],
    ])('asks no more for a box let go of while the view rests, though there is room for it, until %s', async (_, change) => {
      const { stream, reads } = await letGoOf2();
      const asked = reads.length;
      stream.see([2], true);
      stream.update(behindOf(20), RULES, true);
      expect(reads).toHaveLength(asked);
      expect(stream.stats(RULES).wanted).toBe(40);

      change(stream);
      stream.update(behindOf(20), RULES, true);
      stream.see([2], true);
      stream.update(behindOf(20), RULES, true);
      expect(askedOf(reads)[asked]).toEqual(['2 at 1']);
    });

    it('takes a jump of the camera at rest as coming to rest anew: nothing seen until a frame there is read', async () => {
      const made = make(1000, true);
      const { stream, reads } = made;
      seeing(stream, behindOf(20), [3]);
      await readAll(made);
      expect(levelsDrawn(stream)).toEqual([1, 0, 3]);

      // Box 2 seen before the jump is not asked for after it, and box 3 keeps what it has.
      stream.see([2, 3], true);
      const { rest } = stream;
      const asked = reads.length;
      expect(stream.update(behindOf(20), RULES, true, true)).toBe(false);
      expect(stream.rest).toBe(rest + 1);
      expect(reads).toHaveLength(asked);
      expect(levelsDrawn(stream)).toEqual([1, 0, 3]);
      stream.see([2], true);
      stream.update(behindOf(20), RULES, true);
      expect(askedOf(reads)[asked]).toEqual(['2 at 0']);
    });

    it('takes a box wanted coarser to its base at once while the view moves, and reads its level once still', async () => {
      const made = make(1000, true);
      const { stream, reads } = made;
      seeing(stream, behindOf(20));
      await readAll(made);
      expect(levelsDrawn(stream)).toEqual([2, 0, 2]);

      expect(stream.update(behindOf(100), RULES, false)).toBe(true);
      stream.apply();
      expect(levelsDrawn(stream)).toEqual([0, 0, 4]);
      const asked = reads.length;
      stream.update(behindOf(100), RULES, false);
      expect(reads).toHaveLength(asked);
      // At rest, once a frame drawn there is read.
      stream.update(behindOf(100), RULES, true);
      expect(reads).toHaveLength(asked);
      stream.see(EVERY_BOX, true);
      stream.update(behindOf(100), RULES, true);
      expect(askedOf(reads)[asked]).toEqual(['3 at 1', '2 at 1']);
    });

    it('takes every box in view as seen without the culling, or once it marks none', async () => {
      const off = make(1000, true);
      off.stream.update(behindOf(20), { ...RULES, culling: false }, true);
      await readAll(off);
      expect(levelsDrawn(off.stream)).toEqual([2, 0, 2]);

      const failed = make(1000, true);
      failed.stream.update(behindOf(20), RULES, true);
      expect(failed.stream.see(null, true)).toBe(true);
      expect(failed.stream.see(null, true)).toBe(false);
      failed.stream.update(behindOf(20), RULES, true);
      await readAll(failed);
      expect(levelsDrawn(failed.stream)).toEqual([2, 0, 2]);
    });

    it('made again, takes the boxes it saw as seen', async () => {
      const made = make(1000, true);
      made.stream.update(behindOf(20), RULES, true);
      made.stream.see([3], true);
      const again = made.stream.remade(1000, new THREE.InstancedBufferGeometry());
      made.reads.length = 0;
      again.update(behindOf(20), RULES, true);
      await readAll({ stream: again, reads: made.reads });
      expect(levelsDrawn(again)).toEqual([1, 0, 3]);
    });

    it('is made with one where it holds no more than it may, and again without one where it would hold more', () => {
      const { chunks } = chunksOf();
      const said: string[] = [];
      const uploadsOf: UploadsOf = (_ends, words) => {
        said.push(`made ${words.length}`);
        return { upload: vi.fn(), dispose: () => said.push('disposed') };
      };
      // Four blocks of base, and a quarter more than the budget past it.
      const geometry = new THREE.InstancedBufferGeometry();
      const stream = DetailStream.of(chunks, 2 * BLOCK, geometry, vi.fn(), uploadsOf, 500);
      expect(said).toEqual([`made ${7 * BLOCK}`]);
      expect(stream.holds(2 * BLOCK)).toBe(true);
      expect(stream.holds(4 * BLOCK)).toBe(false);

      const without = stream.remade(4 * BLOCK, new THREE.InstancedBufferGeometry());
      expect(said).toEqual([`made ${7 * BLOCK}`, 'disposed', `made ${5 * BLOCK}`]);
      expect(without.holds(4 * BLOCK)).toBe(true);
      expect(without.holds(2 * BLOCK)).toBe(false);

      // 416 segments, which take seven blocks, more than 420.
      said.length = 0;
      DetailStream.of(chunks, 2 * BLOCK, geometry, vi.fn(), uploadsOf, 420);
      expect(said).toEqual([`made ${3 * BLOCK}`]);
    });

    it('is made again without one where it may hold none, and keeps none for a budget after', () => {
      const { chunks } = chunksOf();
      const said: string[] = [];
      const uploadsOf: UploadsOf = (_ends, words) => {
        said.push(`made ${words.length}`);
        return { upload: vi.fn(), dispose: vi.fn() };
      };
      const geometry = () => new THREE.InstancedBufferGeometry();
      const stream = DetailStream.of(chunks, 2 * BLOCK, geometry(), vi.fn(), uploadsOf, 500);
      expect(stream.keepsBase).toBe(true);

      const without = stream.remade(2 * BLOCK, geometry(), 0);
      expect(without.keepsBase).toBe(false);
      expect(said).toEqual([`made ${7 * BLOCK}`, `made ${3 * BLOCK}`]);
      // Where it may hold 500, it would want the base back for this budget.
      expect(without.holds(2 * BLOCK)).toBe(true);
      expect(without.remade(4 * BLOCK, geometry()).keepsBase).toBe(false);
    });
  });

  it('places nothing once it is stopped', async () => {
    const { stream, arena, reads, onRead } = make();
    stream.update(viewOf(500), RULES, true);
    stream.stop();
    reads[0].resolve();
    await settled();

    expect(onRead).not.toHaveBeenCalled();
    expect(stream.apply()).toEqual({ changed: false, more: false });
    expect(arena.segments).toBe(0);
  });
});
