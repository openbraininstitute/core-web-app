// @vitest-environment node
import * as THREE from 'three/webgpu';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HOLE } from '@/features/circuit-viewer/morphologies/engine/impostors';
import { arenaStorage } from '@/features/circuit-viewer/morphologies/engine/webgpu/arena-gpu';
import { Culling, DRAWS } from '@/features/circuit-viewer/morphologies/engine/webgpu/culling';

import { fakeGpu } from './fake-gpu';

import type { ArenaBuffers } from '@/features/circuit-viewer/morphologies/engine/webgpu/arena-gpu';
import type { CullTally } from '@/features/circuit-viewer/morphologies/types';

const h = vi.hoisted(() => ({ logError: vi.fn() }));
vi.mock('@/utils/logger', () => ({ logError: h.logError }));

/** The words a read of the counts finds: the counters, the draws' arguments, then the blocks marked. */
function wordsOf({ tested, kept, drawn }: CullTally, marked = [0, 0]): Uint32Array {
  const words = new Uint32Array(4 + 20 + marked.length);
  words[1] = tested;
  words[4 + DRAWS.keptFlat / 4 + 1] = kept;
  words[4 + DRAWS.seenTubes / 4 + 1] = drawn;
  words.set(marked, 24);
  return words;
}

/** What the culling hands on of a read of `counts`, no block marked, of a frame drawn still in the first rest. */
const read = (counts: CullTally, marked = [0, 0], rest = 1) => ({
  ...counts,
  marked: Uint32Array.from(marked),
  rest,
});

/** An arena of 64 blocks: two words of them marked. */
const ARENA = { marked: { size: 8 } } as unknown as ArenaBuffers;
const camera = new THREE.OrthographicCamera();
const shift = new THREE.Vector3();

function cullingOn(options?: Parameters<typeof fakeGpu>[0]) {
  const { gpu, device, renderer } = fakeGpu(options);
  const counted = vi.fn();
  const culling = new Culling(renderer, device, arenaStorage(), counted);
  culling.setArena(ARENA);
  culling.targetOf(16, 8);
  const run = (rest = 1) => culling.run(camera, shift, 12, HOLE, 100, rest);
  /** The next read mapped, finding `counts` and the blocks `marked`. */
  const map = async (counts: CullTally, marked?: number[]) => {
    gpu.found = wordsOf(counts, marked);
    gpu.maps.shift()?.();
    await Promise.resolve();
  };
  return { culling, counted, run, map, maps: gpu.maps };
}

const A = { tested: 300, kept: 200, drawn: 100 };
const B = { tested: 30, kept: 20, drawn: 10 };

describe("the culling's counts and its failures", () => {
  beforeEach(() => h.logError.mockClear());

  it('tells what each frame tested counted, and nothing of an arena let go of since', async () => {
    const { culling, counted, run, map } = cullingOn();
    expect(run()).toBe(true);
    await map(A);
    expect(counted).toHaveBeenLastCalledWith(read(A));

    run();
    culling.setArena(null);
    await map(B);
    expect(counted).toHaveBeenCalledOnce();
  });

  it('draws each list from a buffer of its own', () => {
    const { culling } = cullingOn();
    const drawn = Object.values(DRAWS).map((offset) => culling.quads(offset));
    expect(new Set(drawn.map((quads) => quads.indirect)).size).toBe(4);
    expect(drawn.every((quads) => quads.indirectOffset === 0)).toBe(true);
  });

  it('lets go of its targets with its arena', () => {
    const { culling } = cullingOn();
    const target = culling.targetOf(16, 8);
    const dispose = vi.spyOn(target, 'dispose');
    culling.setArena(null);
    expect(dispose).toHaveBeenCalledOnce();
    expect(culling.targetOf(16, 8)).not.toBe(target);
  });

  it('reads the last frame tested once a buffer is free, where every one was busy, telling the rest it was drawn in', async () => {
    const { counted, run, map, maps } = cullingOn();
    // The first frame still, the next seven moving, the ninth still in a rest after.
    for (let frame = 0; frame < 9; frame++) run(frame === 0 ? 1 : frame === 8 ? 2 : -1);
    expect(maps).toHaveLength(8);

    await map(A);
    expect(counted).toHaveBeenLastCalledWith(read(A));
    // The ninth frame's, read once the first's buffer was free.
    expect(maps).toHaveLength(8);
    for (let k = 0; k < 7; k++) await map(A);
    expect(counted).toHaveBeenLastCalledWith(read(A, undefined, -1));
    await map(B);
    expect(counted).toHaveBeenLastCalledWith(read(B, undefined, 2));
  });

  it.each([
    ['none drawn', (culling: Culling) => culling.drawNone()],
    ['every segment drawn', (culling: Culling) => culling.drawAll(100)],
  ])('reads nothing left unread once the draws are %s', async (_, draw) => {
    const { culling, run, map, maps } = cullingOn();
    for (let frame = 0; frame < 9; frame++) run();
    draw(culling);
    await map(A);
    expect(maps).toHaveLength(7);
  });

  it('hands on the blocks a frame marked with its counts', async () => {
    const { counted, run, map } = cullingOn();
    run();
    await map(A, [0b101, 0x80000000]);
    expect(counted).toHaveBeenLastCalledWith(read(A, [0b101, 0x80000000]));
  });

  it("reads all of a larger arena's marks, in a buffer made again for them", async () => {
    const { culling, counted, run, map } = cullingOn();
    run();
    await map(A);
    culling.setArena({ marked: { size: 16 } } as unknown as ArenaBuffers);
    run();
    await map(B, [1, 2, 3, 4]);
    expect(counted).toHaveBeenLastCalledWith(read(B, [1, 2, 3, 4]));
  });

  it('tells nothing of a read whose buffer was destroyed with the view', async () => {
    const { culling, counted, run, maps } = cullingOn();
    run();
    culling.dispose();
    maps.shift()?.();
    await Promise.resolve();
    expect(counted).not.toHaveBeenCalled();
  });

  it('fails for good, said once, where three made no texture of the depth', () => {
    const { culling, counted, run } = cullingOn({ textures: false });
    expect(run()).toBe(false);
    expect(run()).toBe(false);
    expect(culling.failed).toBe(true);
    expect(h.logError).toHaveBeenCalledOnce();
    expect(counted).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('fails for good where the device refuses a pass, and tells nothing it read before', async () => {
    const { culling, counted, run, map } = cullingOn({ refused: { message: 'refused' } });
    expect(run()).toBe(true);
    await Promise.resolve();
    expect(culling.failed).toBe(true);
    expect(run()).toBe(false);
    expect(h.logError).toHaveBeenCalledWith('Drawn without culling', { message: 'refused' });
    await map(A);
    expect(counted).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('reads nothing more once failed, where a frame was left unread', async () => {
    const { counted, run, map, maps } = cullingOn({ refused: { message: 'refused' } });
    for (let frame = 0; frame < 9; frame++) run();
    await Promise.resolve();
    for (let k = 0; k < 8; k++) await map(A);
    expect(maps).toHaveLength(0);
    expect(counted).toHaveBeenCalledExactlyOnceWith(null);
  });
});
