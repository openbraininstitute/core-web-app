/**
 * Loading an EM mesh, on the page: the stand-in first, then the full detail.
 *
 * The decode worker downloads the GLB, while it and the stand-in worker compile their WASM; a stand-in cached by an
 * earlier visit shows at once. The header decides whether the mesh fits (`checkBudget`). Then, one tab at a time, the
 * decode worker decodes and is terminated, the stand-in worker makes the stand-in and hands the mesh back, and the
 * build worker packs the full mesh. Each worker's arrays reach the next through the page, transferred: the peak is
 * Draco's, never two workers' at once.
 */
import * as Comlink from 'comlink';

import { type Budget, checkBudget, type Device } from './budget';
import { readStandIn, storeStandIn } from './stand-in-cache';
import {
  type BuildApi,
  type DecodeApi,
  type FullCacheApi,
  meshBuffers,
  type StandInApi,
} from './worker-apis';

import type { DownloadRequest } from './download';
import type { MeshHeader } from './glb';
import type { DecodedMesh, PackedChunk, PackedMesh, StandIn, Timing } from './types';

/** Held from the decode until the full mesh is built, so that two tabs don't reach their peaks together. */
export const DECODE_LOCK = 'em-mesh-decode';

export interface WorkerHandle<T> {
  api: Comlink.Remote<T>;
  /** Rejects when the worker dies, out of memory say: Comlink never settles a call to a dead worker. */
  died: Promise<never>;
  terminate(): void;
}

export interface Workers {
  decode(): WorkerHandle<DecodeApi>;
  standIn(): WorkerHandle<StandInApi>;
  build(): WorkerHandle<BuildApi>;
  fullCache(): WorkerHandle<FullCacheApi>;
}

function handle<T>(worker: Worker): WorkerHandle<T> {
  const api = Comlink.wrap<T>(worker);
  const died = new Promise<never>((_, reject) =>
    worker.addEventListener('error', (e) => reject(new Error(e.message || 'the worker failed')))
  );
  died.catch(() => {});
  return {
    api,
    died,
    terminate() {
      api[Comlink.releaseProxy]();
      worker.terminate();
    },
  };
}

const browserWorkers: Workers = {
  decode: () =>
    handle(new Worker(new URL('./decode.worker.ts', import.meta.url), { type: 'module' })),
  standIn: () =>
    handle(new Worker(new URL('./stand-in.worker.ts', import.meta.url), { type: 'module' })),
  build: () =>
    handle(new Worker(new URL('./build.worker.ts', import.meta.url), { type: 'module' })),
  fullCache: () =>
    handle(new Worker(new URL('./full-cache.worker.ts', import.meta.url), { type: 'module' })),
};

/** Where loading failed: a failure after the stand-in leaves it on show. */
export type Stage = 'download' | 'decode' | 'stand-in' | 'full';

export class LoadError extends Error {
  constructor(
    readonly stage: Stage,
    cause: unknown
  ) {
    super(cause instanceof Error ? cause.message : String(cause), { cause });
    this.name = 'LoadError';
  }
}

/** What the Debug menu shows of a load. */
export interface LoadReport {
  header: MeshHeader | null;
  budget: Budget | null;
  /** Where the GLB came from; null until it is in, and where the meshes came from their caches. */
  glbFrom: 'cache' | 'network' | null;
  standInFrom: 'cache' | 'build' | null;
  fullFrom: 'cache' | 'build' | null;
  dracoBits: number | null;
  dracoHeapBytes: number | null;
  meshoptHeapBytes: number | null;
  timings: Timing[];
}

export interface LoadOptions {
  request: DownloadRequest;
  device: Device;
  /** Load a mesh over the device's budget all the same: the user said so. */
  ignoreBudget?: boolean;
  /** Settles once the view is seen, which the decode waits for: a tab opened in the background only downloads. */
  seen?: Promise<void>;
  signal: AbortSignal;
  workers?: Workers;
  standIns?: {
    read(downloadUrl: string): Promise<StandIn | null>;
    /** `encoded` is the stand-in as `encodeStandIn` makes it. */
    store(downloadUrl: string, encoded: ArrayBuffer): Promise<unknown>;
  };
}

export interface LoadCallbacks {
  /** A step of the load starts. */
  onStage?(stage: Stage): void;
  onProgress?(received: number, total: number): void;
  onReport?(report: LoadReport): void;
  onStandIn(standIn: StandIn, report: LoadReport): void;
  onFull(mesh: PackedMesh, report: LoadReport): void;
}

export type LoadOutcome = { kind: 'loaded' } | { kind: 'refused'; budget: Budget };

const abortError = () => new DOMException('The load was aborted', 'AbortError');

export async function loadEmMesh(
  options: LoadOptions,
  callbacks: LoadCallbacks
): Promise<LoadOutcome> {
  const { request, signal } = options;
  const workers = options.workers ?? browserWorkers;
  const standIns = options.standIns ?? { read: readStandIn, store: storeStandIn };
  const report: LoadReport = {
    header: null,
    budget: null,
    glbFrom: null,
    standInFrom: null,
    fullFrom: null,
    dracoBits: null,
    dracoHeapBytes: null,
    meshoptHeapBytes: null,
    timings: [],
  };
  const snapshot = (): LoadReport => ({ ...report, timings: [...report.timings] });
  const tell = () => callbacks.onReport?.(snapshot());
  const live = new Set<WorkerHandle<unknown>>();
  const start = <T>(make: () => WorkerHandle<T>): WorkerHandle<T> => {
    const worker = make();
    live.add(worker as WorkerHandle<unknown>);
    return worker;
  };
  const stop = (worker: WorkerHandle<unknown>) => {
    worker.terminate();
    live.delete(worker);
  };
  // Every step's race leaves a reaction on `aborted` holding its result: the listener goes when the load is done, or
  // the signal would keep the full mesh's arrays alive for as long as it lives.
  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(abortError());
    if (signal.aborted) onAbort();
    signal.addEventListener('abort', onAbort, { once: true });
  });
  aborted.catch(() => {});
  /** The call, unless the load is aborted or the worker dies first; a failure is the stage's. */
  const step = async <T>(
    stage: Stage,
    worker: WorkerHandle<unknown>,
    call: Promise<T>
  ): Promise<T> => {
    callbacks.onStage?.(stage);
    const t0 = performance.now();
    try {
      return await Promise.race([call, worker.died, aborted]);
    } catch (e) {
      throw signal.aborted ? abortError() : new LoadError(stage, e);
    } finally {
      report.timings.push({ step: stage, ms: performance.now() - t0 });
    }
  };

  let finished = false;
  try {
    const decoder = start(workers.decode);
    decoder.api.warmUp().catch(() => {});
    let standInWorker: WorkerHandle<StandInApi> | null = null;
    const cached = standIns
      .read(request.url)
      .catch(() => null)
      .then((standIn) => {
        if (finished) return null;
        if (standIn) {
          report.standInFrom = 'cache';
          callbacks.onStandIn(standIn, snapshot());
        } else {
          standInWorker = start(workers.standIn);
          standInWorker.api.warmUp().catch(() => {});
        }
        return standIn;
      });

    const hooks = Comlink.proxy({
      onProgress: (received: number, total: number) => callbacks.onProgress?.(received, total),
      onHeader: (header: MeshHeader) => {
        report.header = header;
        report.budget = checkBudget(header, options.device);
        tell();
        return (
          report.budget.kind === 'ok' ||
          (report.budget.kind === 'over-budget' && options.ignoreBudget === true)
        );
      },
    });
    const downloading = step('download', decoder, decoder.api.download(request, hooks));
    downloading.catch(() => {});
    // The full mesh, as a visit before kept it, where the stand-in was kept too: a stand-in with no error is the whole
    // mesh, and otherwise the full mesh's own cache is read. Either way the download can stop, and nothing is decoded
    // or built. A download that fails first, offline say, leaves it to the caches all the same.
    const fromCache = cached.then(async (standIn) => {
      if (!standIn || standIn.errorUm === 0) return standIn;
      const fullCache = start(workers.fullCache);
      if (!(await fullCache.api.has(request.url).catch(() => false))) return null;
      return step('full', fullCache, fullCache.api.restore(request.url)).catch(() => null);
    });
    const quick = await Promise.race([
      fromCache,
      downloading.then(
        () => null,
        () => fromCache
      ),
      aborted,
    ]);
    const fromCaches = (full: PackedMesh) => {
      report.fullFrom = 'cache';
      tell();
      callbacks.onFull(full, snapshot());
      return { kind: 'loaded' } as const;
    };
    if (quick) return fromCaches(quick);
    const downloaded = await downloading;
    if (downloaded.kind === 'done') report.glbFrom = downloaded.fromCache ? 'cache' : 'network';
    const standInFromCache = await cached;
    const full = await Promise.race([fromCache, aborted]);
    if (full) return fromCaches(full);
    if (downloaded.kind === 'stopped' && report.budget)
      return { kind: 'refused', budget: report.budget };

    if (options.seen) {
      const t0 = performance.now();
      await Promise.race([options.seen, aborted]);
      report.timings.push({ step: 'unseen', ms: performance.now() - t0 });
    }
    await oneAtATime(signal, async () => {
      const decoded = await step('decode', decoder, decoder.api.decode());
      stop(decoder);
      let mesh: DecodedMesh = decoded.mesh;
      report.dracoBits = mesh.dracoBits;
      report.dracoHeapBytes = decoded.dracoHeapBytes;
      tell();

      if (!standInFromCache) {
        const worker = standInWorker ?? start(workers.standIn);
        const made = await step(
          'stand-in',
          worker,
          worker.api.make(Comlink.transfer(mesh, meshBuffers(mesh)))
        );
        stop(worker);
        mesh = made.mesh;
        report.standInFrom = 'build';
        report.meshoptHeapBytes = made.heapBytes;
        report.timings.push(...made.timings);
        tell();
        callbacks.onStandIn(made.standIn, snapshot());
        standIns.store(request.url, made.encoded).catch(() => {});
        if (made.standIn.errorUm === 0) {
          callbacks.onFull(made.standIn, snapshot());
          return;
        }
      }

      const builder = start(workers.build);
      const built = await step(
        'full',
        builder,
        builder.api.build(Comlink.transfer(mesh, meshBuffers(mesh)))
      );
      stop(builder);
      report.fullFrom = 'build';
      report.timings.push(...built.timings);
      tell();
      callbacks.onFull(built.mesh, snapshot());
    });
    return { kind: 'loaded' };
  } finally {
    finished = true;
    signal.removeEventListener('abort', onAbort);
    for (const worker of live) worker.terminate();
  }
}

export interface FullMeshKeeper {
  /** A chunk of the full mesh, uploaded: its arrays go to the cache's worker, and are gone from here. */
  keep(chunk: PackedChunk, index: number): void;
  /** Keep no more: the worker is terminated, with what it has. */
  stop(): void;
}

/**
 * Keep the full mesh in its cache for the next visit, from its chunks as they go up to the GPU: each is handed to a
 * worker as it goes, which encodes it, and once the last is in, stores them all and is terminated.
 */
export function keepFullMesh(
  downloadUrl: string,
  mesh: PackedMesh,
  workers: Workers = browserWorkers
): FullMeshKeeper {
  const { chunks, ...rest } = mesh;
  const total = chunks.length;
  const worker = workers.fullCache();
  let kept = 0;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    worker.terminate();
  };
  worker.died.catch(stop);
  return {
    keep(chunk, index) {
      if (stopped) return;
      const buffers = [chunk.positions.buffer, chunk.normals.buffer, chunk.indices.buffer];
      worker.api.add(index, Comlink.transfer(chunk, buffers as ArrayBuffer[])).catch(stop);
      if (++kept === total)
        worker.api
          .store(downloadUrl, rest)
          .catch(() => false)
          .finally(stop);
    },
    stop,
  };
}

/** Run `work` holding the decode lock, where the browser has Web Locks; giving up the wait if the load is aborted. */
async function oneAtATime(signal: AbortSignal, work: () => Promise<void>): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.locks) return work();
  await navigator.locks.request(DECODE_LOCK, { signal }, work);
}
