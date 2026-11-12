'use client';

import { useSyncExternalStore } from 'react';

type TAtlasViewerModule = typeof import('@/features/brain-atlas-viewer');

/** The viewer module, the error its import failed with, or null while it loads. */
let atlasViewer: TAtlasViewerModule | Error | null = null;
const listeners = new Set<() => void>();

function settle(result: TAtlasViewerModule | Error) {
  atlasViewer = result;
  for (const listener of listeners) listener();
}

function load() {
  import('@/features/brain-atlas-viewer').then(
    (module) => settle(module),
    (error) => settle(error instanceof Error ? error : new Error(String(error)))
  );
}

// tgd reads `document` as it loads, so only the browser loads the viewer, and from the start
if (typeof window !== 'undefined') load();

function subscribe(listener: () => void) {
  // a failed import (a chunk gone in a deploy rollover) is tried again by the next view to
  // mount, so it does not stay broken until a reload
  if (atlasViewer instanceof Error && listeners.size === 0) {
    atlasViewer = null;
    load();
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return atlasViewer;
}

function getServerSnapshot() {
  return null;
}

/**
 * The 3D atlas viewer's module (null while it loads), or the error its import failed with,
 * for the view to show its fallback. A view mounting after the load renders the viewer in
 * the same commit: `next/dynamic` (a lazy component) suspends on its first render however
 * loaded it is, and React keeps the fallback up for at least 300ms, which an atlas morph
 * then shows as a spinner instead of the brain.
 */
export function useAtlasViewer(): { viewer: TAtlasViewerModule | null; error: Error | null } {
  const result = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return result instanceof Error
    ? { viewer: null, error: result }
    : { viewer: result, error: null };
}
