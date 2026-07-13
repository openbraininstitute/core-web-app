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
