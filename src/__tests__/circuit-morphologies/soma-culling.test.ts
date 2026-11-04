// @vitest-environment node
import * as THREE from 'three/webgpu';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { impostorUniforms } from '@/features/circuit-viewer/morphologies/engine/impostors';
import {
  fanGeometry,
  somaCloudUniforms,
} from '@/features/circuit-viewer/morphologies/engine/soma-cloud';
import { GpuUniforms } from '@/features/circuit-viewer/morphologies/engine/webgpu/gpu-uniforms';
import { SomaCulling } from '@/features/circuit-viewer/morphologies/engine/webgpu/soma-culling';

import { fakeGpu } from './fake-gpu';

const h = vi.hoisted(() => ({ logError: vi.fn() }));
vi.mock('@/utils/logger', () => ({ logError: h.logError }));

const dots = () => ({
  uViewport: { value: new THREE.Vector4() },
  uRadius: { value: 1 },
  uMinRadius: { value: 1 },
  uRingColour: { value: new THREE.Vector3() },
  uScale: { value: 1 },
});
const uniforms = () =>
  new GpuUniforms({
    impostors: impostorUniforms(),
    cloud: somaCloudUniforms(),
    segments: { uSegments: { value: 0 } },
    electrodes: dots(),
    synapses: dots(),
    markers: dots(),
  });

const camera = new THREE.OrthographicCamera();
const cells = new THREE.DataTexture(new Uint8Array(4), 1, 1);

/** A culling of `count` somas in two pieces, on the fake device. */
function cullingOf(count: number, options?: Parameters<typeof fakeGpu>[0]) {
  const fake = fakeGpu(options);
  const onFail = vi.fn();
  const pieces = [fanGeometry(1), fanGeometry(1)];
  const culling = new SomaCulling(
    fake.renderer,
    fake.device,
    uniforms(),
    new Float32Array(3 * count),
    pieces,
    onFail
  );
  const run = () => culling.run(camera, new THREE.Vector3(), 5, cells, 16, 8);
  return { ...fake, culling, onFail, pieces, run };
}

/** The meshes of the scene drawn to depth by the `k`th draw. */
const drawnBy = (render: ReturnType<typeof vi.fn>, k: number) =>
  (render.mock.calls[k][0] as THREE.Scene).children as THREE.Mesh[];

describe("the somas' culling", () => {
  beforeEach(() => h.logError.mockClear());

  it('draws the pieces to depth before any soma is kept, and the somas kept from then on', () => {
    const { run, render, pieces, culling } = cullingOf(100);
    expect(run()).toBe(true);
    const seeds = drawnBy(render, 0);
    expect(seeds).toHaveLength(2);
    expect(seeds.every((mesh, k) => mesh.geometry === pieces[k])).toBe(true);
    run();
    const [kept] = drawnBy(render, 1);
    expect(kept.geometry.indirect).not.toBe(culling.seen.geometry.indirect);
    expect([kept.geometry.indirectOffset, culling.seen.geometry.indirectOffset]).toEqual([0, 0]);
    for (const k of [0, 1]) {
      expect((drawnBy(render, k)[0].material as THREE.Material).colorWrite).toBe(false);
    }
  });

  it.each([
    ['the view jumped', (culling: SomaCulling) => culling.reseed()],
    ['its targets were let go of', (culling: SomaCulling) => culling.release()],
  ])('draws the pieces to depth again once %s', (_, after) => {
    const { run, render, pieces, culling } = cullingOf(100);
    run();
    run();
    after(culling);
    run();
    expect(drawnBy(render, 1)[0].geometry).not.toBe(pieces[0]);
    expect(drawnBy(render, 2)[0].geometry).toBe(pieces[0]);
  });

  it.each([
    [100, [2, 1]],
    [64 * 32768 + 1, [32769, 1]],
    [64 * 65535 + 1, [65535, 2]],
  ])('tests each of %i somas, over two dimensions past the most workgroups a side', (count, groups) => {
    const { run, pass } = cullingOf(count);
    run();
    expect(pass.dispatchWorkgroups).toHaveBeenLastCalledWith(...groups);
  });

  it('draws the somas seen by their cell and centre from its lists, as the frame shades them', () => {
    const { culling } = cullingOf(4);
    const material = culling.seen.material as THREE.MeshBasicNodeMaterial;
    expect(material.mrtNode).not.toBeNull();
    expect(culling.seen.frustumCulled).toBe(false);
  });

  it('fails for good, said once, where three made no texture of the depth', () => {
    const { run, culling, onFail } = cullingOf(4, { textures: false });
    expect(run()).toBe(false);
    expect(run()).toBe(false);
    expect(culling.failed).toBe(true);
    expect(h.logError).toHaveBeenCalledOnce();
    expect(onFail).toHaveBeenCalledOnce();
  });

  it('fails for good where the device refuses its buffers or a pass', async () => {
    const { run, culling, onFail } = cullingOf(4, { refused: { message: 'refused' } });
    await Promise.resolve();
    expect(culling.failed).toBe(true);
    expect(run()).toBe(false);
    expect(h.logError).toHaveBeenCalledWith('Somas drawn without culling', { message: 'refused' });
    expect(onFail).toHaveBeenCalledOnce();
  });

  it('is not made for more somas than a binding takes', () => {
    const limits = { maxStorageBufferBindingSize: 1200, maxBufferSize: 2 ** 30 };
    expect(() => cullingOf(101, { limits })).toThrow('101 somas');
    expect(() => cullingOf(100, { limits })).not.toThrow();
  });

  it('lets go of what it made, but not of the pieces', () => {
    const { culling, buffers, pieces } = cullingOf(4);
    const scene = new THREE.Scene().add(culling.seen);
    const disposed = vi.fn();
    for (const piece of pieces) piece.addEventListener('dispose', disposed);
    culling.dispose();
    expect(scene.children).toHaveLength(0);
    expect(buffers.every((b) => b.destroyed)).toBe(true);
    expect(disposed).not.toHaveBeenCalled();
  });
});
