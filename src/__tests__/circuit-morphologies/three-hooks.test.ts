// @vitest-environment node
// @ts-expect-error three types none of its WebGPU backend's parts.
import WebGPUAttributeUtils from 'three/src/renderers/webgpu/utils/WebGPUAttributeUtils.js';
// @ts-expect-error three types none of its WebGPU backend's parts.
import WebGPUBindingUtils from 'three/src/renderers/webgpu/utils/WebGPUBindingUtils.js';
import { StorageBufferAttribute } from 'three/webgpu';
import { describe, expect, it, vi } from 'vitest';

import { Unfit } from '@/features/circuit-viewer/morphologies/engine/probe';
import {
  checkHooks,
  FrameTimes,
  shareBuffer,
  threeLoop,
  trackTimestamps,
} from '@/features/circuit-viewer/morphologies/engine/webgpu/three-hooks';

import type * as THREE from 'three/webgpu';

/** A renderer with what three's backend holds of each object, as r186 has it. */
function rendererWith(backend: object | null = { get: backendGet() }, extra: object = {}) {
  return { backend, ...extra } as unknown as THREE.WebGPURenderer;
}

function backendGet() {
  const data = new WeakMap<object, object>();
  return (object: object) => {
    if (!data.has(object)) data.set(object, {});
    return data.get(object);
  };
}

describe("three's private parts", () => {
  it('are all there where the backend holds what three has of each object', () => {
    expect(() => checkHooks(rendererWith())).not.toThrow();
  });

  it.each([
    ['no backend', null],
    ['a backend that holds nothing of an object', {}],
  ])('miss the backend where the renderer has %s', (_case, backend) => {
    expect(() => checkHooks(rendererWith(backend))).toThrow(
      new Unfit("three's backend.get is missing")
    );
  });

  it("hand three a buffer of the page's, which three's backend binds, making none of its own", () => {
    const bound: unknown[] = [];
    const device = {
      createBuffer: vi.fn(),
      createBindGroup: vi.fn((descriptor: { entries: { resource: unknown }[] }) => {
        bound.push(...descriptor.entries.map((entry) => entry.resource));
      }),
    };
    const backend = { get: backendGet(), device };
    const attribute = new StorageBufferAttribute(new Float32Array(4), 4);
    const buffer = {} as GPUBuffer;
    expect(shareBuffer(rendererWith(backend), attribute, buffer)).toBe(attribute);

    new WebGPUAttributeUtils(backend).createAttribute(attribute, 0);
    new WebGPUBindingUtils(backend).createBindGroup(
      { name: 'arena', bindings: [{ isStorageBuffer: true, attribute }] },
      {}
    );

    expect(device.createBuffer).not.toHaveBeenCalled();
    expect(bound).toEqual([{ buffer }]);
  });

  it('turn three’s timestamps on for a frame, where the device can, and off', () => {
    const made = (features: string[]) => {
      const backend = { get: backendGet(), trackTimestamp: true };
      const renderer = rendererWith(backend, {
        hasFeature: (name: string) => features.includes(name),
      });
      return { backend, renderer };
    };
    const { backend, renderer } = made(['timestamp-query']);
    expect(trackTimestamps(renderer, false)).toBe(false);
    expect(backend.trackTimestamp).toBe(false);
    expect(trackTimestamps(renderer, true)).toBe(true);
    expect(backend.trackTimestamp).toBe(true);
    expect(trackTimestamps(made([]).renderer, true)).toBe(false);
    // A release of three that tells it otherwise.
    expect(trackTimestamps(rendererWith(), true)).toBe(false);
  });

  describe('the last frame timed', () => {
    /** A device whose timestamps read back as `times`, ns, and three's pool holding `passes` (id, begin, end). */
    function timed(passes: [string, number, number][]) {
      const times = new BigUint64Array(
        passes.flatMap(([, begin, end]) => [BigInt(begin), BigInt(end)])
      );
      const made: { size: number; destroyed: boolean }[] = [];
      const device = {
        createBuffer: ({ size }: { size: number }) => {
          const b = {
            size,
            destroyed: false,
            mapAsync: () => Promise.resolve(),
            getMappedRange: (offset: number, bytes: number) =>
              times.buffer.slice(offset, offset + bytes),
            unmap: vi.fn(),
            destroy: () => {
              b.destroyed = true;
            },
          };
          made.push(b);
          return b;
        },
        createCommandEncoder: () => ({
          resolveQuerySet: vi.fn(),
          copyBufferToBuffer: vi.fn(),
          finish: () => ({}),
        }),
        queue: { submit: vi.fn() },
      };
      const pool = {
        querySet: { count: 2048 },
        queryOffsets: new Map(passes.map(([id], i) => [id, 2 * i])),
        currentQueryIndex: 2 * passes.length,
      };
      const renderer = rendererWith({ get: backendGet(), timestampQueryPool: { render: pool } });
      return { frames: new FrameTimes(device as unknown as GPUDevice), renderer, pool, made };
    }

    it('spans from its first pass begun to its last ended, where three sums what they took, which overlap', async () => {
      const { frames, renderer } = timed([
        ['r:1:1:f28', 0, 960_000],
        ['r:2:2:f28', 1_870_000, 3_540_000],
        ['r:3:3:f28', 1_400_000, 2_470_000],
        ['r:4:4:f28', 1_870_000, 3_430_000],
      ]);
      expect(await frames.last(renderer)).toBeCloseTo(3.54);
    });

    it('leaves out the passes of frames before it, and takes them from three as three would', async () => {
      const { frames, renderer, pool } = timed([
        ['r:1:1:f27', 0, 9_000_000],
        ['r:1:1:f28', 10_000_000, 11_000_000],
        ['r:2:2:f28', 11_000_000, 12_500_000],
      ]);
      expect(await frames.last(renderer)).toBeCloseTo(2.5);
      expect([pool.currentQueryIndex, pool.queryOffsets.size]).toEqual([0, 0]);
      expect(await frames.last(renderer)).toBeNull();
    });

    it('is none where three wrote none, or keeps them otherwise', async () => {
      const { frames } = timed([]);
      expect(await frames.last(rendererWith())).toBeNull();
      expect(
        await frames.last(rendererWith({ timestampQueryPool: { render: { querySet: {} } } }))
      ).toBeNull();
    });

    it('lets go of its buffers', async () => {
      const { frames, renderer, made } = timed([['r:1:1:f1', 0, 1_000_000]]);
      await frames.last(renderer);
      frames.dispose();
      expect(made.map((b) => b.destroyed)).toEqual([true, true]);
    });
  });

  it("find three's own loop, or none where it changed", () => {
    const loop = { start: vi.fn(), stop: vi.fn() };
    expect(threeLoop(rendererWith(undefined, { _animation: loop }))).toBe(loop);
    expect(threeLoop(rendererWith(undefined, { _animation: { start: vi.fn() } }))).toBeNull();
    expect(threeLoop(rendererWith())).toBeNull();
  });
});
