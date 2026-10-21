import * as THREE from 'three/webgpu';

import { logError } from '@/utils/logger';

import { MIN_RADIUS, quadGeometry } from '../impostors';
import { BLOCK } from '../segment-arena';
import { ARGS, BLOCKS, SEGMENTS } from './culling-wgsl';
import { bindGroup, computePipeline, DepthPyramid, type Levels, LIBRARY } from './depth-pyramid';
import { scoped } from './error-scope';
import { shareBuffer } from './three-hooks';
import { COPY_DST, COPY_SRC, INDIRECT, MAP_READ, READ, STORAGE } from './usage';

import type { CullRead } from '../../types';
import type { ArenaBuffers, ArenaStorage } from './arena-gpu';

/** The least radius a segment is tested at, px: a cell glowing in full is drawn at twice the least. */
const LEAST_PX = 2 * MIN_RADIUS;
/**
 * The frames whose counts may be on their way back at once. Each frame's are read, and past these, the last tested once
 * a buffer is free, so that the last before the view rests always is.
 */
const READS = 8;
/** The passes' counters: the blocks handed on, the segments in them, and two words of padding. */
const COUNTS_BYTES = 16;

/** Where in the draws' arguments each list's are, bytes: five words each, the kept first. */
export const DRAWS = { keptFlat: 0, keptTubes: 20, seenFlat: 40, seenTubes: 60 } as const;
const DRAWS_BYTES = 80;
/** Where a draw's instances are in its arguments, words. */
const INSTANCES = 1;
/** Draws of none of the quads, six indices each. */
const NO_DRAWS = new Uint32Array(DRAWS_BYTES / 4).map((_, k) => (k % 5 === 0 ? 6 : 0));

type Pipelines = Record<'blocks' | 'args' | 'segments', GPUComputePipeline>;

/** What the passes bind, made again where the pyramid's targets or the arena change. */
interface Bound {
  levels: Levels;
  blocks: GPUBindGroup;
  args: GPUBindGroup;
  segments: GPUBindGroup;
}

/**
 * The culling of an arena's segments on the GPU, the bench's on blocks of 64 (`culling-wgsl.ts`): each frame, the
 * segments kept the frame before are drawn to depth (`targetOf`, by three), and then the passes here, on `device`'s
 * queue before three draws the frame: that depth's pyramid (`DepthPyramid`), the blocks' test, the segments' test into
 * the lists, flat and tubes, of those kept and those seen, and the draws' arguments, which three's quads are drawn by
 * (`quads`). What the tests count, and the blocks they mark, are read back each frame
 * and handed to `counted`, and null once the culling failed.
 */
export class Culling {
  readonly draws: THREE.IndirectStorageBufferAttribute;
  private device: GPUDevice;
  private storage: ArenaStorage;
  private counted: (read: CullRead | null) => void;
  private drawsBuffer: GPUBuffer;
  private counters: GPUBuffer;
  private dispatch: GPUBuffer;
  private pyramid: DepthPyramid;
  private allDraws = NO_DRAWS.slice(DRAWS.seenFlat / 4);
  private pipelines: Pipelines | null = null;
  private arena: ArenaBuffers | null = null;
  private bound: Bound | null = null;
  /** Buffers to read the counts back into, and those of them free. */
  private reads: GPUBuffer[] = [];
  private free: GPUBuffer[] = [];
  /** Whether the last tested were left unread, no buffer free, and the rest their frame was drawn in (`run`). */
  private unread = false;
  private rest = -1;
  /** Of the arena tested: counts read back of another are dropped. */
  private generation = 0;
  /** True once the culling could not be made or bound, which is not tried again. */
  private broken = false;

  constructor(
    renderer: THREE.WebGPURenderer,
    device: GPUDevice,
    storage: ArenaStorage,
    counted: (read: CullRead | null) => void
  ) {
    this.device = device;
    this.storage = storage;
    this.counted = counted;
    const buffer = (size: number, usage: number, label: string) =>
      device.createBuffer({ size, usage, label });
    this.drawsBuffer = buffer(DRAWS_BYTES, STORAGE | INDIRECT | COPY_DST | COPY_SRC, 'cull draws');
    this.counters = buffer(COUNTS_BYTES, STORAGE | COPY_DST | COPY_SRC, 'cull counters');
    this.dispatch = buffer(16, STORAGE | INDIRECT, 'cull dispatch');
    this.draws = new THREE.IndirectStorageBufferAttribute(new Uint32Array(DRAWS_BYTES / 4), 1);
    shareBuffer(renderer, this.draws, this.drawsBuffer);
    this.pyramid = new DepthPyramid(renderer, device, 'cull', (error) => this.fail(error));
  }

  /** Whether there is an arena to test. */
  get placed(): boolean {
    return this.arena !== null;
  }

  /** Whether the culling could not be made or bound, for good: every segment is to be drawn. */
  get failed(): boolean {
    return this.broken;
  }

  /** The arena whose segments are tested, or none, whose targets are let go of; its lists hold nothing kept yet. */
  setArena(arena: ArenaBuffers | null): void {
    this.arena = arena;
    this.bound = null;
    if (!arena) this.pyramid.release();
    this.generation++;
    // Sized for the last arena's marks.
    this.dropReads();
    this.drawNone();
  }

  private dropReads(): void {
    for (const read of this.reads) read.destroy();
    this.reads = [];
    this.free = [];
  }

  /** Quads drawn by the draw at `offset` (`DRAWS`). */
  quads(offset: number): THREE.InstancedBufferGeometry {
    return quadGeometry(Infinity).setIndirect(this.draws, offset);
  }

  /** What the kept segments are drawn into before the tests, `width` by `height` device pixels. */
  targetOf(width: number, height: number): THREE.RenderTarget {
    return this.pyramid.targetOf(width, height);
  }

  /**
   * The tests, once the kept segments are drawn into the target: submitted, and the lists and the draws filled for
   * three's draw that follows. `shift`: what the arena's positions are moved by; `tubeFrom`: the least radius in
   * pixels of a tube; `end`: where the arena's segments end; `rest`: the rest the frame is drawn still in, -1 for one
   * drawn moving, which its read tells. False where nothing was tested.
   */
  run(
    camera: THREE.Camera & { near: number; far: number },
    shift: THREE.Vector3,
    tubeFrom: number,
    end: number,
    rest: number
  ): boolean {
    const { device, arena } = this;
    if (!arena || this.broken) return false;
    const pipelines = this.pipelinesNow();
    const blocks = Math.ceil(end / BLOCK);
    const encoder = device.createCommandEncoder({ label: 'cull' });
    encoder.clearBuffer(this.counters);
    encoder.clearBuffer(arena.marked);
    const pass = encoder.beginComputePass();
    const levels = this.pyramid.build(
      pass,
      camera,
      shift,
      [tubeFrom, LEAST_PX, 0],
      [blocks, this.storage.capacity.value, 0]
    );
    if (!levels) {
      this.fail(new Error('three made no texture of the depth the culling reads'));
      return false;
    }
    const { farthest } = this.pyramid;
    // The segments' materials read it too.
    if (farthest) this.storage.farthest.value = farthest;
    const bound = this.bindings(pipelines, levels, arena);
    this.drawNone();
    const run = (pipeline: GPUComputePipeline, group: GPUBindGroup, x: number) => {
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      pass.dispatchWorkgroups(x);
    };
    run(pipelines.blocks, bound.blocks, Math.ceil(blocks / 64));
    run(pipelines.args, bound.args, 1);
    pass.setPipeline(pipelines.segments);
    pass.setBindGroup(0, bound.segments);
    pass.dispatchWorkgroupsIndirect(this.dispatch, 0);
    pass.end();
    this.rest = rest;
    this.submit(encoder, arena.marked);
    return true;
  }

  /**
   * Not culled: every segment up to `end` drawn by the seen lists' draws and the kept ones, each of its own kind. As
   * with `drawNone`, the last tests left unread are not read: the draws they counted are gone.
   */
  drawAll(end: number): void {
    this.unread = false;
    this.allDraws[INSTANCES] = end;
    this.allDraws[(DRAWS.seenTubes - DRAWS.seenFlat) / 4 + INSTANCES] = end;
    this.device.queue.writeBuffer(this.drawsBuffer, DRAWS.seenFlat, this.allDraws);
    this.device.queue.writeBuffer(this.drawsBuffer, DRAWS.keptFlat, this.allDraws);
  }

  /** None drawn, kept or seen. */
  drawNone(): void {
    this.unread = false;
    this.device.queue.writeBuffer(this.drawsBuffer, 0, NO_DRAWS);
  }

  dispose(): void {
    for (const buffer of [this.drawsBuffer, this.counters, this.dispatch]) buffer.destroy();
    this.dropReads();
    this.pyramid.dispose();
  }

  /** The passes' programs; where the device refuses one, the culling fails once it has said so. */
  private pipelinesNow(): Pipelines {
    if (!this.pipelines) {
      const { device } = this;
      const pipeline = (code: string, label: string) => computePipeline(device, code, label);
      this.pipelines = scoped(
        device,
        'validation',
        () => ({
          blocks: pipeline(`${LIBRARY}\n${BLOCKS}`, 'cull blocks'),
          args: pipeline(ARGS, 'cull args'),
          segments: pipeline(`${LIBRARY}\n${SEGMENTS}`, 'cull segments'),
        }),
        (error) => this.fail(error)
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

  private bindings(pipelines: Pipelines, levels: Levels, arena: ArenaBuffers): Bound {
    if (this.bound?.levels === levels) return this.bound;
    const group = (pipeline: GPUComputePipeline, resources: GPUBindingResource[], label: string) =>
      bindGroup(this.device, pipeline, resources, label);
    const buffer = (b: GPUBuffer) => ({ buffer: b });
    const tested = [...levels, buffer(arena.blocks), buffer(arena.passed)];
    this.bound = {
      levels,
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
          buffer(arena.marked),
        ],
        'cull segments'
      ),
    };
    return this.bound;
  }

  /** A buffer of `bytes` to read the counts back into; none where the GPU is `READS` frames behind. */
  private readNow(bytes: number): GPUBuffer | null {
    let read = this.free.pop();
    if (!read && this.reads.length < READS) {
      read = this.device.createBuffer({ size: bytes, usage: MAP_READ | COPY_DST });
      this.reads.push(read);
    }
    return read ?? null;
  }

  /**
   * `encoder` submitted with what the tests left copied out at its end and read back: the counts, and the blocks marked
   * (`marked`, the arena's), with the rest the last tested were drawn in; where no buffer is free, the last tested once
   * one is.
   */
  private submit(encoder: GPUCommandEncoder, marked: GPUBuffer): void {
    const blocksAt = COUNTS_BYTES + DRAWS_BYTES;
    const read = this.readNow(blocksAt + marked.size);
    this.unread = read === null;
    if (read) {
      encoder.copyBufferToBuffer(this.counters, 0, read, 0, COUNTS_BYTES);
      encoder.copyBufferToBuffer(this.drawsBuffer, 0, read, COUNTS_BYTES, DRAWS_BYTES);
      encoder.copyBufferToBuffer(marked, 0, read, blocksAt, marked.size);
    }
    this.device.queue.submit([encoder.finish()]);
    if (!read) return;
    const { generation } = this;
    const rest = this.rest;
    const markedWords = marked.size / 4;
    read.mapAsync(READ).then(
      () => {
        // Destroyed with the view since.
        if (read.mapState !== 'mapped') return;
        const words = new Uint32Array(read.getMappedRange());
        const at = (offset: number) => words[(COUNTS_BYTES + offset) / 4 + INSTANCES];
        const counts = {
          tested: words[1],
          kept: at(DRAWS.keptFlat) + at(DRAWS.keptTubes),
          drawn: at(DRAWS.seenFlat) + at(DRAWS.seenTubes),
          marked: words.slice(blocksAt / 4, blocksAt / 4 + markedWords),
          rest,
        };
        read.unmap();
        this.free.push(read);
        if (generation === this.generation) this.counted(counts);
        if (this.unread && this.arena) {
          this.submit(
            this.device.createCommandEncoder({ label: 'cull counts' }),
            this.arena.marked
          );
        }
      },
      // Destroyed with the view.
      () => undefined
    );
  }
}
