// @vitest-environment node
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DetailStream } from '@/features/circuit-viewer/morphologies/engine/detail-stream';
import { BLOCK, SegmentArena } from '@/features/circuit-viewer/morphologies/engine/segment-arena';

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

function make(capacity = 1000) {
  const { chunks, reads } = chunksOf();
  const arena = new SegmentArena(new THREE.InstancedBufferGeometry(), capacity);
  const onRead = vi.fn();
  const stream = new DetailStream(chunks, arena, onRead);
  return { stream, arena, reads, onRead };
}

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
