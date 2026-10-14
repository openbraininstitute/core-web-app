import type { CircuitMorphologyView } from './types';

/** How far the pointer may go between going down and coming up, in CSS pixels, and still have clicked. */
const CLICK_REACH = 4;
/** How long the pointer rests before the cell under it is looked for: a pick sends every segment through the GPU. */
const REST_MS = 60;
/** The same once the view has been moved, which glides on a little. */
const SETTLE_MS = 250;

export interface PointerOptions {
  /** Highlight the cell the pointer rests on. */
  hover: boolean;
  /** Called with the cell that is clicked. */
  onClick?: (cell: number) => void;
}

/**
 * Tell `view` which cell the pointer over `element` rests on, and `onClick` which one it clicks, as against drags.
 * Returns what stops it.
 */
export function trackPointer(
  element: HTMLElement,
  view: Pick<CircuitMorphologyView, 'pick' | 'setHighlight'>,
  { hover, onClick }: PointerOptions
): () => void {
  let stopped = false;
  let down: { id: number; x: number; y: number } | null = null;
  let last: { x: number; y: number } | null = null;
  let rest: ReturnType<typeof setTimeout> | undefined;
  /** Counts what may have changed the cell under the pointer, to tell a pick that is out of date by its answer. */
  let changes = 0;
  let picking = false;

  const place = (e: PointerEvent) => {
    const box = element.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };
  const clicks = (from: { x: number; y: number }, to: { x: number; y: number }) =>
    Math.hypot(to.x - from.x, to.y - from.y) <= CLICK_REACH;

  const look = () => {
    const at = last;
    if (!at) return;
    // One pick at a time: a slow GPU would fall behind the pointer.
    if (picking) {
      rest = setTimeout(look, REST_MS);
      return;
    }
    picking = true;
    const asked = changes;
    void view.pick(at.x, at.y).then((cell) => {
      picking = false;
      if (!stopped && asked === changes) view.setHighlight(cell);
    });
  };

  const lookAfter = (ms: number) => {
    changes++;
    clearTimeout(rest);
    if (hover && last) rest = setTimeout(look, ms);
  };

  const onMove = (e: PointerEvent) => {
    if (e.buttons === 0) {
      last = place(e);
      lookAfter(REST_MS);
      return;
    }
    // A drag moves the view from under the pointer. A press that may yet be a click keeps the highlight.
    if (hover && !(down && clicks(down, place(e)))) view.setHighlight(null);
  };

  const onDown = (e: PointerEvent) => {
    down = e.isPrimary && e.button === 0 ? { id: e.pointerId, ...place(e) } : null;
    changes++;
    clearTimeout(rest);
  };

  const onUp = (e: PointerEvent) => {
    const from = down?.id === e.pointerId ? down : null;
    down = null;
    const at = place(e);
    last = at;
    lookAfter(SETTLE_MS);
    if (!from || !onClick || !clicks(from, at)) return;
    void view.pick(at.x, at.y).then((cell) => {
      if (!stopped && cell !== null) onClick(cell);
    });
  };

  const onCancel = () => {
    down = null;
  };

  const onLeave = () => {
    last = null;
    changes++;
    clearTimeout(rest);
    if (hover) view.setHighlight(null);
  };

  // Only a wheel that zooms is heard here: the viewer keeps the others from its canvas.
  const onWheel = () => lookAfter(SETTLE_MS);

  element.addEventListener('pointermove', onMove);
  element.addEventListener('pointerdown', onDown);
  element.addEventListener('pointerup', onUp);
  element.addEventListener('pointercancel', onCancel);
  element.addEventListener('pointerleave', onLeave);
  element.addEventListener('wheel', onWheel, { passive: true });

  return () => {
    stopped = true;
    clearTimeout(rest);
    element.removeEventListener('pointermove', onMove);
    element.removeEventListener('pointerdown', onDown);
    element.removeEventListener('pointerup', onUp);
    element.removeEventListener('pointercancel', onCancel);
    element.removeEventListener('pointerleave', onLeave);
    element.removeEventListener('wheel', onWheel);
    if (hover) view.setHighlight(null);
  };
}
