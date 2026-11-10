export const TOUCH_GESTURE_CLASS = 'select-none [-webkit-touch-callout:none]';

export const TOUCH_GESTURE_CONTENT_CLASS =
  '[-webkit-touch-callout:none] pointer-coarse:select-none';

export function holdSelection(element: HTMLElement) {
  element.style.setProperty('user-select', 'none');
  element.style.setProperty('-webkit-user-select', 'none');
  return () => {
    element.style.removeProperty('user-select');
    element.style.removeProperty('-webkit-user-select');
  };
}

/** Keep a drag that leaves its control from selecting the page's text, until the pointer is released. */
export function holdPageSelection() {
  const release = holdSelection(document.body);
  const ended = new AbortController();
  const end = () => {
    release();
    ended.abort();
  };
  window.addEventListener('pointerup', end, { signal: ended.signal });
  window.addEventListener('pointercancel', end, { signal: ended.signal });
}

export function capturePointer(element: Element, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Pointer is no longer active — implicit capture still applies on touch.
  }
}

/** Release a capture taken with `capturePointer`, ignoring a stale pointer. */
export function releasePointer(element: Element, pointerId: number) {
  try {
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  } catch {
    // Capture was already dropped by the browser.
  }
}

export const isHoveringPointer = (event: { pointerType: string; buttons: number }) =>
  event.pointerType !== 'touch' && event.buttons === 0;
