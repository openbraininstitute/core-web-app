import * as Comlink from 'comlink';

export interface WorkerHandle<T> {
  api: Comlink.Remote<T>;
  /** Rejects when the worker dies, out of memory say: Comlink never settles a call to a dead worker. */
  died: Promise<never>;
  terminate(): void;
}

export function wrapWorker<T>(worker: Worker): WorkerHandle<T> {
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

/**
 * `call` made on a worker of its own, raced against `signal` and the worker's death. The worker is terminated once the
 * call ends, however it ends.
 */
export async function inWorker<T, R>(
  make: () => WorkerHandle<T>,
  signal: AbortSignal,
  call: (api: Comlink.Remote<T>) => Promise<R>
): Promise<R> {
  signal.throwIfAborted();
  const worker = make();
  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
  });
  aborted.catch(() => {});
  try {
    return await Promise.race([call(worker.api), worker.died, aborted]);
  } finally {
    signal.removeEventListener('abort', onAbort);
    worker.terminate();
  }
}
