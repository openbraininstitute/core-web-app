import { createContext, useContext, useSyncExternalStore } from 'react';

import type { ReactNode } from 'react';

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

/**
 * Toggle for `element` alone. Requesting it while another element fills the
 * screen replaces that one.
 */
export function toggleFullscreen(element: HTMLElement | null) {
  if (!element) return;

  const done =
    document.fullscreenElement === element
      ? document.exitFullscreen?.()
      : element.requestFullscreen?.();

  // Both reject when the browser refuses.
  done?.catch(() => {});
}

const FullscreenPortalContext = createContext<HTMLElement | null>(null);

/**
 * Names the fullscreen element for the subtree inside it, so panels portalled
 * from there land where they can be seen. Overlays elsewhere keep the body:
 * moving an open one into a viewer strands it there when the view shrinks back.
 */
export function FullscreenPortalScope({
  root,
  children,
}: {
  root: HTMLElement | null;
  children: ReactNode;
}) {
  const fullscreen = useFullscreenElement();
  const target = root && fullscreen?.contains(root) ? fullscreen : null;

  return (
    <FullscreenPortalContext.Provider value={target}>{children}</FullscreenPortalContext.Provider>
  );
}

export function useFullscreenPortalTarget(): HTMLElement | null {
  return useContext(FullscreenPortalContext);
}

/**
 * Mount node for antd popups, which take a callback rather than a hook. Stays
 * global: nothing here re-renders on `fullscreenchange`, so an open popup never
 * moves, and every caller sits inside a viewer that is either the fullscreen
 * element or hidden.
 */
export function fullscreenPopupContainer(): HTMLElement {
  return (document.fullscreenElement as HTMLElement | null) ?? document.body;
}
