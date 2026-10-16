import * as THREE from 'three/webgpu';

import { MIN_RADIUS } from '../impostors';
import { BLOCK } from '../segment-arena';
import { VIEW_WGSL } from './cells-wgsl';
import { ARGS, BLOCKS, PYRAMID, RESOLVE, SEGMENTS } from './culling-wgsl';
import { IMPOSTORS_WGSL, SEGMENT_ENDS_WGSL } from './impostors-gpu';
import { gpuTexture, shareBuffer } from './three-hooks';

import type { CullCounts } from '../../types';
import type { ArenaBuffers, ArenaStorage } from './arena-gpu';

// WebGPU's bits, which TypeScript's DOM library leaves out.
const MAP_READ = 0x0001;
const COPY_SRC = 0x0004;
const COPY_DST = 0x0008;
const UNIFORM = 0x0040;
const STORAGE = 0x0080;
const INDIRECT = 0x0100;
const TEXTURE_BINDING = 0x04;
const STORAGE_BINDING = 0x08;
const READ = 0x0001;

/** The samples a pixel of the depth drawn before the tests has, as the picture's. */
const SAMPLES = 4;
/** The least radius a segment is tested at, px: a cell glowing in full is drawn at twice the least. */
const LEAST_PX = 2 * MIN_RADIUS;
/**
 * The frames whose counts may be on their way back at once: each frame's are read, so that the last before the view
 * rests is.
 */
const READS = 8;
/** The view as the passes take it (`culling-wgsl.ts`): two matrices, three vectors and the counts, in bytes. */
const VIEW_BYTES = 192;

/** Where in the draws' arguments each list's are, bytes: five words each, the kept first. */
export const DRAWS = { keptFlat: 0, keptTubes: 20, seenFlat: 40, seenTubes: 60 } as const;
const DRAWS_BYTES = 80;
/** A draw of none of the quads, six indices each. */
const NO_DRAW = [6, 0, 0, 0, 0];

const LIBRARY = [VIEW_WGSL, IMPOSTORS_WGSL, SEGMENT_ENDS_WGSL].join('\n');

/** What the passes bind, made again where the depth drawn before them, the targets or the arena change. */
interface Bound {
  depth: GPUTexture;
  arena: ArenaBuffers;
  resolve: GPUBindGroup;
  pyramid: GPUBindGroup[];
  blocks: GPUBindGroup;
  args: GPUBindGroup;
  segments: GPUBindGroup;
}

/** The targets of a picture's size: the full depth's farthest, and the pyramid over it. */
interface Targets {
  width: number;
  height: number;
  full: THREE.StorageTexture;
  hiz: GPUTexture;
  /** Its levels' sizes, the half of the picture's first. */
  sizes: [number, number][];
}

/** A quad's corners, as `quadGeometry` in `circuit-view.ts` has them, and its two triangles. */
const CORNERS = [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0];
const TRIANGLES = [0, 1, 2, 2, 1, 3];

/**
 * The culling of an arena's segments on the GPU, the bench's on blocks of 64 (`culling-wgsl.ts`): each frame, the
 * segments kept the frame before are drawn to depth (`target`, by three), and then the passes here, on `device`'s
 * queue before three draws the frame: that depth at each pixel the farthest of its samples, its pyramid, the blocks'
 * test, the segments' test into the lists, flat and tubes, of those kept and those seen, and the draws' arguments,
 * which three's quads are drawn by (`quads`). What the tests count is read back each frame.
 */
export class Culling {
  readonly draws: THREE.IndirectStorageBufferAttribute;
  private renderer: THREE.WebGPURenderer;
  private device: GPUDevice;
  private storage: ArenaStorage;
  private drawsBuffer: GPUBuffer;
  private viewBuffer: GPUBuffer;
  private counters: GPUBuffer;
  private dispatch: GPUBuffer;
  private view = new ArrayBuffer(VIEW_BYTES);
  private pipelines: Record<
    'resolve' | 'pyramid' | 'blocks' | 'args' | 'segments',
    GPUComputePipeline
  > | null = null;
  private arena: ArenaBuffers | null = null;
  private target: THREE.RenderTarget | null = null;
  private targets: Targets | null = null;
  private bound: Bound | null = null;
  /** Buffers to read the counts back into, and those of them free. */
  private reads: GPUBuffer[] = [];
  private free: GPUBuffer[] = [];

  constructor(renderer: THREE.WebGPURenderer, device: GPUDevice, storage: ArenaStorage) {
    this.renderer = renderer;
    this.device = device;
    this.storage = storage;
    const buffer = (size: number, usage: number, label: string) =>
      device.createBuffer({ size, usage, label });
    this.drawsBuffer = buffer(DRAWS_BYTES, STORAGE | INDIRECT | COPY_DST | COPY_SRC, 'cull draws');
    this.viewBuffer = buffer(VIEW_BYTES, UNIFORM | COPY_DST, 'cull view');
    this.counters = buffer(16, STORAGE | COPY_DST | COPY_SRC, 'cull counters');
    this.dispatch = buffer(16, STORAGE | INDIRECT, 'cull dispatch');
    this.draws = new THREE.IndirectStorageBufferAttribute(new Uint32Array(DRAWS_BYTES / 4), 1);
    shareBuffer(renderer, this.draws, this.drawsBuffer);
    this.clearDraws();
  }

  /** The arena whose segments are tested, or none; its lists hold nothing kept yet. */
  setArena(arena: ArenaBuffers | null): void {
    this.arena = arena;
    this.bound = null;
    this.clearDraws();
  }

  /** Quads drawn by the draw at `offset` (`DRAWS`). */
  quads(offset: number): THREE.InstancedBufferGeometry {
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(CORNERS, 3));
    geometry.setIndex(TRIANGLES);
    geometry.setIndirect(this.draws, offset);
    return geometry;
  }

  /** What the kept segments are drawn into before the tests, `width` by `height` device pixels. */
  targetOf(width: number, height: number): THREE.RenderTarget {
    if (!this.target) {
      this.target = new THREE.RenderTarget(width, height, {
        samples: SAMPLES,
        depthTexture: new THREE.DepthTexture(width, height, THREE.FloatType),
        format: THREE.RedFormat,
        storeMultisampledColorBuffer: false,
      });
    }
    this.target.setSize(width, height);
    return this.target;
  }

  /**
   * The tests, once the kept segments are drawn into the target: submitted, and the lists and the draws filled for
   * three's draw that follows. `shift`: what the arena's positions are moved by; `tubeFrom`: the least radius in
   * pixels of a tube; `end`: where the arena's segments end. `counted` is handed what the tests counted, a frame or two on.
   */
  run(
    camera: THREE.Camera & { near: number; far: number },
    shift: THREE.Vector3,
    tubeFrom: number,
    end: number,
    counted: (counts: CullCounts) => void
  ): void {
    const { device, arena, target } = this;
    const depth = target?.depthTexture && gpuTexture(this.renderer, target.depthTexture);
    if (!arena || !target || !depth) return;
    const targets = this.targetsOf(target.width, target.height);
    const bound = this.bindings(depth, arena, targets);
    const blocks = Math.ceil(end / BLOCK);
    this.writeView(camera, shift, tubeFrom, targets, blocks, arena.capacity);
    device.queue.writeBuffer(this.counters, 0, new Uint32Array(4));
    this.clearDraws();

    const pipelines = this.pipelinesNow();
    const encoder = device.createCommandEncoder({ label: 'cull' });
    const pass = encoder.beginComputePass();
    const run = (pipeline: GPUComputePipeline, group: GPUBindGroup, x: number, y = 1) => {
      if (x === 0) return;
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      pass.dispatchWorkgroups(x, y);
    };
    run(
      pipelines.resolve,
      bound.resolve,
      Math.ceil(target.width / 8),
      Math.ceil(target.height / 8)
    );
    targets.sizes.forEach(([w, h], level) => {
      run(pipelines.pyramid, bound.pyramid[level], Math.ceil(w / 8), Math.ceil(h / 8));
    });
    run(pipelines.blocks, bound.blocks, Math.ceil(blocks / 64));
    run(pipelines.args, bound.args, 1);
    pass.setPipeline(pipelines.segments);
    pass.setBindGroup(0, bound.segments);
    pass.dispatchWorkgroupsIndirect(this.dispatch, 0);
    pass.end();
    const read = this.readNow();
    if (read) {
      encoder.copyBufferToBuffer(this.counters, 0, read, 0, 16);
      encoder.copyBufferToBuffer(this.drawsBuffer, 0, read, 16, DRAWS_BYTES);
    }
    device.queue.submit([encoder.finish()]);
    if (read) this.counts(read, counted);
  }

  /** Not culled: every segment up to `end` drawn by the seen lists' draws, each of its own kind. */
  drawAll(end: number): void {
    const all = [6, end, 0, 0, 0];
    this.device.queue.writeBuffer(
      this.drawsBuffer,
      DRAWS.seenFlat,
      new Uint32Array([...all, ...all])
    );
  }

  dispose(): void {
    for (const buffer of [this.drawsBuffer, this.viewBuffer, this.counters, this.dispatch]) {
      buffer.destroy();
    }
    for (const read of this.reads) read.destroy();
    this.target?.dispose();
    this.dropTargets();
  }

  private clearDraws(): void {
    this.device.queue.writeBuffer(
      this.drawsBuffer,
      0,
      new Uint32Array([...NO_DRAW, ...NO_DRAW, ...NO_DRAW, ...NO_DRAW])
    );
  }

  private writeView(
    camera: THREE.Camera & { near: number; far: number },
    shift: THREE.Vector3,
    tubeFrom: number,
    { width, height, sizes }: Targets,
    blocks: number,
    capacity: number
  ): void {
    const f = new Float32Array(this.view);
    f.set(camera.matrixWorldInverse.elements, 0);
    f.set(camera.projectionMatrix.elements, 16);
    f.set([0, 0, width, height, shift.x, shift.y, shift.z, camera.near], 32);
    f.set([camera.far, tubeFrom, LEAST_PX, 0], 40);
    new Uint32Array(this.view).set([sizes.length, blocks, capacity, 0], 44);
    this.device.queue.writeBuffer(this.viewBuffer, 0, this.view);
  }

  private pipelinesNow(): NonNullable<Culling['pipelines']> {
    if (!this.pipelines) {
      const pipeline = (code: string, label: string) =>
        this.device.createComputePipeline({
          label,
          layout: 'auto',
          compute: { module: this.device.createShaderModule({ code, label }), entryPoint: 'main' },
        });
      this.pipelines = {
        resolve: pipeline(`${LIBRARY}\n${RESOLVE}`, 'cull resolve'),
        pyramid: pipeline(PYRAMID, 'cull pyramid'),
        blocks: pipeline(`${LIBRARY}\n${BLOCKS}`, 'cull blocks'),
        args: pipeline(ARGS, 'cull args'),
        segments: pipeline(`${LIBRARY}\n${SEGMENTS}`, 'cull segments'),
      };
    }
    return this.pipelines;
  }

  /** The targets at the picture's size, made again where it changed; the materials told of the new farthest. */
  private targetsOf(width: number, height: number): Targets {
    const was = this.targets;
    if (was?.width === width && was.height === height) return was;
    this.dropTargets();
    const full = new THREE.StorageTexture(width, height);
    full.format = THREE.RedFormat;
    full.type = THREE.FloatType;
    full.magFilter = THREE.NearestFilter;
    full.minFilter = THREE.NearestFilter;
    full.generateMipmaps = false;
    this.renderer.initTexture(full);
    const sizes: [number, number][] = [];
    for (let w = width >> 1, h = height >> 1; ; w >>= 1, h >>= 1) {
      sizes.push([Math.max(w, 1), Math.max(h, 1)]);
      if (w <= 1 && h <= 1) break;
    }
    const hiz = this.device.createTexture({
      label: 'cull pyramid',
      size: sizes[0],
      format: 'r32float',
      mipLevelCount: sizes.length,
      usage: STORAGE_BINDING | TEXTURE_BINDING,
    });
    this.targets = { width, height, full, hiz, sizes };
    this.storage.farthest.value = full;
    this.bound = null;
    return this.targets;
  }

  private dropTargets(): void {
    this.targets?.full.dispose();
    this.targets?.hiz.destroy();
    this.targets = null;
    this.bound = null;
  }

  private bindings(depth: GPUTexture, arena: ArenaBuffers, targets: Targets): Bound {
    const was = this.bound;
    if (was?.depth === depth && was.arena === arena) return was;
    const full = gpuTexture(this.renderer, targets.full);
    if (!full) throw new Error('the culling target has no texture');
    const pipelines = this.pipelinesNow();
    const group = (pipeline: GPUComputePipeline, resources: GPUBindingResource[], label: string) =>
      this.device.createBindGroup({
        label,
        layout: pipeline.getBindGroupLayout(0),
        entries: resources.map((resource, binding) => ({ binding, resource })),
      });
    const buffer = (b: GPUBuffer) => ({ buffer: b });
    const view = buffer(this.viewBuffer);
    const fullView = full.createView();
    const hizView = targets.hiz.createView();
    const level = (k: number) => targets.hiz.createView({ baseMipLevel: k, mipLevelCount: 1 });
    const tested = [view, buffer(arena.blocks), fullView, hizView, buffer(arena.passed)];
    this.bound = {
      depth,
      arena,
      resolve: group(pipelines.resolve, [view, depth.createView(), fullView], 'cull resolve'),
      pyramid: targets.sizes.map((_, k) =>
        group(pipelines.pyramid, [k ? level(k - 1) : fullView, level(k)], `cull pyramid ${k}`)
      ),
      blocks: group(pipelines.blocks, [...tested, buffer(this.counters)], 'cull blocks'),
      args: group(pipelines.args, [buffer(this.counters), buffer(this.dispatch)], 'cull args'),
      segments: group(
        pipelines.segments,
        [
          ...tested,
          buffer(this.counters),
          buffer(arena.ends),
          buffer(arena.words),
          buffer(arena.lists),
          buffer(this.drawsBuffer),
        ],
        'cull segments'
      ),
    };
    return this.bound;
  }

  /** A buffer to read the counts back into; none where the GPU is `READS` frames behind. */
  private readNow(): GPUBuffer | null {
    let read = this.free.pop();
    if (!read && this.reads.length < READS) {
      read = this.device.createBuffer({ size: 16 + DRAWS_BYTES, usage: MAP_READ | COPY_DST });
      this.reads.push(read);
    }
    return read ?? null;
  }

  private counts(read: GPUBuffer, counted: (counts: CullCounts) => void): void {
    read.mapAsync(READ).then(
      () => {
        const words = new Uint32Array(read.getMappedRange());
        const at = (offset: number) => words[4 + offset / 4 + 1];
        counted({
          tested: words[1],
          kept: at(DRAWS.keptFlat) + at(DRAWS.keptTubes),
          drawn: at(DRAWS.seenFlat) + at(DRAWS.seenTubes),
        });
        read.unmap();
        this.free.push(read);
      },
      // Destroyed with the view.
      () => undefined
    );
  }
}
