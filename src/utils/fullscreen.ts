import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** One `fullscreenchange` listener for the app: every tooltip reads this. */
function subscribe(onChange: () => void) {
  if (listeners.size === 0) document.addEventListener('fullscreenchange', emit);
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) document.removeEventListener('fullscreenchange', emit);
  };
}

const getSnapshot = () => (document.fullscreenElement as HTMLElement | null) ?? null;
const getServerSnapshot = () => null;

/** The element currently displayed fullscreen, or null. */
export function useFullscreenElement(): HTMLElement | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Fullscreen `element`, or leave fullscreen if anything is in it. */
export function toggleFullscreen(element: HTMLElement | null) {
  if (!element) return;
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    void element.requestFullscreen?.();
  }
}
