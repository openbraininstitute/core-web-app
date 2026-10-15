/**
 * Loading a circuit's morphologies, on the page. One worker opens the pack, from its cache or as OBI-One builds it, and
 * hands over its somas, with the cells numbered as the page numbers them, and where its segments lie; it then reads the
 * pack's boxes as the view asks for them. It is terminated when the load is aborted, or ends with nothing: that is also
 * what stops a download, though not a build OBI-One has begun.
 */
import * as Comlink from 'comlink';

import { keepWorker, type WorkerHandle, wrapWorker } from '@/features/viewer-3d/load/worker-handle';

import type { BoxRead, CircuitMorphologyData, Population } from '../types';
import type { OnProgress, PackRequest, Refused } from './download';
import type { Opened, PackApi } from './worker-api';

export interface LoadOptions {
  request: PackRequest;
  /** The page's populations in its own order, which numbers its cells. */
  populations: Population[];
  /** Aborted, the worker is terminated, and the data's boxes are read no more. */
  signal: AbortSignal;
  /**
   * The pack's bytes as they come in. Nothing is reported while OBI-One builds it, for a pack from the cache, or once
   * the load has ended.
   */
  onProgress?: OnProgress;
  worker?: () => WorkerHandle<PackApi>;
}

/** The morphologies' somas and frame, and their segments to read a box at a time (`chunks`); or why there are none. */
export type Loaded = { kind: 'loaded'; data: CircuitMorphologyData; fromCache: boolean } | Refused;

const browserWorker = () =>
  wrapWorker<PackApi>(new Worker(new URL('./pack.worker.ts', import.meta.url), { type: 'module' }));

export async function loadCircuitMorphologies(options: LoadOptions): Promise<Loaded> {
  let ended = false;
  // A report comes on a channel of its own, and can arrive after the pack is open.
  const onProgress = Comlink.proxy((received: number, total: number) => {
    if (!ended) options.onProgress?.(received, total);
  });
  const worker = keepWorker(options.worker ?? browserWorker, options.signal);
  try {
    const opened = await worker.call<Opened>((api) =>
      api.open(options.request, options.populations, onProgress)
    );
    if (opened.kind === 'refused') {
      worker.terminate();
      return opened;
    }
    const { data, boxes, levels, fromCache } = opened;
    const read = (wanted: BoxRead[]) => worker.call((api) => api.read(wanted));
    return { kind: 'loaded', data: { ...data, chunks: { boxes, levels, read } }, fromCache };
  } catch (e) {
    worker.terminate();
    throw e;
  } finally {
    ended = true;
  }
}
