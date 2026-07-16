/**
 * Global view-mode state (Display / Raw).
 * Always defaults to 'display'. No persistence.
 */
import { useCallback, useSyncExternalStore } from 'react';

type ViewMode = 'display' | 'raw';

let currentMode: ViewMode = 'display';
const listeners = new Set<() => void>();

function getSnapshot(): ViewMode {
  return currentMode;
}

function getServerSnapshot(): ViewMode {
  return 'display';
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function setMode(mode: ViewMode): void {
  currentMode = mode;
  for (const cb of listeners) cb();
}

export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setter = useCallback((m: ViewMode) => setMode(m), []);
  return [mode, setter];
}
