/**
 * Loading a circuit's morphologies, on the page. One worker opens the pack, from its cache, as OBI-One builds it, or as
 * a stored one comes in, and hands over its somas, with the cells numbered as the page numbers them, and where its
 * segments lie, once the somas are in; it then reads the pack's boxes as the view asks for them, each once its bytes
 * are in. It is terminated when the load is aborted, or ends with nothing: that is also what stops a download, though
 * not a build OBI-One has begun.
 */
import * as Comlink from 'comlink';

import { keepWorker, type WorkerHandle, wrapWorker } from '@/features/viewer-3d/load/worker-handle';

import type { BoxRead, CircuitMorphologyData, PackArrival, Population } from '../types';
import type { OnProgress, PackRequest, Refused } from './download';
import type { Opened, PackApi } from './worker-api';

export interface LoadOptions {
  request: PackRequest;
  /** The page's populations in its own order, which numbers its cells. */
  populations: Population[];
  /** Aborted, the worker is terminated, and the data's boxes are read no more. */
  signal: AbortSignal;
  /**
   * The pack's bytes as they come in, before it opens and after. Nothing is reported while OBI-One builds it, for a
   * pack from the cache, or once the load is aborted, has failed or the whole pack is in.
   */
  onProgress?: OnProgress;
  worker?: () => WorkerHandle<PackApi>;
}

/**
 * The morphologies' somas and frame, and their segments to read a box at a time (`chunks`); or why there are none.
 * `whole` settles once the whole pack is in and kept, failing where it did not all come in or was not the asset.
 */
export type Loaded =
  | { kind: 'loaded'; data: CircuitMorphologyData; fromCache: boolean; whole: Promise<void> }
  | Refused;

const browserWorker = () =>
  wrapWorker<PackApi>(new Worker(new URL('./pack.worker.ts', import.meta.url), { type: 'module' }));

export async function loadCircuitMorphologies(options: LoadOptions): Promise<Loaded> {
  let ended = false;
  // The whole pack settled: what is still reported moves what is in, and is told the page no more.
  let settled = false;
  let received = 0;
  const listeners = new Set<() => void>();
  // A report comes on a channel of its own, and can arrive after the pack is open, or before its answer, or after the
  // whole has settled.
  const onProgress = Comlink.proxy((bytes: number, total: number) => {
    if (ended || received === Number.POSITIVE_INFINITY) return;
    received = bytes;
    for (const listener of listeners) listener();
    if (!settled) options.onProgress?.(bytes, total);
  });
  options.signal.addEventListener('abort', () => {
    ended = true;
  });
  const worker = keepWorker(options.worker ?? browserWorker, options.signal);
  try {
    const opened = await worker.call<Opened>((api) =>
      api.open(options.request, options.populations, onProgress)
    );
    if (opened.kind === 'refused') {
      ended = true;
      worker.terminate();
      return opened;
    }
    const { data, boxes, levels, readableAt, fromCache } = opened;
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
      kind: 'loaded',
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
