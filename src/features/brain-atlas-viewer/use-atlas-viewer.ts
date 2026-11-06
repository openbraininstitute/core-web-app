'use client';

import { useSyncExternalStore } from 'react';

type TAtlasViewerModule = typeof import('@/features/brain-atlas-viewer');

let atlasViewer: TAtlasViewerModule | Error | null = null;
const listeners = new Set<() => void>();

// tgd reads `document` as it loads, so only the browser loads the viewer, and from the start
if (typeof window !== 'undefined') {
  import('@/features/brain-atlas-viewer').then(
    (module) => settle(module),
    (error) => settle(error instanceof Error ? error : new Error(String(error)))
  );
}

function settle(result: TAtlasViewerModule | Error) {
  atlasViewer = result;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
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
 * The 3D atlas viewer's module, or null while it loads. A view mounting after that renders
 * the viewer in the same commit: `next/dynamic` (a lazy component) suspends on its first
 * render however loaded it is, and React keeps the fallback up for at least 300ms, which an
 * atlas morph then shows as a spinner instead of the brain.
 */
export function useAtlasViewer() {
  const viewer = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (viewer instanceof Error) throw viewer;
  return viewer;
}
