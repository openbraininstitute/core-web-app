import * as THREE from 'three/webgpu';

import { CELL_XY_WGSL, VIEW_WGSL } from './cells-wgsl';
import { PYRAMID, RESOLVE } from './culling-wgsl';
import { scoped } from './error-scope';
import { IMPOSTORS_WGSL, SEGMENT_ENDS_WGSL } from './impostors-gpu';
import { gpuTexture } from './three-hooks';
import { COPY_DST, STORAGE_BINDING, TEXTURE_BINDING, UNIFORM } from './usage';

/** The samples a pixel of the depth drawn before the tests has, as the picture's. */
const SAMPLES = 4;
/** The view as the passes take it (`culling-wgsl.ts`): two matrices, three vectors and the counts, in bytes. */
const VIEW_BYTES = 192;

/** What the passes' WGSL calls besides their own. */
export const LIBRARY = [VIEW_WGSL, CELL_XY_WGSL, IMPOSTORS_WGSL, SEGMENT_ENDS_WGSL].join('\n');

/** A compute pass's program of `code`, run from its `main`. */
export function computePipeline(
  device: GPUDevice,
  code: string,
  label: string
): GPUComputePipeline {
  return device.createComputePipeline({
    label,
    layout: 'auto',
    compute: { module: device.createShaderModule({ code, label }), entryPoint: 'main' },
  });
}

/** `resources` bound to `pipeline`'s group 0, in the order of its bindings. */
export function bindGroup(
  device: GPUDevice,
  pipeline: GPUComputePipeline,
  resources: GPUBindingResource[],
  label: string
): GPUBindGroup {
  return device.createBindGroup({
    label,
    layout: pipeline.getBindGroupLayout(0),
    entries: resources.map((resource, binding) => ({ binding, resource })),
  });
}

type Pipelines = Record<'resolve' | 'pyramid', GPUComputePipeline>;

/** What a culling's tests bind, in this order: the view, the farthest at each pixel, and the pyramid. */
export type Levels = [GPUBufferBinding, GPUTextureView, GPUTextureView];

/** The targets of a picture's size: the full depth's farthest, and the pyramid over it. */
interface Targets {
  width: number;
  height: number;
  full: THREE.StorageTexture;
  hiz: GPUTexture;
  /** Its levels' sizes, the half of the picture's first. */
  sizes: [number, number][];
}

/** What the passes bind, made again where the depth drawn before them or the targets change. */
interface Bound {
  depth: GPUTexture;
  resolve: GPUBindGroup;
  pyramid: GPUBindGroup[];
  levels: Levels;
}

/**
 * What a culling tests against: the depth drawn into its target by three (`targetOf`), and then, in a compute pass of
 * the culling's, that depth at each pixel the farthest of its samples, in µm from the eye, and the pyramid over it
 * (`build`), with the view the passes take. Where the device refuses a pass, `failed` is told.
 */
export class DepthPyramid {
  private renderer: THREE.WebGPURenderer;
  private device: GPUDevice;
  private label: string;
  private failed: (error: unknown) => void;
  private viewBuffer: GPUBuffer;
  private view = new ArrayBuffer(VIEW_BYTES);
  private viewFloats = new Float32Array(this.view);
  private viewWords = new Uint32Array(this.view);
  private pipelines: Pipelines | null = null;
  private target: THREE.RenderTarget | null = null;
  private targets: Targets | null = null;
  private bound: Bound | null = null;

  constructor(
    renderer: THREE.WebGPURenderer,
    device: GPUDevice,
    label: string,
    failed: (error: unknown) => void
  ) {
    this.renderer = renderer;
    this.device = device;
    this.label = label;
    this.failed = failed;
    this.viewBuffer = device.createBuffer({
      size: VIEW_BYTES,
      usage: UNIFORM | COPY_DST,
      label: `${label} view`,
    });
  }

  /** The farthest drawn at each pixel, as the last `build` left it. */
  get farthest(): THREE.StorageTexture | null {
    return this.targets?.full ?? null;
  }

  /** What the depth is drawn into before the tests, `width` by `height` device pixels. */
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
   * Once the depth is drawn into the target: the view written for the passes, with `more` and `counts` after the far
   * plane and the pyramid's levels (`culling-wgsl.ts`), and the farthest and the pyramid made in `pass`. What the tests
   * bind of them; null where three made no texture of the depth.
   */
  build(
    pass: GPUComputePassEncoder,
    camera: THREE.Camera & { near: number; far: number },
    shift: THREE.Vector3,
    more: readonly [number, number, number],
    counts: readonly [number, number, number]
  ): Levels | null {
    const { target } = this;
    if (!target) return null;
    const pipelines = this.pipelinesNow();
    const targets = this.targetsOf(target.width, target.height);
    const depth = target.depthTexture && gpuTexture(this.renderer, target.depthTexture);
    const bound = depth && this.bindings(pipelines, depth, targets);
    if (!bound) return null;

    const f = this.viewFloats;
    f.set(camera.matrixWorldInverse.elements, 0);
    f.set(camera.projectionMatrix.elements, 16);
    f.set([0, 0, targets.width, targets.height, shift.x, shift.y, shift.z, camera.near], 32);
    f.set([camera.far, ...more], 40);
    this.viewWords.set([targets.sizes.length, ...counts], 44);
    this.device.queue.writeBuffer(this.viewBuffer, 0, this.view);

    pass.setPipeline(pipelines.resolve);
    pass.setBindGroup(0, bound.resolve);
    pass.dispatchWorkgroups(Math.ceil(targets.width / 8), Math.ceil(targets.height / 8));
    targets.sizes.forEach(([w, h], level) => {
      pass.setPipeline(pipelines.pyramid);
      pass.setBindGroup(0, bound.pyramid[level]);
      pass.dispatchWorkgroups(Math.ceil(w / 8), Math.ceil(h / 8));
    });
    return bound.levels;
  }

  /** Let go of the target and the targets, made again as they are next asked for. */
  release(): void {
    this.target?.dispose();
    this.target = null;
    this.dropTargets();
  }

  private dropTargets(): void {
    this.targets?.full.dispose();
    this.targets?.hiz.destroy();
    this.targets = null;
    this.bound = null;
  }

  dispose(): void {
    this.viewBuffer.destroy();
    this.release();
  }

  private pipelinesNow(): Pipelines {
    if (!this.pipelines) {
      const { device, label } = this;
      this.pipelines = scoped(
        device,
        'validation',
        () => ({
          resolve: computePipeline(device, `${LIBRARY}\n${RESOLVE}`, `${label} resolve`),
          pyramid: computePipeline(device, PYRAMID, `${label} pyramid`),
        }),
        this.failed
      );
    }
    return this.pipelines;
  }

  /** The targets at the picture's size, made again where it changed. */
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
      label: `${this.label} pyramid`,
      size: sizes[0],
      format: 'r32float',
      mipLevelCount: sizes.length,
      usage: STORAGE_BINDING | TEXTURE_BINDING,
    });
    this.targets = { width, height, full, hiz, sizes };
    return this.targets;
  }

  private bindings(pipelines: Pipelines, depth: GPUTexture, targets: Targets): Bound | null {
    if (this.bound?.depth === depth) return this.bound;
    const full = gpuTexture(this.renderer, targets.full);
    if (!full) return null;
    const group = (pipeline: GPUComputePipeline, resources: GPUBindingResource[], label: string) =>
      bindGroup(this.device, pipeline, resources, label);
    const view = { buffer: this.viewBuffer };
    const fullView = full.createView();
    const level = (k: number) => targets.hiz.createView({ baseMipLevel: k, mipLevelCount: 1 });
    this.bound = {
      depth,
      resolve: group(
        pipelines.resolve,
        [view, depth.createView(), fullView],
        `${this.label} resolve`
      ),
      pyramid: targets.sizes.map((_, k) =>
        group(
          pipelines.pyramid,
          [k ? level(k - 1) : fullView, level(k)],
          `${this.label} pyramid ${k}`
        )
      ),
      levels: [view, fullView, targets.hiz.createView()],
    };
    return this.bound;
  }
}
