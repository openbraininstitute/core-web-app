// Touch primitives for `morphing-tabs`, from beui.dev/components/blocks/morphing-tabs.
//
// iOS and iPadOS run their own gestures on top of the page — the long-press
// selection callout and the selection it drags in with it — and they win: once
// the platform claims a touch it cancels ours mid-gesture. Surfaces that own
// their gesture have to opt out.

/**
 * Classes for a surface that *is* the control. `-webkit-touch-callout: none`
 * stops iOS's long-press callout; `user-select: none` stops the long-press
 * selection on every engine and keeps a drag from painting a selection.
 */
export const TOUCH_GESTURE_CLASS = 'select-none [-webkit-touch-callout:none]';

/**
 * Pointer capture, best effort. WebKit throws `NotFoundError` when the pointer
 * is already gone by the time the handler runs — routine on iOS, where the
 * system can claim the touch first — and an uncaught throw takes the rest of
 * the handler, the gesture included, down with it. Touch pointers carry
 * implicit capture anyway, so losing it is never fatal.
 */
export function capturePointer(element: Element, pointerId: number) {
  try {
    element.setPointerCapture(pointerId);
  } catch {
    // Pointer is no longer active — implicit capture still applies on touch.
  }
}
