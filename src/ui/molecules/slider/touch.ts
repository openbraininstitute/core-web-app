// Touch helpers. On phones and tablets, a long press makes the browser select text or pop up its
// own menu, and that cancels our drag halfway. These helpers switch that off where we own the gesture.

/** For a control you drag or hold (a slider thumb, a handle): no text selection, no iOS menu. */
export const TOUCH_GESTURE_CLASS = 'select-none [-webkit-touch-callout:none]';

/** For an area with text people may still want to copy: no selection on touch screens only. */
export const TOUCH_GESTURE_CONTENT_CLASS =
  '[-webkit-touch-callout:none] pointer-coarse:select-none';

/** Turns off text selection on `element` while a gesture runs; call what it returns to undo it. */
export function holdSelection(element: HTMLElement) {
  element.style.setProperty('user-select', 'none');
  element.style.setProperty('-webkit-user-select', 'none');
  return () => {
    element.style.removeProperty('user-select');
    element.style.removeProperty('-webkit-user-select');
  };
}

/** Captures the pointer if it is still there; iOS sometimes takes it first, and that's fine. */
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

/** True for a mouse or pen hovering without pressing; false for a finger or anything pressed. */
export const isHoveringPointer = (event: { pointerType: string; buttons: number }) =>
  event.pointerType !== 'touch' && event.buttons === 0;
