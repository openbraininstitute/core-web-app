import type { CircuitMorphologyView } from './types';

/** How far the pointer may go between going down and coming up, in CSS pixels, and still have clicked. */
const CLICK_REACH = 4;
/** How long the pointer rests before the cell under it is looked for: a pick sends every segment through the GPU. */
const REST_MS = 60;

interface PointerOptions {
  /** Highlight the cell the pointer rests on. */
  hover: boolean;
  /** Called with the cell that is clicked. */
  onClick?: (cell: number) => void;
  /** Whether a point of the element, in CSS pixels, is something else's to answer for: no cell is looked for there. */
  taken?: (x: number, y: number) => boolean;
}

export type Point = { x: number; y: number };

/** Whether a pointer that went down at `from` and is now at `to`, in CSS pixels, may yet have clicked. */
export const clicks = (from: Point, to: Point) =>
  Math.hypot(to.x - from.x, to.y - from.y) <= CLICK_REACH;

/**
 * Tell `view` which cell the pointer over `element` rests on, and `onClick` which one it clicks, as against drags.
 * Returns what stops it.
 */
export function trackPointer(
  element: HTMLElement,
  view: Pick<CircuitMorphologyView, 'pick' | 'setHighlight' | 'moving'>,
  { hover, onClick, taken }: PointerOptions
): () => void {
  const off = new AbortController();
  // On the page, as the events have them: the view is measured only for a pick.
  let down: (Point & { id: number }) | null = null;
  let last: Point | null = null;
  let rest: ReturnType<typeof setTimeout> | undefined;
  // Counts what may have changed the cell under the pointer, to tell a pick that is out of date by its answer.
  let changes = 0;
  let picking = false;

  const at = (e: PointerEvent): Point => ({ x: e.clientX, y: e.clientY });

  // A pick that fails finds nothing.
  const pickAt = (point: Point): Promise<number | null> => {
    const box = element.getBoundingClientRect();
    const x = point.x - box.left;
    const y = point.y - box.top;
    if (taken?.(x, y)) return Promise.resolve(null);
    try {
      return view.pick(x, y).catch(() => null);
    } catch {
      return Promise.resolve(null);
    }
  };

  const look = () => {
    const point = last;
    if (!point) return;
    // One pick at a time, as a slow GPU would fall behind the pointer, and none while the view glides under it.
    if (picking || view.moving) {
      rest = setTimeout(look, REST_MS);
      return;
    }
    picking = true;
    const asked = changes;
    void pickAt(point).then((cell) => {
      picking = false;
      if (!off.signal.aborted && asked === changes) view.setHighlight(cell);
    });
  };

  const forget = () => {
    changes++;
    clearTimeout(rest);
  };

  const lookAfterRest = () => {
    forget();
    if (hover && last) rest = setTimeout(look, REST_MS);
  };

  const onMove = (e: PointerEvent) => {
    if (e.buttons === 0) {
      last = at(e);
      lookAfterRest();
      return;
    }
    // A drag moves the view from under the pointer. A press that may yet be a click keeps the highlight.
    if (hover && !(down && clicks(down, at(e)))) view.setHighlight(null);
  };

  const onDown = (e: PointerEvent) => {
    down = e.isPrimary && e.button === 0 ? { id: e.pointerId, ...at(e) } : null;
    forget();
  };

  const onUp = (e: PointerEvent) => {
    const from = down?.id === e.pointerId ? down : null;
    down = null;
    const point = at(e);
    last = point;
    if (!from || !clicks(from, point)) {
      lookAfterRest();
      return;
    }
    // A click left the view where it was: one pick answers for the highlight and the click.
    forget();
    const asked = changes;
    void pickAt(point).then((cell) => {
      if (off.signal.aborted) return;
      if (hover && asked === changes) view.setHighlight(cell);
      if (cell !== null) onClick?.(cell);
    });
  };

  const onCancel = () => {
    down = null;
  };

  const onLeave = () => {
    last = null;
    forget();
    if (hover) view.setHighlight(null);
  };

  // Only a wheel that zooms is heard here: the viewer keeps the others from its canvas.
  const onWheel = () => lookAfterRest();

  const { signal } = off;
  // In the capture phase: a press the electrodes keep from the canvas is still heard here.
  const capture = { signal, capture: true };
  element.addEventListener('pointermove', onMove, capture);
  element.addEventListener('pointerdown', onDown, capture);
  element.addEventListener('pointerup', onUp, capture);
  element.addEventListener('pointercancel', onCancel, capture);
  element.addEventListener('pointerleave', onLeave, { signal });
  element.addEventListener('wheel', onWheel, { signal, passive: true });

  return () => {
    off.abort();
    onLeave();
  };
}
