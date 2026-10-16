import * as THREE from 'three/webgpu';

import { logError } from '@/utils/logger';

import { MIN_RADIUS, quadGeometry } from '../impostors';
import { BLOCK } from '../segment-arena';
import { VIEW_WGSL } from './cells-wgsl';
import { ARGS, BLOCKS, PYRAMID, RESOLVE, SEGMENTS } from './culling-wgsl';
import { IMPOSTORS_WGSL, SEGMENT_ENDS_WGSL } from './impostors-gpu';
import { gpuTexture, shareBuffer } from './three-hooks';
import {
  COPY_DST,
  COPY_SRC,
  INDIRECT,
  MAP_READ,
  READ,
  STORAGE,
  STORAGE_BINDING,
  TEXTURE_BINDING,
  UNIFORM,
} from './usage';

import type { CullCounts } from '../../types';
import type { ArenaBuffers, ArenaStorage } from './arena-gpu';

/** The samples a pixel of the depth drawn before the tests has, as the picture's. */
const SAMPLES = 4;
/** The least radius a segment is tested at, px: a cell glowing in full is drawn at twice the least. */
const LEAST_PX = 2 * MIN_RADIUS;
/**
 * The frames whose counts may be on their way back at once. Each frame's are read, and past these, the last tested once
 * a buffer is free, so that the last before the view rests always is.
 */
const READS = 8;
/** The view as the passes take it (`culling-wgsl.ts`): two matrices, three vectors and the counts, in bytes. */
const VIEW_BYTES = 192;

/** Where in the draws' arguments each list's are, bytes: five words each, the kept first. */
export const DRAWS = { keptFlat: 0, keptTubes: 20, seenFlat: 40, seenTubes: 60 } as const;
const DRAWS_BYTES = 80;
/** Where a draw's instances are in its arguments, words. */
const INSTANCES = 1;
/** Draws of none of the quads, six indices each. */
const NO_DRAWS = new Uint32Array(DRAWS_BYTES / 4).map((_, k) => (k % 5 === 0 ? 6 : 0));

const LIBRARY = [VIEW_WGSL, IMPOSTORS_WGSL, SEGMENT_ENDS_WGSL].join('\n');

type Pipelines = Record<'resolve' | 'pyramid' | 'blocks' | 'args' | 'segments', GPUComputePipeline>;

/** What the passes bind, made again where the depth drawn before them, the targets or the arena change. */
interface Bound {
  depth: GPUTexture;
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

/**
 * The culling of an arena's segments on the GPU, the bench's on blocks of 64 (`culling-wgsl.ts`): each frame, the
 * segments kept the frame before are drawn to depth (`target`, by three), and then the passes here, on `device`'s
 * queue before three draws the frame: that depth at each pixel the farthest of its samples, its pyramid, the blocks'
 * test, the segments' test into the lists, flat and tubes, of those kept and those seen, and the draws' arguments,
 * which three's quads are drawn by (`quads`). What the tests count is read back each frame and handed to `counted`,
 * and null once the culling failed.
 */
export class Culling {
  readonly draws: THREE.IndirectStorageBufferAttribute;
  private renderer: THREE.WebGPURenderer;
  private device: GPUDevice;
  private storage: ArenaStorage;
  private counted: (counts: CullCounts | null) => void;
  private drawsBuffer: GPUBuffer;
  private viewBuffer: GPUBuffer;
  private counters: GPUBuffer;
  private dispatch: GPUBuffer;
  private view = new ArrayBuffer(VIEW_BYTES);
  private viewFloats = new Float32Array(this.view);
  private viewWords = new Uint32Array(this.view);
  private allDraws = NO_DRAWS.slice(DRAWS.seenFlat / 4);
  private pipelines: Pipelines | null = null;
  private arena: ArenaBuffers | null = null;
  private target: THREE.RenderTarget | null = null;
  private targets: Targets | null = null;
  private bound: Bound | null = null;
  /** Buffers to read the counts back into, and those of them free. */
  private reads: GPUBuffer[] = [];
  private free: GPUBuffer[] = [];
  /** Whether the last tested were left unread, no buffer free. */
  private unread = false;
  /** Of the arena tested: counts read back of another are dropped. */
  private generation = 0;
  /** True once the culling could not be made or bound, which is not tried again. */
  private broken = false;

  constructor(
    renderer: THREE.WebGPURenderer,
    device: GPUDevice,
    storage: ArenaStorage,
    counted: (counts: CullCounts | null) => void
  ) {
    this.renderer = renderer;
    this.device = device;
    this.storage = storage;
    this.counted = counted;
    const buffer = (size: number, usage: number, label: string) =>
      device.createBuffer({ size, usage, label });
    this.drawsBuffer = buffer(DRAWS_BYTES, STORAGE | INDIRECT | COPY_DST | COPY_SRC, 'cull draws');
    this.viewBuffer = buffer(VIEW_BYTES, UNIFORM | COPY_DST, 'cull view');
    this.counters = buffer(16, STORAGE | COPY_DST | COPY_SRC, 'cull counters');
    this.dispatch = buffer(16, STORAGE | INDIRECT, 'cull dispatch');
    this.draws = new THREE.IndirectStorageBufferAttribute(new Uint32Array(DRAWS_BYTES / 4), 1);
    shareBuffer(renderer, this.draws, this.drawsBuffer);
  }

  /** Whether there is an arena to test. */
  get placed(): boolean {
    return this.arena !== null;
  }

  /** Whether the culling could not be made or bound, for good: every segment is to be drawn. */
  get failed(): boolean {
    return this.broken;
  }

  /** The arena whose segments are tested, or none; its lists hold nothing kept yet. */
  setArena(arena: ArenaBuffers | null): void {
    this.arena = arena;
    this.bound = null;
    this.generation++;
    this.drawNone();
  }

  /** Quads drawn by the draw at `offset` (`DRAWS`). */
  quads(offset: number): THREE.InstancedBufferGeometry {
    return quadGeometry(Infinity).setIndirect(this.draws, offset);
  }

  /** What the kept segments are drawn into before the tests, `width` by `height` device pixels. */
  targetOf(width: number, height: number): THREE.RenderTarget {
    if (!this.target) {
      this.target = new THREE.RenderTarget(width, height, {
        samples: SAMPLES,
        depthTexture: new THREE.DepthTexture(width, height, THREE.FloatType),
        format: THREE.RedFormat,
        resolveColorBuffer: false,
        storeMultisampledColorBuffer: false,
      });
    }
    this.target.setSize(width, height);
    return this.target;
  }

  /**
   * The tests, once the kept segments are drawn into the target: submitted, and the lists and the draws filled for
   * three's draw that follows. `shift`: what the arena's positions are moved by; `tubeFrom`: the least radius in
   * pixels of a tube; `end`: where the arena's segments end. False where nothing was tested.
   */
  run(
    camera: THREE.Camera & { near: number; far: number },
    shift: THREE.Vector3,
    tubeFrom: number,
    end: number
  ): boolean {
    const { device, arena, target } = this;
    if (!arena || !target || this.broken) return false;
    const pipelines = this.pipelinesNow();
    const targets = this.targetsOf(target.width, target.height);
    const depth = target.depthTexture && gpuTexture(this.renderer, target.depthTexture);
    const bound = depth && this.bindings(pipelines, depth, arena, targets);
    if (!bound) {
      this.fail(new Error('three made no texture of the depth the culling reads'));
      return false;
    }
    const blocks = Math.ceil(end / BLOCK);
    this.writeView(camera, shift, tubeFrom, targets, blocks);
    this.drawNone();

    const encoder = device.createCommandEncoder({ label: 'cull' });
    encoder.clearBuffer(this.counters);
    const pass = encoder.beginComputePass();
    const run = (pipeline: GPUComputePipeline, group: GPUBindGroup, x: number, y = 1) => {
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
    this.submit(encoder);
    return true;
  }

  /**
   * Not culled: every segment up to `end` drawn by the seen lists' draws, each of its own kind. As with `drawNone`, the
   * last tests left unread are not read: the draws they counted are gone.
   */
  drawAll(end: number): void {
    this.unread = false;
    this.allDraws[INSTANCES] = end;
    this.allDraws[(DRAWS.seenTubes - DRAWS.seenFlat) / 4 + INSTANCES] = end;
    this.device.queue.writeBuffer(this.drawsBuffer, DRAWS.seenFlat, this.allDraws);
  }

  /** None drawn, kept or seen. */
  drawNone(): void {
    this.unread = false;
    this.device.queue.writeBuffer(this.drawsBuffer, 0, NO_DRAWS);
  }

  dispose(): void {
    for (const buffer of [this.drawsBuffer, this.viewBuffer, this.counters, this.dispatch]) {
      buffer.destroy();
    }
    for (const read of this.reads) read.destroy();
    this.target?.dispose();
    this.dropTargets();
  }

  private writeView(
    camera: THREE.Camera & { near: number; far: number },
    shift: THREE.Vector3,
    tubeFrom: number,
    { width, height, sizes }: Targets,
    blocks: number
  ): void {
    const f = this.viewFloats;
    f.set(camera.matrixWorldInverse.elements, 0);
    f.set(camera.projectionMatrix.elements, 16);
    f.set([0, 0, width, height, shift.x, shift.y, shift.z, camera.near], 32);
    f.set([camera.far, tubeFrom, LEAST_PX, 0], 40);
    this.viewWords.set([sizes.length, blocks, this.storage.capacity.value, 0], 44);
    this.device.queue.writeBuffer(this.viewBuffer, 0, this.view);
  }

  /** The passes' programs; where the device refuses one, the culling fails once it has said so. */
  private pipelinesNow(): Pipelines {
    if (!this.pipelines) {
      const { device } = this;
      const pipeline = (code: string, label: string) =>
        device.createComputePipeline({
          label,
          layout: 'auto',
          compute: { module: device.createShaderModule({ code, label }), entryPoint: 'main' },
        });
      device.pushErrorScope('validation');
      this.pipelines = {
        resolve: pipeline(`${LIBRARY}\n${RESOLVE}`, 'cull resolve'),
        pyramid: pipeline(PYRAMID, 'cull pyramid'),
        blocks: pipeline(`${LIBRARY}\n${BLOCKS}`, 'cull blocks'),
        args: pipeline(ARGS, 'cull args'),
        segments: pipeline(`${LIBRARY}\n${SEGMENTS}`, 'cull segments'),
      };
      device.popErrorScope().then(
        (error) => {
          if (error) this.fail(error);
        },
        () => undefined
      );
    }
    return this.pipelines;
  }

  private fail(e: unknown): void {
    if (this.broken) return;
    this.broken = true;
    this.unread = false;
    this.generation++;
    logError('Drawn without culling', e);
    this.counted(null);
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
    return this.targets;
  }

  private dropTargets(): void {
    this.targets?.full.dispose();
    this.targets?.hiz.destroy();
    this.targets = null;
    this.bound = null;
  }

  private bindings(
    pipelines: Pipelines,
    depth: GPUTexture,
    arena: ArenaBuffers,
    targets: Targets
  ): Bound | null {
    if (this.bound?.depth === depth) return this.bound;
    const full = gpuTexture(this.renderer, targets.full);
    if (!full) return null;
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

  /**
   * `encoder` submitted with the counts the tests left copied out at its end and read back; where no buffer is free, the
   * last tested once one is.
   */
  private submit(encoder: GPUCommandEncoder): void {
    const read = this.readNow();
    this.unread = read === null;
    if (read) {
      encoder.copyBufferToBuffer(this.counters, 0, read, 0, 16);
      encoder.copyBufferToBuffer(this.drawsBuffer, 0, read, 16, DRAWS_BYTES);
    }
    this.device.queue.submit([encoder.finish()]);
    if (!read) return;
    const { generation } = this;
    read.mapAsync(READ).then(
      () => {
        // Destroyed with the view since.
        if (read.mapState !== 'mapped') return;
        const words = new Uint32Array(read.getMappedRange());
        const at = (offset: number) => words[4 + offset / 4 + INSTANCES];
        const counts = {
          tested: words[1],
          kept: at(DRAWS.keptFlat) + at(DRAWS.keptTubes),
          drawn: at(DRAWS.seenFlat) + at(DRAWS.seenTubes),
        };
        read.unmap();
        this.free.push(read);
        if (generation === this.generation) this.counted(counts);
        if (this.unread) this.submit(this.device.createCommandEncoder({ label: 'cull counts' }));
      },
      // Destroyed with the view.
      () => undefined
    );
  }
}
