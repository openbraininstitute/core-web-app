import type { Stage } from './engine/load';

/**
 * A mark, kept across reloads, that a mesh is being loaded past its download. A tab the browser stops mid-load, out of
 * memory, leaves it behind, and the next visit offers to try again rather than stopping the page again.
 *
 * Where the browser has Web Locks, the tab that set the mark holds a lock of the same name until it clears it: the
 * browser lets go of it with the tab, so that a mark whose lock is held is another tab's load, under way.
 */
const markKey = (assetId: string) => `em-mesh-load:${assetId}`;

/** Lets go of the lock each mark set here holds, by asset. */
const held = new Map<string, () => void>();

function holdLock(assetId: string): void {
  if (held.has(assetId) || typeof navigator === 'undefined' || !navigator.locks) return;
  let release = () => {};
  const done = new Promise<void>((resolve) => {
    release = resolve;
  });
  held.set(assetId, release);
  navigator.locks.request(markKey(assetId), { mode: 'shared' }, () => done).catch(() => {});
}

export function markLoading(assetId: string, stage: Stage): void {
  try {
    localStorage.setItem(markKey(assetId), stage);
  } catch {
    // Storage blocked or full: no mark, as before there was one.
    return;
  }
  holdLock(assetId);
}

export function clearLoading(assetId: string): void {
  held.get(assetId)?.();
  held.delete(assetId);
  try {
    localStorage.removeItem(markKey(assetId));
  } catch {
    // As above.
  }
}

/** The step a load of the mesh stopped at last time, unless another tab is loading it now. */
export async function stoppedLoading(assetId: string): Promise<Stage | null> {
  let stage: string | null = null;
  try {
    stage = localStorage.getItem(markKey(assetId));
  } catch {
    return null;
  }
  if (!stage) return null;
  const locks = await navigator.locks
    ?.query()
    .then((s) => s.held ?? [])
    .catch(() => []);
  if (locks?.some((lock) => lock.name === markKey(assetId))) return null;
  return stage as Stage;
}
