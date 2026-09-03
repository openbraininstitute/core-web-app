import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/**
 * One `fullscreenchange` listener for the whole app, however many components
 * ask. Every portalled panel reads this to find its mount node, so a listener
 * apiece would mean one per tooltip on the page.
 */
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

/**
 * The element currently displayed fullscreen (or null). Portalled overlays must
 * render inside this element to be visible in fullscreen — anything portalled to
 * `document.body` sits outside the fullscreen subtree and the browser hides it.
 */
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
