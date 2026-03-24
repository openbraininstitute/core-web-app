import { wrap } from 'comlink';

import type { Remote } from 'comlink';
import type { SonataWorkerImpl } from './sonata-worker';

let workerInstance: Remote<SonataWorkerImpl> | null = null;
let rawWorker: Worker | null = null;

export function getSonataWorker(): Remote<SonataWorkerImpl> {
  if (!workerInstance) {
    rawWorker = new Worker(new URL('./sonata-worker.ts', import.meta.url), { type: 'module' });
    workerInstance = wrap<SonataWorkerImpl>(rawWorker);
  }
  return workerInstance;
}

export function terminateWorker(): void {
  rawWorker?.terminate();
  rawWorker = null;
  workerInstance = null;
}
