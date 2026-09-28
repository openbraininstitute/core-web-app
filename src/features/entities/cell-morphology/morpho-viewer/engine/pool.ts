/**
 * A pool of mesher workers. Worker 0 parses the morphology, plans the slabs
 * and merges them; every worker (including 0) meshes slabs from a shared
 * queue. Starting a build or a load supersedes the running build: its queued
 * slabs are dropped and its result is discarded.
 *
 * A hybrid build (hybrid.ts) queues batches of tubes and small patches along
 * with the slabs of its big patches; a big patch is stitched and clipped by
 * whichever worker returns its last slab. If a hybrid build fails, the pool
 * builds the voxel mesh instead and says so in the statistics, unless the GPU
 * failed it (GpuError).
 */

import * as Comlink from 'comlink';

import {
  type Backend,
  batchResultTransfer,
  type DistanceReply,
  type DistanceRequest,
  errorMessage,
  GPU_BIG_PATCH_BAND_VOXELS,
  GPU_MAX_BAND_VOXELS_PER_SLAB,
  GpuError,
  jobTransfer,
  type Mesher,
  type MorphologySummary,
  resultTransfer,
  type SkeletonData,
  SLABS_PER_WORKER,
} from './protocol';

import type { BatchResult, BigPatchInfo, HybridBatch, HybridParams } from './hybrid';
import type { MeshParams, MeshResult, SlabJob, SlabResult } from './mesher';
import type { MesherApi } from './mesher-api';

/** Most workers a pool gets by default: past a dozen the plan and the merge, which are serial, take over. */
const MAX_DEFAULT_WORKERS = 12;

/**
 * Workers for a machine with `cores` logical cores. One core stays free for the page, two from ten cores on, where
 * the rest are efficiency cores that the renderer and the GPU process can have. The slab count follows the worker
 * count, so the field memory that is live at once does not grow with it. A 250 000-node projection neuron at
 * 0.158 µm, voxels throughout on the CPU, took 5.3 s on 8 workers, 4.4 s on 10 and 4.0 s on 12 (14 cores, 10 of them
 * fast; 2026-09-18).
 */
export function defaultPoolSize(
  cores: number = globalThis.navigator?.hardwareConcurrency || 2
): number {
  return Math.max(1, Math.min(MAX_DEFAULT_WORKERS, cores - (cores < 10 ? 1 : 2)));
}

interface Build {
  cancelled: boolean;
}

interface Slot {
  worker: Worker;
  api: Comlink.Remote<MesherApi>;
  /** Rejecters of the calls in flight on this worker, which fail if it dies. */
  pending: Set<(error: Error) => void>;
  /** Set once the worker has died or the pool is disposed: every later call fails with it. */
  dead: Error | null;
}

export type CreateWorker = () => Worker;

const createMesherWorker: CreateWorker = () =>
  new Worker(new URL('./mesher.worker.ts', import.meta.url), { type: 'module' });

export interface BuildOptions {
  onProgress?: (done: number, total: number) => void;
  /** Receives the prepared skeleton (smoothed and simplified) as soon as the plan is in. */
  onPlanned?: (skeleton: SkeletonData) => void;
  /** The GPU backends need WebGPU in the workers (check `probeGpu` first). */
  backend?: Backend;
  mesher?: Mesher;
}

export class MeshPool {
  private readonly slots: Slot[];
  private current: Build | null = null;
  private disposed = false;

  constructor(size: number, createWorker: CreateWorker = createMesherWorker) {
    this.slots = Array.from({ length: Math.max(1, Math.floor(size)) }, () => {
      const worker = createWorker();
      const slot: Slot = {
        worker,
        api: Comlink.wrap<MesherApi>(worker),
        pending: new Set(),
        dead: null,
      };
      // Comlink never settles a call to a worker that died, so its calls fail here instead of hanging.
      worker.addEventListener('error', (e) =>
        this.fail(slot, (e as ErrorEvent).message || 'mesher worker failed')
      );
      return slot;
    });
  }

  get size(): number {
    return this.slots.length;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  /** Drop the running build and terminate every worker. Safe to call twice, as a StrictMode cleanup does. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancel();
    for (const slot of this.slots) {
      this.fail(slot, 'mesher pool disposed');
      slot.api[Comlink.releaseProxy]();
      slot.worker.terminate();
    }
  }

  /**
   * Name of the WebGPU adapter the workers can use for the field, or null. Rejects, saying why, where there is WebGPU
   * but the device cannot build the shaders.
   */
  probeGpu(): Promise<string | null> {
    return this.call(0, (api) => api.probeGpu());
  }

  load(text: string): Promise<{ summary: MorphologySummary; skeleton: SkeletonData }> {
    this.cancel();
    return this.call(0, (api) => api.load(text));
  }

  /** Path distances to the soma for the loaded morphology; the arrays are copied to the worker. */
  distances(request: DistanceRequest): Promise<DistanceReply> {
    return this.call(0, (api) => api.distances(request));
  }

  /** Mesh the loaded morphology. Resolves to null if a later build or load superseded this one. */
  async build(
    params: MeshParams | HybridParams,
    options: BuildOptions = {}
  ): Promise<MeshResult | null> {
    this.cancel();
    const build: Build = { cancelled: false };
    this.current = build;
    try {
      if (options.mesher !== 'hybrid') return await this.buildVoxel(build, params, options);
      try {
        return await this.buildHybrid(build, params, options);
      } catch (e) {
        // Not the tubes' fault, and the voxel mesh would need the GPU too.
        if (build.cancelled || e instanceof GpuError) throw e;
        // The voxel mesher takes any skeleton; say why it was needed.
        const why = errorMessage(e);
        console.warn(`hybrid mesher failed, building the voxel mesh instead: ${why}`);
        const res = await this.buildVoxel(build, params, options);
        if (res) res.stats.fallback = why;
        return res;
      }
    } catch (e) {
      // A superseded build's errors are dropped along with its result.
      if (build.cancelled) return null;
      build.cancelled = true;
      throw e;
    } finally {
      if (this.current === build) this.current = null;
    }
  }

  private async buildVoxel(
    build: Build,
    params: MeshParams,
    { onProgress, onPlanned, backend = 'cpu' }: BuildOptions
  ): Promise<MeshResult | null> {
    const t0 = performance.now();
    const options = {
      maxSlabs: this.size * SLABS_PER_WORKER,
      // The GPU extraction takes a slab in one batch, so a large mesh is cut into more slabs for it.
      maxBandVoxelsPerSlab: backend === 'gpu' ? GPU_MAX_BAND_VOXELS_PER_SLAB : undefined,
    };
    const { jobs, skeleton, ...plan } = await this.call(0, (api) => api.plan(params, options));
    if (build.cancelled) return null;

    const results: SlabResult[] = [];
    let next = 0;
    let done = 0;
    onProgress?.(0, jobs.length);
    const drain = async (w: number): Promise<void> => {
      while (next < jobs.length && !build.cancelled) {
        const job = jobs[next++];
        results.push(
          await this.call(w, (api) => api.slab(Comlink.transfer(job, jobTransfer(job)), backend))
        );
        if (!build.cancelled) onProgress?.(++done, jobs.length);
      }
    };
    // The first slabs are posted before the skeleton is drawn.
    const drains = this.slots.map((_, w) => drain(w));
    onPlanned?.(skeleton);
    await Promise.all(drains);
    if (build.cancelled) return null;

    const mesh = await this.call(0, (api) =>
      api.merge(plan, Comlink.transfer(results, results.flatMap(resultTransfer)))
    );
    if (build.cancelled) return null;
    mesh.stats.totalMs = performance.now() - t0;
    mesh.stats.workers = Math.min(this.size, jobs.length);
    return mesh;
  }

  private async buildHybrid(
    build: Build,
    params: HybridParams,
    { onProgress, onPlanned, backend = 'cpu' }: BuildOptions
  ): Promise<MeshResult | null> {
    const t0 = performance.now();
    const options = {
      maxBatches: this.size * SLABS_PER_WORKER,
      maxSlabs: this.size * SLABS_PER_WORKER,
      maxBandVoxelsPerSlab: backend === 'gpu' ? GPU_MAX_BAND_VOXELS_PER_SLAB : undefined,
      // With the field on the GPU a patch is cheaper there than on the worker, so nearly all of them go as slabs.
      bigPatchBandVoxels: backend === 'cpu' ? undefined : GPU_BIG_PATCH_BAND_VOXELS,
    };
    const { batches, bigPatches, skeleton, ...plan } = await this.call(0, (api) =>
      api.hybridPlan(params, options)
    );
    if (build.cancelled) return null;

    // The slabs of the big patches go first: each patch still needs stitching and clipping once its last slab is in.
    type Task =
      | { kind: 'slab'; patch: number; job: SlabJob }
      | { kind: 'finish'; patch: BigPatchInfo; results: SlabResult[] }
      | { kind: 'batch'; batch: HybridBatch };
    const tasks: Task[] = [];
    const patchInfo: BigPatchInfo[] = [];
    const patchSlabs: SlabResult[][] = [];
    bigPatches.forEach(({ jobs, ...info }, k) => {
      patchInfo.push(info);
      patchSlabs.push([]);
      for (const job of jobs) tasks.push({ kind: 'slab', patch: k, job });
    });
    for (const batch of batches) tasks.push({ kind: 'batch', batch });
    const total = tasks.length + bigPatches.length;

    const results: BatchResult[] = [];
    let done = 0;
    // Once a task has failed the build falls back to the voxel mesher, and the other workers need not finish theirs.
    let failed = false;
    onProgress?.(0, total);
    const work = async (w: number): Promise<void> => {
      for (
        let task = tasks.shift();
        task !== undefined && !build.cancelled && !failed;
        task = tasks.shift()
      ) {
        if (task.kind === 'slab') {
          const { job } = task;
          const slabs = patchSlabs[task.patch];
          slabs.push(
            await this.call(w, (api) => api.slab(Comlink.transfer(job, jobTransfer(job)), backend))
          );
          if (slabs.length === patchInfo[task.patch].slabs)
            tasks.unshift({ kind: 'finish', patch: patchInfo[task.patch], results: slabs });
        } else if (task.kind === 'finish') {
          const { patch, results: slabs } = task;
          results.push(
            await this.call(w, (api) =>
              api.hybridPatch(patch, Comlink.transfer(slabs, slabs.flatMap(resultTransfer)))
            )
          );
        } else {
          const { batch } = task;
          results.push(await this.call(w, (api) => api.hybridBatch(batch)));
        }
        if (!build.cancelled) onProgress?.(++done, total);
      }
    };
    const drain = (w: number): Promise<void> =>
      work(w).catch((e) => {
        failed = true;
        throw e;
      });
    // Every worker comes to rest before the fallback starts, so that it does not queue behind abandoned tasks.
    const drains = Promise.allSettled(this.slots.map((_, w) => drain(w)));
    onPlanned?.(skeleton);
    const rejected = (await drains).find((r) => r.status === 'rejected');
    if (rejected) throw (rejected as PromiseRejectedResult).reason;
    if (build.cancelled) return null;

    const mesh = await this.call(0, (api) =>
      api.hybridMerge(plan, Comlink.transfer(results, results.flatMap(batchResultTransfer)))
    );
    if (build.cancelled) return null;
    mesh.stats.totalMs = performance.now() - t0;
    mesh.stats.workers = Math.min(this.size, total);
    return mesh;
  }

  /** Drop the running build: what it has queued is skipped, and it resolves to null. */
  cancel(): void {
    if (this.current) this.current.cancelled = true;
    this.current = null;
  }

  /** Call worker `index`; its errors come back as they were thrown there, a GpuError included. */
  private call<T>(index: number, ask: (api: Comlink.Remote<MesherApi>) => Promise<T>): Promise<T> {
    const slot = this.slots[index];
    if (slot.dead) return Promise.reject(slot.dead);
    return new Promise<T>((resolve, reject) => {
      slot.pending.add(reject);
      ask(slot.api)
        .then(resolve, (e: unknown) =>
          reject(
            e instanceof Error && e.name === 'GpuError' && !(e instanceof GpuError)
              ? new GpuError(e.message)
              : e
          )
        )
        .finally(() => slot.pending.delete(reject));
    });
  }

  private fail(slot: Slot, message: string): void {
    slot.dead ??= new Error(message);
    for (const reject of slot.pending) reject(slot.dead);
    slot.pending.clear();
  }
}
