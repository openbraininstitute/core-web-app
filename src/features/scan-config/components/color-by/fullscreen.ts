import { useEffect, useState } from 'react';

/**
 * The element currently displayed fullscreen (or null). Portalled overlays must
 * render inside this element to be visible in fullscreen — anything portalled to
 * `document.body` sits outside the fullscreen subtree and the browser hides it.
 */
export function useFullscreenElement(): HTMLElement | null {
  const [element, setElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const sync = () => setElement((document.fullscreenElement as HTMLElement | null) ?? null);
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  return element;
}

/**
 * Blow `element` up to fill the screen, or leave fullscreen if anything is in it.
 *
 * Which element that is belongs to the host: a viewer is rarely the whole of
 * what the user means by the view — the circuit preview keeps the designer image
 * beside its 3D scene, spike replay the raster and the transport bar.
 */
export function toggleFullscreen(element: HTMLElement | null) {
  if (!element) return;
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    void element.requestFullscreen?.();
  }
}
