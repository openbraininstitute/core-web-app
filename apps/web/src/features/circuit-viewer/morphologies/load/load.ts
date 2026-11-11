/**
 * Loading a circuit's morphologies, on the page. One worker opens the circuit's pack, from its cache or as it comes in
 * from Bluenaas. Once the somas are in, it hands them over, with the cells numbered as the page numbers them, along
 * with where the segments lie. It then reads the pack's boxes as the view asks for them, each once its bytes are in.
 * The worker is terminated when the load is aborted or fails, and that is also what stops a download.
 */
import * as Comlink from 'comlink';

import { keepWorker, type WorkerHandle, wrapWorker } from '@/features/viewer-3d/load/worker-handle';

import type { BoxRead, CircuitMorphologyData, PackArrival, Population } from '../types';
import type { FreshHeaders, OnProgress, PackRequest } from './download';
import type { Opened, PackApi } from './worker-api';

export interface LoadOptions {
  request: PackRequest;
  /** The page's populations in its own order, which numbers its cells. */
  populations: Population[];
  /** Aborting it terminates the worker, and the data's boxes are no longer read. */
  signal: AbortSignal;
  /**
   * The pack's bytes as they come in, before it opens and after. Nothing is reported for a pack from the cache, or
   * once the load is aborted, has failed or the whole pack is in.
   */
  onProgress?: OnProgress;
  /** Makes the request's headers again, to resume a download whose token may have run out. */
  freshHeaders?: FreshHeaders;
  worker?: () => WorkerHandle<PackApi>;
}

/**
 * The morphologies' somas and frame, and their segments to read a box at a time (`chunks`). `whole` settles once the
 * whole pack is in and kept. It fails where the pack did not all come in, or is not the one Bluenaas named
 * (`PackChanged`).
 */
export interface Loaded {
  data: CircuitMorphologyData;
  fromCache: boolean;
  whole: Promise<void>;
}

const browserWorker = () =>
  wrapWorker<PackApi>(new Worker(new URL('./pack.worker.ts', import.meta.url), { type: 'module' }));

export async function loadCircuitMorphologies(options: LoadOptions): Promise<Loaded> {
  let ended = false;
  // Once the whole pack has settled, a report still updates `received` and the listeners, but not `options.onProgress`.
  let settled = false;
  let received = 0;
  const listeners = new Set<() => void>();
  // Reports come on a channel of their own, so one can arrive after the pack is open, before `open` answers, or after
  // `whole` has settled.
  const onProgress = Comlink.proxy((bytes: number, total: number) => {
    if (ended || received === Number.POSITIVE_INFINITY) return;
    received = bytes;
    for (const listener of listeners) listener();
    if (!settled) options.onProgress?.(bytes, total);
  });
  options.signal.addEventListener('abort', () => {
    ended = true;
  });
  const freshHeaders = options.freshHeaders && Comlink.proxy(options.freshHeaders);
  const worker = keepWorker(options.worker ?? browserWorker, options.signal);
  try {
    const { data, boxes, levels, readableAt, fromCache } = await worker.call<Opened>((api) =>
      api.open(options.request, options.populations, onProgress, freshHeaders)
    );
    const read = (wanted: BoxRead[]) => worker.call((api) => api.read(wanted));
    const arrival: PackArrival | undefined = fromCache
      ? undefined
      : {
          readableAt,
          received: () => received,
          listen(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
          },
        };
    const whole = worker.call((api) => api.whole());
    whole.then(
      () => {
        settled = true;
        if (ended) return;
        received = Number.POSITIVE_INFINITY;
        for (const listener of listeners) listener();
      },
      () => {
        settled = true;
      }
    );
    return {
      data: { ...data, chunks: { boxes, levels, read, arrival } },
      fromCache,
      whole,
    };
  } catch (e) {
    ended = true;
    worker.terminate();
    throw e;
  }
}
