/**
 * Loading a circuit's morphologies, on the page. One worker takes the pack from its cache or fetches the one OBI-One
 * builds, reads it, and hands its arrays over, transferred, with the cells numbered as the page numbers them. It is
 * terminated when the load ends, however it ends: that is also what stops a download, though not a build OBI-One has
 * begun.
 */
import * as Comlink from 'comlink';

import { inWorker, type WorkerHandle, wrapWorker } from '@/features/viewer-3d/load/worker-handle';

import type { Population } from '../types';
import type { OnProgress, PackRequest } from './download';
import type { Loaded, PackApi } from './worker-api';

export interface LoadOptions {
  request: PackRequest;
  /** The page's populations in its own order, which numbers its cells. */
  populations: Population[];
  signal: AbortSignal;
  /**
   * The pack's bytes as they come in. Nothing is reported while OBI-One builds it, for a pack from the cache, or once
   * the load has ended.
   */
  onProgress?: OnProgress;
  worker?: () => WorkerHandle<PackApi>;
}

const browserWorker = () =>
  wrapWorker<PackApi>(new Worker(new URL('./pack.worker.ts', import.meta.url), { type: 'module' }));

export async function loadCircuitMorphologies(options: LoadOptions): Promise<Loaded> {
  let ended = false;
  // A report comes on a channel of its own, and can arrive after the worker is terminated.
  const onProgress = Comlink.proxy((received: number, total: number) => {
    if (!ended) options.onProgress?.(received, total);
  });
  try {
    return await inWorker<PackApi, Loaded>(options.worker ?? browserWorker, options.signal, (api) =>
      api.load(options.request, options.populations, onProgress)
    );
  } finally {
    ended = true;
  }
}
