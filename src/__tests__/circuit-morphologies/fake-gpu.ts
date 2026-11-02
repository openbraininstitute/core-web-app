import { vi } from 'vitest';

import type * as THREE from 'three/webgpu';

/**
 * A device whose reads are mapped when the test says (`maps`), finding `found`; `textures` false where three made no
 * texture of its own, `refused` the error its scopes end with, and `limits` its own.
 */
export function fakeGpu({
  textures = true,
  refused = null as object | null,
  limits = { maxStorageBufferBindingSize: 2 ** 30, maxBufferSize: 2 ** 30 },
} = {}) {
  const maps: (() => void)[] = [];
  const gpu: { found: Uint32Array; maps: typeof maps } = { found: new Uint32Array(64), maps };
  const buffers: { size: number; destroyed: boolean }[] = [];
  const buffer = ({ size }: { size: number }) => {
    const b = {
      size,
      mapState: 'unmapped',
      destroyed: false,
      destroy: () => {
        b.mapState = 'unmapped';
        b.destroyed = true;
      },
      mapAsync: () =>
        new Promise<void>((resolve) => {
          b.mapState = 'pending';
          maps.push(() => {
            if (b.mapState === 'pending') b.mapState = 'mapped';
            resolve();
          });
        }),
      getMappedRange: () => {
        const range = new Uint32Array(size / 4);
        range.set(gpu.found.subarray(0, range.length));
        return range.buffer;
      },
      unmap: () => {
        b.mapState = 'unmapped';
      },
    };
    buffers.push(b);
    return b;
  };
  const view = { createView: () => ({}) };
  const pass = {
    setPipeline: vi.fn(),
    setBindGroup: vi.fn(),
    dispatchWorkgroups: vi.fn(),
    dispatchWorkgroupsIndirect: vi.fn(),
    end: vi.fn(),
  };
  const device = {
    limits,
    createBuffer: buffer,
    createTexture: () => ({ ...view, destroy: vi.fn() }),
    createShaderModule: () => ({}),
    createComputePipeline: () => ({ getBindGroupLayout: () => ({}) }),
    createBindGroup: () => ({}),
    pushErrorScope: vi.fn(),
    popErrorScope: () => Promise.resolve(refused),
    createCommandEncoder: () => ({
      clearBuffer: vi.fn(),
      beginComputePass: () => pass,
      copyBufferToBuffer: vi.fn(),
      finish: () => ({}),
    }),
    queue: { writeBuffer: vi.fn(), submit: vi.fn() },
  };
  const renderer = {
    backend: { get: () => (textures ? { texture: view } : {}) },
    initTexture: vi.fn(),
    render: vi.fn(),
    setRenderTarget: vi.fn(),
  };
  return {
    gpu,
    buffers,
    pass,
    device: device as unknown as GPUDevice,
    renderer: renderer as unknown as THREE.WebGPURenderer,
    render: renderer.render,
  };
}
