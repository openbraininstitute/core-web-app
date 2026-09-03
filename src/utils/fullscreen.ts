import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void) {
  document.addEventListener('fullscreenchange', onChange);
  return () => document.removeEventListener('fullscreenchange', onChange);
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

/**
 * Mount node for antd popups, which take a callback rather than a hook. Same
 * fallback as the Radix molecules: whatever is fullscreen, else the body.
 */
export function fullscreenPopupContainer(): HTMLElement {
  return (document.fullscreenElement as HTMLElement | null) ?? document.body;
}
