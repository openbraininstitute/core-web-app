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
  shareBuffer,
  threeLoop,
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

  it("find three's own loop, or none where it changed", () => {
    const loop = { start: vi.fn(), stop: vi.fn() };
    expect(threeLoop(rendererWith(undefined, { _animation: loop }))).toBe(loop);
    expect(threeLoop(rendererWith(undefined, { _animation: { start: vi.fn() } }))).toBeNull();
    expect(threeLoop(rendererWith())).toBeNull();
  });
});
