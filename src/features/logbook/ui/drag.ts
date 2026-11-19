// A drag on a resize handle: pointer capture, so the moves keep coming when the
// pointer leaves the handle; one place for the rail and the split.
import type { PointerEvent as ReactPointerEvent } from 'react';

export function dragHandle(
  event: ReactPointerEvent<HTMLElement>,
  onMove: (move: PointerEvent, stop: () => void) => void
): void {
  const handle = event.currentTarget;
  handle.setPointerCapture(event.pointerId);
  const move = (e: PointerEvent): void => onMove(e, stop);
  function stop(): void {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', stop);
    handle.removeEventListener('pointercancel', stop);
  }
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
}
