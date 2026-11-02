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

export interface KeptWorker<T> {
  /** `call` made on the worker, ended by the signal's abort or the worker's death. */
  call<R>(call: (api: Comlink.Remote<T>) => Promise<R>): Promise<R>;
  terminate(): void;
}

/**
 * A worker of its own, kept until `signal` aborts or it is terminated. The calls under way are ended when it dies or
 * the signal aborts, each one alone: a race against a promise that never settles would hold every answer.
 */
export function keepWorker<T>(make: () => WorkerHandle<T>, signal: AbortSignal): KeptWorker<T> {
  signal.throwIfAborted();
  const worker = make();
  const pending = new Set<(reason: unknown) => void>();
  let ended: { reason: unknown } | null = null;
  const end = (reason: unknown) => {
    if (ended) return;
    ended = { reason };
    for (const reject of pending) reject(reason);
    pending.clear();
  };
  let terminated = false;
  const terminate = () => {
    if (terminated) return;
    terminated = true;
    signal.removeEventListener('abort', onAbort);
    worker.terminate();
  };
  const onAbort = () => {
    terminate();
    end(signal.reason);
  };
  signal.addEventListener('abort', onAbort, { once: true });
  worker.died.catch(end);
  return {
    call<R>(call: (api: Comlink.Remote<T>) => Promise<R>): Promise<R> {
      if (ended) return Promise.reject(ended.reason);
      return new Promise<R>((resolve, reject) => {
        pending.add(reject);
        call(worker.api)
          .then(resolve, reject)
          .finally(() => pending.delete(reject));
      });
    },
    terminate,
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
  const worker = keepWorker(make, signal);
  try {
    return await worker.call(call);
  } finally {
    worker.terminate();
  }
}
