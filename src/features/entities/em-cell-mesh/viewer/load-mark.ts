import { DECODE_LOCK, type Stage } from './engine/load';

/**
 * A mark, kept across reloads, that a mesh is being loaded past its download. A tab the browser stops mid-load, out of
 * memory, leaves it behind, and the next visit offers to try again rather than stopping the page again.
 */
const markKey = (assetId: string) => `em-mesh-load:${assetId}`;

export function markLoading(assetId: string, stage: Stage): void {
  try {
    localStorage.setItem(markKey(assetId), stage);
  } catch {
    // Storage blocked or full: no mark, as before there was one.
  }
}

export function clearLoading(assetId: string): void {
  try {
    localStorage.removeItem(markKey(assetId));
  } catch {
    // As above.
  }
}

/** The step a load of the mesh stopped at last time, unless another tab is loading a mesh now, which may be it. */
export async function stoppedLoading(assetId: string): Promise<Stage | null> {
  let stage: string | null = null;
  try {
    stage = localStorage.getItem(markKey(assetId));
  } catch {
    return null;
  }
  if (!stage) return null;
  const held = await navigator.locks
    ?.query()
    .then((s) => s.held ?? [])
    .catch(() => []);
  if (held?.some((lock) => lock.name === DECODE_LOCK)) return null;
  return stage as Stage;
}
