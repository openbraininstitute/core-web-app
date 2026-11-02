import type { PackArrival } from '@/features/circuit-viewer/morphologies/types';

/** A pack coming in as the load tells it: `to` says that much of it is in, and tells whoever listens. */
export function arrivalOf(readableAt: Float64Array[]) {
  let received = 0;
  const listeners = new Set<() => void>();
  const arrival: PackArrival = {
    readableAt,
    received: () => received,
    listen(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  const to = (bytes: number) => {
    received = bytes;
    for (const listener of listeners) listener();
  };
  return { arrival, to, listeners };
}
