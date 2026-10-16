// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

import {
  checkHooks,
  MissingHook,
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
  it('are all there in the release in use', () => {
    expect(() => checkHooks(rendererWith())).not.toThrow();
  });

  it.each([
    ['no backend', null],
    ['a backend that holds nothing of an object', {}],
  ])('miss the backend where the renderer has %s', (_case, backend) => {
    expect(() => checkHooks(rendererWith(backend))).toThrow(new MissingHook('backend.get'));
  });

  it("hand three a buffer of the page's for an attribute", () => {
    const renderer = rendererWith();
    const attribute = {} as THREE.BufferAttribute;
    const buffer = {} as GPUBuffer;
    shareBuffer(renderer, attribute, buffer);
    const { backend } = renderer as unknown as { backend: { get(o: object): object } };
    expect(backend.get(attribute)).toEqual({ buffer });
  });

  it("find three's own loop, or none where it changed", () => {
    const loop = { start: vi.fn(), stop: vi.fn() };
    expect(threeLoop(rendererWith(undefined, { _animation: loop }))).toBe(loop);
    expect(threeLoop(rendererWith(undefined, { _animation: { start: vi.fn() } }))).toBeNull();
    expect(threeLoop(rendererWith())).toBeNull();
  });
});
