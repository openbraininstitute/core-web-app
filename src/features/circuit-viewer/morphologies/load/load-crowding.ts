import { inWorker, type WorkerHandle, wrapWorker } from '@/features/viewer-3d/load/worker-handle';

import type { CrowdingApi } from './crowding.worker';

const browserWorker = () =>
  wrapWorker<CrowdingApi>(
    new Worker(new URL('./crowding.worker.ts', import.meta.url), { type: 'module' })
  );

/** How crowded each soma is (`crowding`), worked out in a worker of its own: the positions are copied there. */
export function loadCrowding(
  positions: Float32Array,
  signal: AbortSignal,
  worker: () => WorkerHandle<CrowdingApi> = browserWorker
): Promise<Uint8Array | null> {
  return inWorker(worker, signal, (api) => api.crowding(positions));
}
