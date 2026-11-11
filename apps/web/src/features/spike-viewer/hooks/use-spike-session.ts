'use client';

import * as Comlink from 'comlink';
import { useEffect, useState } from 'react';

import { SpikeStore } from '@/features/spike-viewer/spike-store';

import type { SpikeData } from '@/features/spike-viewer/spike-trace';
import type { SpikeTraceWorkerApi } from '@/features/spike-viewer/spike-trace.worker';

type Queries = Pick<SpikeStore, 'kept' | 'viewer' | 'statistics' | 'psth' | 'pca'>;

/**
 * What the views ask of a spike file - the spikes of the cells on show, the
 * replay's arrays, statistics, PSTHs, PCAs - answered by the file's worker,
 * off the page's thread. See {@link SpikeStore}.
 */
export type SpikeSession = {
  [Query in keyof Queries]: (
    ...args: Parameters<Queries[Query]>
  ) => Promise<ReturnType<Queries[Query]>>;
};

/** A worker's answers as a session, and the call that ends it. */
export function workerSession(worker: Worker) {
  const proxy = Comlink.wrap<SpikeTraceWorkerApi>(worker);
  const session: SpikeSession = {
    kept: (...args) => proxy.kept(...args),
    viewer: (...args) => proxy.viewer(...args),
    statistics: (...args) => proxy.statistics(...args),
    psth: (...args) => proxy.psth(...args),
    pca: (...args) => proxy.pca(...args),
  };
  const close = () => {
    proxy[Comlink.releaseProxy]();
    worker.terminate();
  };
  return { proxy, session, close };
}

/** The same answers worked out in this thread, where there are no workers: tests, the server. */
function threadSession(data: SpikeData): SpikeSession {
  const store = new SpikeStore(data);
  return {
    kept: async (...args) => store.kept(...args),
    viewer: async (...args) => store.viewer(...args),
    statistics: async (...args) => store.statistics(...args),
    psth: async (...args) => store.psth(...args),
    pca: async (...args) => store.pca(...args),
  };
}

/**
 * A session over spikes handed in rather than parsed by a worker of their own,
 * such as a harness's: a worker is started and given a copy. Null until it is,
 * and while `data` is null.
 */
export function useSpikeSession(data: SpikeData | null): SpikeSession | null {
  const [opened, setOpened] = useState<{ data: SpikeData; session: SpikeSession }>();
  useEffect(() => {
    if (!data) return;
    if (typeof Worker === 'undefined') {
      setOpened({ data, session: threadSession(data) });
      return;
    }
    const { proxy, session, close } = workerSession(
      new Worker(new URL('../spike-trace.worker.ts', import.meta.url))
    );
    // Asked first, so every question after it is about these spikes.
    proxy.adopt(data).catch(() => {});
    setOpened({ data, session });
    return close;
  }, [data]);
  return opened?.data === data ? opened.session : null;
}
