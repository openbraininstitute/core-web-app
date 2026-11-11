import { instanceIndex, storage, uint, vec3 } from 'three/tsl';
import * as THREE from 'three/webgpu';

import { logError } from '@/utils/logger';

import { fanGeometry } from '../soma-cloud';
import { typed } from './cells-wgsl';
import { SOMAS } from './culling-wgsl';
import { bindGroup, computePipeline, DepthPyramid, type Levels, LIBRARY } from './depth-pyramid';
import { scoped } from './error-scope';
import { IndirectDraws } from './indirect-draws';
import { type SomaSource, somaCloudMaterials } from './soma-cloud-gpu';
import { gpuTexture, shareBuffer } from './three-hooks';
import { COPY_DST, COPY_SRC, STORAGE } from './usage';

import type { GpuUniforms } from './gpu-uniforms';

/** The byte offset of each list's draw arguments: five words each, the kept list first. */
const DRAWS = { kept: 0, seen: 20 } as const;
const DRAWS_BYTES = 40;
/** One thread per soma, in workgroups of this many, and at most this many workgroups along a side of a dispatch. */
const WORKGROUP = 64;
const MOST_GROUPS = 65535;

/** `material` writing no colour: the depth alone. */
function depthOnly(material: THREE.Material): THREE.Material {
  material.colorWrite = false;
  return material;
}

/** What the test binds, made again when the pyramid's targets or the cell table's texture change. */
interface Bound {
  levels: Levels;
  table: GPUTexture;
  group: GPUBindGroup;
}

/**
 * Culls the somas on the GPU when they are drawn alone and opaque, as `Culling` does the segments, one soma at a time
 * (`SOMAS`). Each frame, it draws the somas kept the frame before to depth, or, before any are kept, the cloud's
 * pieces, nearer first. Then, on `device`'s queue before three draws the frame, it builds that depth's pyramid
 * (`DepthPyramid`) and tests the somas into two lists, those kept and those seen; the frame draws those seen (`seen`).
 * The pick draws the pieces as before. Where the device refuses its buffers or a pass, the culling fails for good and
 * tells `onFail`.
 */
export class SomaCulling {
  /** The somas seen, drawn in place of the pieces. */
  readonly seen: THREE.Mesh;
  private renderer: THREE.WebGPURenderer;
  private device: GPUDevice;
  private onFail: () => void;
  private count: number;
  private positions: GPUBuffer;
  private keptList: GPUBuffer;
  private seenList: GPUBuffer;
  private drawsBuffer: GPUBuffer;
  private indirect: IndirectDraws;
  /** Draw arguments with no instances, for the kept list and the seen list. */
  private none: Uint32Array;
  private kept = new THREE.Scene();
  /** The pieces' pyramids, drawn to depth where none is kept yet. */
  private seeds = new THREE.Scene();
  private materials: THREE.Material[];
  private pyramid: DepthPyramid;
  private pipeline: GPUComputePipeline | null = null;
  private bound: Bound | null = null;
  private shift = new THREE.Vector3();
  /** Whether a frame was tested, so that the next frame draws its kept somas to depth. */
  private seeded = false;
  private broken = false;

  /**
   * For the cloud's somas at `positions`, three floats per cell, cut into the pieces whose pyramids are `pieces`, drawn
   * with `gpu`. Throws where the positions are more than a binding can hold.
   */
  constructor(
    renderer: THREE.WebGPURenderer,
    device: GPUDevice,
    gpu: GpuUniforms,
    positions: Float32Array,
    pieces: readonly THREE.InstancedBufferGeometry[],
    onFail: () => void
  ) {
    this.renderer = renderer;
    this.device = device;
    this.onFail = onFail;
    this.count = Math.floor(positions.length / 3);
    const { maxStorageBufferBindingSize, maxBufferSize } = device.limits;
    if (positions.byteLength > Math.min(maxStorageBufferBindingSize, maxBufferSize)) {
      throw new Error(`${this.count} somas, more than a binding takes`);
    }
    const buffers = scoped(
      device,
      'out-of-memory',
      () => {
        const buffer = (bytes: number, usage: number, label: string) =>
          device.createBuffer({ size: Math.max(16, bytes), usage: usage | COPY_DST, label });
        return {
          positions: buffer(positions.byteLength, STORAGE, 'soma cull positions'),
          kept: buffer(4 * this.count, STORAGE, 'soma cull kept'),
          seen: buffer(4 * this.count, STORAGE, 'soma cull seen'),
          draws: buffer(DRAWS_BYTES, STORAGE | COPY_SRC, 'soma cull draws'),
          indirect: new IndirectDraws(renderer, device, Object.values(DRAWS), 'soma cull draw'),
        };
      },
      (error) => this.fail(error)
    );
    this.positions = buffers.positions;
    this.keptList = buffers.kept;
    this.seenList = buffers.seen;
    this.drawsBuffer = buffers.draws;
    this.indirect = buffers.indirect;
    device.queue.writeBuffer(this.positions, 0, positions);

    // The arrays' length does not matter: the buffers here are bound in place of the attributes' own.
    const shared = (buffer: GPUBuffer, array: Float32Array | Uint32Array) =>
      shareBuffer(renderer, new THREE.StorageBufferAttribute(array, 1), buffer);
    const centres = storage(shared(this.positions, new Float32Array(4)), 'float', 0).toReadOnly();
    const listed = (list: GPUBuffer): SomaSource => {
      const cell = typed<'uint'>(
        storage(shared(list, new Uint32Array(4)), 'uint', 0)
          .toReadOnly()
          .element(instanceIndex)
      );
      const at = (k: number) => typed<'float'>(centres.element(cell.mul(uint(3)).add(uint(k))));
      return { cell, centre: vec3(at(0), at(1), at(2)) };
    };
    const drawn = (offset: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(
        fanGeometry(Infinity).setIndirect(this.indirect.of(offset)),
        material
      );
      mesh.frustumCulled = false;
      return mesh;
    };
    const [kept, seen, seeds] = [listed(this.keptList), listed(this.seenList), undefined].map(
      (source) => somaCloudMaterials(gpu, source)
    );
    this.materials = [kept, seen, seeds].flatMap(({ cloud, id }) => [cloud, id]);
    const keptMaterial = depthOnly(kept.id);
    const seenMaterial = seen.cloud;
    const seedMaterial = depthOnly(seeds.id);
    this.kept.add(drawn(DRAWS.kept, keptMaterial));
    this.seen = drawn(DRAWS.seen, seenMaterial);
    this.seen.name = 'somas';
    const indices = this.seen.geometry.index?.count ?? 0;
    this.none = new Uint32Array([indices, 0, 0, 0, 0, indices, 0, 0, 0, 0]);
    this.indirect.write(device.queue, this.none);
    for (const geometry of pieces) this.seeds.add(new THREE.Mesh(geometry, seedMaterial));
    this.pyramid = new DepthPyramid(renderer, device, 'soma cull', (error) => this.fail(error));
  }

  /** Whether making or binding the culling failed for good: the pieces are to be drawn. */
  get failed(): boolean {
    return this.broken;
  }

  /**
   * Runs before a frame of `width` by `height` device pixels. It draws the kept somas to depth, or the pieces where
   * none is kept, and submits the test, which fills the lists and the draws for three's draw of `seen` that follows.
   * `offset`: what the positions have had taken off; `radius`: the largest radius a soma is drawn at, µm; `cells`: the
   * cell table's texture. Returns false where nothing was tested.
   */
  run(
    camera: THREE.Camera & { near: number; far: number },
    offset: THREE.Vector3,
    radius: number,
    cells: THREE.Texture,
    width: number,
    height: number
  ): boolean {
    if (this.broken) return false;
    const { device } = this;
    const renderer = this.renderer;
    renderer.setRenderTarget(this.pyramid.targetOf(width, height));
    renderer.render(this.seeded ? this.kept : this.seeds, camera);
    renderer.setRenderTarget(null);
    const pipeline = this.pipelineNow();
    const encoder = device.createCommandEncoder({ label: 'soma cull' });
    const pass = encoder.beginComputePass();
    this.shift.copy(offset).negate();
    const levels = this.pyramid.build(pass, camera, this.shift, [0, 0, radius], [0, 0, this.count]);
    // three made it when it drew the somas.
    const table = gpuTexture(renderer, cells);
    if (!levels || !table) {
      this.fail(
        new Error('three made no texture of the depth or the cell table the culling reads')
      );
      return false;
    }
    // Reset the draws only after the kept somas were drawn with them.
    device.queue.writeBuffer(this.drawsBuffer, 0, this.none);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, this.bindings(pipeline, levels, table));
    const groups = Math.max(1, Math.ceil(this.count / WORKGROUP));
    const x = Math.min(groups, MOST_GROUPS);
    pass.dispatchWorkgroups(x, Math.ceil(groups / x));
    pass.end();
    this.indirect.copy(encoder, this.drawsBuffer);
    device.queue.submit([encoder.finish()]);
    this.seeded = true;
    return true;
  }

  /**
   * Draws the pieces to depth again at the next test, for when the view jumped. The somas kept for another view hide
   * little in this one, so nearly every soma would be seen, at a cost to the driver of hundreds of MB until it rests.
   */
  reseed(): void {
    this.seeded = false;
  }

  /** Lets go of the targets while the somas are not culled; the pieces go to depth first once the somas are culled. */
  release(): void {
    this.pyramid.release();
    this.seeded = false;
  }

  dispose(): void {
    this.seen.removeFromParent();
    this.seen.geometry.dispose();
    for (const mesh of this.kept.children as THREE.Mesh[]) mesh.geometry.dispose();
    for (const material of this.materials) material.dispose();
    for (const buffer of [this.positions, this.keptList, this.seenList, this.drawsBuffer]) {
      buffer.destroy();
    }
    this.indirect.destroy();
    this.pyramid.dispose();
  }

  private pipelineNow(): GPUComputePipeline {
    if (!this.pipeline) {
      const { device } = this;
      this.pipeline = scoped(
        device,
        'validation',
        () => computePipeline(device, `${LIBRARY}\n${SOMAS}`, 'soma cull'),
        (error) => this.fail(error)
      );
    }
    return this.pipeline;
  }

  private bindings(pipeline: GPUComputePipeline, levels: Levels, table: GPUTexture): GPUBindGroup {
    const was = this.bound;
    if (was?.levels === levels && was.table === table) return was.group;
    const resources: GPUBindingResource[] = [
      ...levels,
      table.createView(),
      ...[this.positions, this.keptList, this.seenList, this.drawsBuffer].map((buffer) => ({
        buffer,
      })),
    ];
    const group = scoped(
      this.device,
      'validation',
      () => bindGroup(this.device, pipeline, resources, 'soma cull'),
      (error) => this.fail(error)
    );
    this.bound = { levels, table, group };
    return group;
  }

  private fail(e: unknown): void {
    if (this.broken) return;
    this.broken = true;
    logError('Somas drawn without culling', e);
    this.onFail();
  }
}
