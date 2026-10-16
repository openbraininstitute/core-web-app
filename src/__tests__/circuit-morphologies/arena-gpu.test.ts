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

/** A device whose buffers are bytes, which its queue writes as WebGPU's `writeBuffer` does a typed array. */
function fakeDevice() {
  const made: Bytes[] = [];
  const device = {
    createBuffer: ({ size, label }: { size: number; label: string }) => {
      const buffer = { label, bytes: new Uint8Array(size), destroy: vi.fn() };
      made.push(buffer);
      return buffer;
    },
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
  const data = new WeakMap<object, object>();
  const get = (object: object) => {
    if (!data.has(object)) data.set(object, {});
    return data.get(object);
  };
  return { backend: { get } } as unknown as GPU.WebGPURenderer;
}

function segmentsOf(box: number, count: number): MorphologySegments {
  return {
    segments: Float32Array.from({ length: 8 * count }, (_, k) => 1000 * box + k + 1),
    segmentCells: Uint32Array.from({ length: count }, (_, i) => box + i),
    segmentTypes: new Uint8Array(count).fill(3),
  };
}

/** An arena on the fake device, its own arrays, and the buffers it handed the culling. */
function arenaOnFake(capacity: number) {
  const { device, made } = fakeDevice();
  const storage = arenaStorage();
  const told: (ArenaBuffers | null)[] = [];
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
      return arenaOnGpu(fakeRenderer(), device, storage, arrays, (buffers) => told.push(buffers));
    }
  );
  const bytesOf = (label: string) => (made.find((b) => b.label === label) as Bytes).bytes;
  return { arena, arrays, storage, told, made, bytesOf };
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
    });

    arena.dispose();
    expect(told).toEqual([told[0], null]);
    for (const buffer of made) expect(buffer.destroy).toHaveBeenCalledOnce();
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
