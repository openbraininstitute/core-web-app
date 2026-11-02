/**
 * The private parts of three that the circuit engine uses, in one place, as three r186 has them. From the WebGPU
 * renderer: `backend.get`, which holds the GPU object for each of three's objects (three binds the buffer set there for
 * an attribute instead of making one, and the texture there is the one three made for a texture of its own); the
 * timestamps it writes for a frame; and three's own loop. `checkHooks` runs once the renderer is ready: where a release
 * of three changed a part the engine cannot do without, the view is drawn with WebGL 2. From `GTAONode`: the fields
 * the occlusion's own setup reads (`GTAO_PARTS`), checked when the occlusion is made. `three` is pinned to one
 * release, so a bump runs these tests.
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

/** The fields of three's `GTAONode` that `SurfaceGTAONode`'s setup reads, which are its own, not its interface. */
export const GTAO_PARTS = [
  '_noiseNode',
  '_resolution',
  '_temporalDirection',
  '_temporalOffset',
  '_cameraProjectionMatrix',
  '_cameraProjectionMatrixInverse',
  '_material',
  '_textureNode',
] as const;

/** Throws `Unfit` where `renderer` lacks a part the tier takes. */
export function checkHooks(renderer: THREE.WebGPURenderer): void {
  if (typeof backendOf(renderer)?.get !== 'function') {
    throw new Unfit("three's backend.get is missing");
  }
}

/**
 * Binds `attribute` to `buffer`, which the page made: three makes no buffer of its own for an attribute that has one.
 * Three binds a buffer only once per attribute, so a different buffer needs a different attribute.
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
 * The renderer three writes timestamps for, one at a time. three hands every renderer's passes one object to hold
 * their timestamp writes, and a pass keeps it: with two renderers writing timestamps, a pass of one would be given the
 * other's query set, of another device, and its frame would not be drawn at all. The first to ask keeps them until it
 * lets go of them (`releaseTimestamps`); the others time their frames without.
 */
let timestamped: THREE.WebGPURenderer | null = null;

/**
 * Turns three's timestamps `on` or off for the passes drawn from now on, where the device can and no other renderer has
 * them, and returns whether three writes them: false where the device cannot, another renderer has them, or a release
 * of three changed how to turn them on.
 */
export function trackTimestamps(renderer: THREE.WebGPURenderer, on: boolean): boolean {
  const backend = backendOf(renderer) as { trackTimestamp?: unknown } | undefined;
  if (!backend || typeof backend.trackTimestamp !== 'boolean') return false;
  const tracked =
    on &&
    (timestamped === null || timestamped === renderer) &&
    renderer.hasFeature('timestamp-query');
  if (tracked) timestamped = renderer;
  backend.trackTimestamp = tracked;
  return tracked;
}

/** The renderer's timestamps given up, as it is disposed of, for the next renderer to take. */
export function releaseTimestamps(renderer: THREE.WebGPURenderer): void {
  if (timestamped === renderer) timestamped = null;
}

interface TimestampPool {
  querySet: GPUQuerySet;
  /** Where each pass's two timestamps are, by three's id for the pass, which ends in `:f` and the frame's number. */
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
 * Measures what the last frame with timestamps cost the GPU, in ms: from its first pass's start to its last pass's end.
 * three itself sums what each pass took, which counts the same time twice where passes run at once, as the occlusion's
 * do. The page's own GPU work between three's passes counts; work before the first pass does not. This takes the
 * timestamps the way three would, so three's own reads do not find them again.
 */
export class FrameTimes {
  private resolved: GPUBuffer | null = null;
  private read: GPUBuffer | null = null;

  constructor(private device: GPUDevice) {}

  /** Null where three wrote no timestamps, or where a release of three keeps them some other way. */
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

/** three's own loop, or null where a release of three changed it; the loop then keeps running. */
export function threeLoop(renderer: THREE.WebGPURenderer): Turns | null {
  const turns = (renderer as unknown as { _animation?: Partial<Turns> | null })._animation;
  return typeof turns?.start === 'function' && typeof turns.stop === 'function'
    ? (turns as Turns)
    : null;
}
