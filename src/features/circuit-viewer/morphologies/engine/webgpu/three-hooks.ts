/**
 * The private parts of three's WebGPU renderer the circuit engine takes, in one place, as three r186 has them: what
 * holds a GPU object for each of three's (`backend.get`), whose buffer three binds for an attribute in place of making
 * one and whose texture is the one three made for a texture of its own, the timestamps it writes for a frame, and
 * three's own loop. `checkHooks` is called once the renderer is ready; where a release of three changed one the engine
 * cannot do without, the view is drawn with WebGL 2.
 */
import { Unfit } from '../probe';
import { COPY_DST, COPY_SRC, MAP_READ, QUERY_RESOLVE, READ } from './usage';

import type * as THREE from 'three/webgpu';

interface Backend {
  get(object: object): { buffer?: GPUBuffer; texture?: GPUTexture };
}

function backendOf(renderer: THREE.WebGPURenderer): Partial<Backend> | undefined {
  return (renderer as unknown as { backend?: Partial<Backend> }).backend;
}

/** Throws `Unfit` where `renderer` lacks a part the tier takes. */
export function checkHooks(renderer: THREE.WebGPURenderer): void {
  if (typeof backendOf(renderer)?.get !== 'function') {
    throw new Unfit("three's backend.get is missing");
  }
}

/**
 * `attribute` bound as `buffer`, of the page's: three makes no buffer of its own for an attribute that has one. Three
 * binds a buffer once for each attribute, so another buffer takes another attribute.
 */
export function shareBuffer<A extends THREE.BufferAttribute>(
  renderer: THREE.WebGPURenderer,
  attribute: A,
  buffer: GPUBuffer
): A {
  (backendOf(renderer) as Backend).get(attribute).buffer = buffer;
  return attribute;
}

/** The GPU texture three made for `texture`; undefined until it has made one. */
export function gpuTexture(
  renderer: THREE.WebGPURenderer,
  texture: THREE.Texture
): GPUTexture | undefined {
  return (backendOf(renderer) as Backend).get(texture).texture;
}

/**
 * Whether three writes timestamps for the passes drawn from now on, turned `on` where the device can: false where it
 * cannot, or where a release of three changed how it is told.
 */
export function trackTimestamps(renderer: THREE.WebGPURenderer, on: boolean): boolean {
  const backend = backendOf(renderer) as { trackTimestamp?: unknown } | undefined;
  if (!backend || typeof backend.trackTimestamp !== 'boolean') return false;
  const tracked = on && renderer.hasFeature('timestamp-query');
  backend.trackTimestamp = tracked;
  return tracked;
}

interface TimestampPool {
  querySet: GPUQuerySet;
  /** Where each pass's two timestamps are, by three's id for it, which ends in `:f` and the frame's number. */
  queryOffsets: Map<string, number>;
  currentQueryIndex: number;
}

function timestampPool(renderer: THREE.WebGPURenderer): TimestampPool | null {
  const pools = (
    backendOf(renderer) as { timestampQueryPool?: { render?: Partial<TimestampPool> } } | undefined
  )?.timestampQueryPool;
  const pool = pools?.render;
  return pool?.querySet &&
    pool.queryOffsets instanceof Map &&
    typeof pool.currentQueryIndex === 'number'
    ? (pool as TimestampPool)
    : null;
}

/**
 * What the last frame three wrote timestamps for cost the GPU, ms: from its first pass's start to its last's end. three
 * sums what each pass took, which counts the same time twice where passes run at once, as the occlusion's do. Work of
 * the page's own between three's passes counts; before its first, not. The timestamps are taken as three would take
 * them, so its own reads find none it has not.
 */
export class FrameTimes {
  private resolved: GPUBuffer | null = null;
  private read: GPUBuffer | null = null;

  constructor(private device: GPUDevice) {}

  /** Null where three wrote none, or keeps them otherwise in a release of its. */
  async last(renderer: THREE.WebGPURenderer): Promise<number | null> {
    const pool = timestampPool(renderer);
    if (!pool || pool.currentQueryIndex === 0) return null;
    const count = pool.currentQueryIndex;
    const passes = [...pool.queryOffsets];
    pool.currentQueryIndex = 0;
    pool.queryOffsets.clear();
    const bytes = count * 8;
    if (!this.resolved || !this.read) {
      const size = pool.querySet.count * 8;
      this.resolved = this.device.createBuffer({
        label: 'frame timestamps',
        size,
        usage: QUERY_RESOLVE | COPY_SRC,
      });
      this.read = this.device.createBuffer({
        label: 'frame timestamps read',
        size,
        usage: COPY_DST | MAP_READ,
      });
    }
    const { resolved, read } = this;
    const encoder = this.device.createCommandEncoder();
    encoder.resolveQuerySet(pool.querySet, 0, count, resolved, 0);
    encoder.copyBufferToBuffer(resolved, 0, read, 0, bytes);
    this.device.queue.submit([encoder.finish()]);
    await read.mapAsync(READ, 0, bytes);
    const times = new BigUint64Array(read.getMappedRange(0, bytes).slice(0));
    read.unmap();
    const frameOf = (id: string) => id.slice(id.lastIndexOf(':f'));
    const frame = frameOf(passes[passes.length - 1][0]);
    let from: bigint | null = null;
    let to: bigint | null = null;
    for (const [id, at] of passes) {
      if (frameOf(id) !== frame) continue;
      if (from === null || times[at] < from) from = times[at];
      if (to === null || times[at + 1] > to) to = times[at + 1];
    }
    return from !== null && to !== null && to > from ? Number(to - from) / 1e6 : null;
  }

  dispose(): void {
    this.resolved?.destroy();
    this.read?.destroy();
    this.resolved = null;
    this.read = null;
  }
}

interface Turns {
  start(): void;
  stop(): void;
}

/** three's own loop: null where a release of three changed it, which leaves it turning. */
export function threeLoop(renderer: THREE.WebGPURenderer): Turns | null {
  const turns = (renderer as unknown as { _animation?: Partial<Turns> | null })._animation;
  return typeof turns?.start === 'function' && typeof turns.stop === 'function'
    ? (turns as Turns)
    : null;
}
