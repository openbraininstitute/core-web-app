// @vitest-environment node
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';

import { BLOCK, SegmentArena } from '@/features/circuit-viewer/morphologies/engine/segment-arena';
import {
  type ArenaBuffers,
  arenaOnGpu,
  arenaStorage,
} from '@/features/circuit-viewer/morphologies/engine/webgpu/arena-gpu';

import type * as GPU from 'three/webgpu';
import type { MorphologySegments } from '@/features/circuit-viewer/morphologies/types';

/** A buffer of the fake device: its bytes, as the queue wrote them. */
interface Bytes {
  label: string;
  bytes: Uint8Array;
  destroy: () => void;
}

/**
 * A device whose buffers are bytes, which its queue writes as WebGPU's `writeBuffer` does a typed array; with
 * `outOfMemory`, the buffers made in an error scope of that filter are out of memory.
 */
function fakeDevice(outOfMemory = false) {
  const made: Bytes[] = [];
  const scopes: GPUErrorFilter[] = [];
  const device = {
    createBuffer: ({ size, label }: { size: number; label: string }) => {
      const buffer = { label, bytes: new Uint8Array(size), destroy: vi.fn() };
      made.push(buffer);
      return buffer;
    },
    pushErrorScope: (filter: GPUErrorFilter) => scopes.push(filter),
    popErrorScope: async () =>
      scopes.pop() === 'out-of-memory' && outOfMemory ? new Error('out of memory') : null,
    queue: {
      writeBuffer: (
        buffer: Bytes,
        offset: number,
        data: Float32Array | Uint32Array,
        start: number,
        count: number
      ) => {
        const per = data.BYTES_PER_ELEMENT;
        buffer.bytes.set(
          new Uint8Array(data.buffer, data.byteOffset + start * per, count * per),
          offset
        );
      },
    },
  };
  return { device: device as unknown as GPUDevice, made };
}

/** A renderer whose backend holds something of each object, as three r186's does. */
function fakeRenderer() {
  const held = new WeakMap<object, { buffer?: unknown }>();
  const get = (object: object) => {
    if (!held.has(object)) held.set(object, {});
    return held.get(object) as { buffer?: unknown };
  };
  return { renderer: { backend: { get } } as unknown as GPU.WebGPURenderer, get };
}

function segmentsOf(box: number, count: number): MorphologySegments {
  return {
    segments: Float32Array.from({ length: 8 * count }, (_, k) => 1000 * box + k + 1),
    segmentCells: Uint32Array.from({ length: count }, (_, i) => box + i),
    segmentTypes: new Uint8Array(count).fill(3),
  };
}

/**
 * An arena on the fake device, its own arrays, the buffers it handed the culling, and how often it told of a device out
 * of memory.
 */
function arenaOnFake(capacity: number, outOfMemory = false) {
  const { device, made } = fakeDevice(outOfMemory);
  const { renderer, get } = fakeRenderer();
  const storage = arenaStorage();
  const told: (ArenaBuffers | null)[] = [];
  const memory = vi.fn();
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
      return arenaOnGpu(renderer, device, storage, arrays, (buffers) => told.push(buffers), memory);
    }
  );
  const bytesOf = (label: string) => (made.find((b) => b.label === label) as Bytes).bytes;
  return { arena, arrays, storage, told, made, bytesOf, memory, backendOf: get };
}

const asBytes = (array: Float32Array | Uint32Array, count: number) =>
  new Uint8Array(array.buffer, array.byteOffset, count * array.BYTES_PER_ELEMENT);

describe("an arena on the page's GPU buffers", () => {
  it('makes the lists the culling fills and tells it of them, and of none once let go of', () => {
    const capacity = 16 * BLOCK;
    const { arena, storage, told, made } = arenaOnFake(capacity);
    expect(storage.capacity.value).toBe(capacity);
    expect(told).toHaveLength(1);
    const sizes = Object.fromEntries(made.map((b) => [b.label, b.bytes.length]));
    expect(sizes).toEqual({
      'arena ends': 32 * capacity,
      'arena words': 4 * capacity,
      'arena blocks': (32 * capacity) / BLOCK,
      'arena lists': 8 * capacity,
      'arena blocks passed': (4 * capacity) / BLOCK,
      // A word a 32 blocks, and 32 bytes at least.
      'arena blocks marked': 32,
    });

    arena.dispose();
    expect(told).toEqual([told[0], null]);
    for (const buffer of made) expect(buffer.destroy).toHaveBeenCalledOnce();
  });

  it('binds an arena made again through new attributes, which three binds again, on its own buffers', () => {
    const { arena, storage, made, backendOf } = arenaOnFake(4 * BLOCK);
    const names = ['ends', 'words', 'lists'] as const;
    const was = names.map((name) => storage[name].value);
    arena.dispose();
    arena.remade(new THREE.InstancedBufferGeometry(), 8 * BLOCK);
    names.forEach((name, k) => {
      const attribute = storage[name].value;
      expect(attribute).not.toBe(was[k]);
      expect(backendOf(attribute).buffer).toBe(made.findLast((b) => b.label === `arena ${name}`));
      expect(backendOf(was[k]).buffer).toBe(made.find((b) => b.label === `arena ${name}`));
    });
  });

  it.each([
    ['tells, a moment later, of a device out of memory for its buffers', true, false, 1],
    ['tells of nothing where the device made them', false, false, 0],
    ['tells of nothing where the arena was let go of before the device told', true, true, 0],
  ])('%s', async (_case, outOfMemory, letGo, times) => {
    const { arena, memory } = arenaOnFake(16 * BLOCK, outOfMemory);
    expect(memory).not.toHaveBeenCalled();
    if (letGo) arena.dispose();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(memory).toHaveBeenCalledTimes(times);
  });

  it("keeps the GPU's ends, words and blocks those of the arena up to its end, through holes and compaction", () => {
    const { arena, arrays, bytesOf } = arenaOnFake(6 * BLOCK);
    const expectSame = () => {
      const end = arena.geometry.instanceCount;
      expect(bytesOf('arena ends').subarray(0, 32 * end)).toEqual(asBytes(arrays.ends, 8 * end));
      expect(bytesOf('arena words').subarray(0, 4 * end)).toEqual(asBytes(arrays.words, end));
      expect(bytesOf('arena blocks').subarray(0, (32 * end) / BLOCK)).toEqual(
        asBytes(arrays.blocks, (8 * end) / BLOCK)
      );
    };
    arena.put(0, segmentsOf(0, 70));
    arena.put(1, segmentsOf(1, 10));
    arena.put(2, segmentsOf(2, 64));
    expectSame();
    arena.remove(0);
    expectSame();
    arena.put(3, segmentsOf(3, 100));
    arena.remove(1);
    expectSame();
    // No hole and no room at the end hold three blocks: every box is moved down.
    arena.put(4, segmentsOf(4, 150));
    expectSame();
    arena.remove(4);
    arena.remove(2);
    expectSame();
  });
});
