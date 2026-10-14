import type { CircuitMorphologyView, MarkerOnScreen, SectionSpot } from './types';

/** How far the pointer may go between going down and coming up, in CSS pixels, and still have clicked. */
const CLICK_REACH = 4;
/** How long the pointer rests before the cell under it is looked for: a pick sends every segment through the GPU. */
const REST_MS = 60;

/** A morphology location's marker by its index, or a point of a section where there is none. */
export type LocationHit = ({ marker: number } & MarkerOnScreen) | { spot: SectionSpot };

export interface LocationOptions {
  /** Told what the pointer rests on, null for nothing, and of nothing once it moves the view or leaves. */
  onHover?: (hit: LocationHit | null) => void;
  /** Told what a click lands on. */
  onPick?: (hit: LocationHit) => void;
  /** Whether a click on this point would do anything: the pointer shows a hand over it, and over a marker. */
  pickable: (spot: SectionSpot) => boolean;
}

interface PointerOptions {
  /** Highlight the cell the pointer rests on. */
  hover: boolean;
  /** Called with the cell that is clicked. */
  onClick?: (cell: number) => void;
  /** Whether a point of the element, in CSS pixels, is something else's to answer for: no cell is looked for there. */
  taken?: (x: number, y: number) => boolean;
  locations?: LocationOptions;
}

export type Point = { x: number; y: number };

/** Whether a pointer that went down at `from` and is now at `to`, in CSS pixels, may yet have clicked. */
export const clicks = (from: Point, to: Point) =>
  Math.hypot(to.x - from.x, to.y - from.y) <= CLICK_REACH;

/**
 * Tell `view` which cell the pointer over `element` rests on, and `onClick` which one it clicks, as against drags;
 * with `locations`, also the morphology location's marker or the point of a section it rests on and clicks. Returns
 * what stops it.
 */
export function trackPointer(
  element: HTMLElement,
  view: Pick<
    CircuitMorphologyView,
    'pick' | 'setHighlight' | 'moving' | 'pickSection' | 'markerAt'
  >,
  { hover, onClick, taken, locations }: PointerOptions
): () => void {
  const off = new AbortController();
  // On the page, as the events have them: the view is measured only for a pick.
  let down: (Point & { id: number }) | null = null;
  let last: Point | null = null;
  let rest: ReturnType<typeof setTimeout> | undefined;
  // Counts what may have changed the cell under the pointer, to tell a pick that is out of date by its answer.
  let changes = 0;
  let picking = false;
  const resting = hover || locations?.onHover !== undefined;

  const at = (e: PointerEvent): Point => ({ x: e.clientX, y: e.clientY });

  /** The point in the element, or null where something else answers for it. */
  const inElement = (point: Point): Point | null => {
    const box = element.getBoundingClientRect();
    const x = point.x - box.left;
    const y = point.y - box.top;
    return taken?.(x, y) ? null : { x, y };
  };

  // A pick that fails finds nothing.
  const tried = <T>(pick: () => Promise<T | null>): Promise<T | null> => {
    try {
      return pick().catch(() => null);
    } catch {
      return Promise.resolve(null);
    }
  };

  const pickAt = (point: Point): Promise<number | null> => {
    const p = inElement(point);
    return p ? tried(() => view.pick(p.x, p.y)) : Promise.resolve(null);
  };

  // A marker before the section under it, which a click would add a location beside.
  const locate = (point: Point): Promise<LocationHit | null> => {
    const p = inElement(point);
    if (!p) return Promise.resolve(null);
    const marker = view.markerAt(p.x, p.y);
    if (marker) {
      const { index, ...onScreen } = marker;
      return Promise.resolve({ marker: index, ...onScreen });
    }
    return tried(() => view.pickSection(p.x, p.y)).then((spot) => spot && { spot });
  };

  const tell = (hit: LocationHit | null) => {
    if (!locations?.onHover) return;
    locations.onHover(hit);
    // On the canvas: the electrodes' gesture has the element's.
    const canvas = element.querySelector('canvas');
    const hand = hit !== null && ('marker' in hit || locations.pickable(hit.spot));
    if (canvas) canvas.style.cursor = hand ? 'pointer' : '';
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
    void Promise.all([
      hover ? pickAt(point) : null,
      locations?.onHover ? locate(point) : null,
    ]).then(([cell, hit]) => {
      picking = false;
      if (off.signal.aborted || asked !== changes) return;
      if (hover) view.setHighlight(cell);
      tell(hit);
    });
  };

  const forget = () => {
    changes++;
    clearTimeout(rest);
  };

  const lookAfterRest = () => {
    forget();
    if (resting && last) rest = setTimeout(look, REST_MS);
  };

  const onMove = (e: PointerEvent) => {
    if (e.buttons === 0) {
      last = at(e);
      lookAfterRest();
      return;
    }
    // A drag moves the view from under the pointer. A press that may yet be a click keeps the highlight.
    if (down && clicks(down, at(e))) return;
    if (hover) view.setHighlight(null);
    tell(null);
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
    if (hover || onClick) {
      void pickAt(point).then((cell) => {
        if (off.signal.aborted) return;
        if (hover && asked === changes) view.setHighlight(cell);
        if (cell !== null) onClick?.(cell);
      });
    }
    const onPick = locations?.onPick;
    if (onPick) {
      void locate(point).then((hit) => {
        if (off.signal.aborted || !hit) return;
        onPick(hit);
        // What is under the pointer has changed: a location added there is a marker now.
        lookAfterRest();
      });
    }
  };

  const onCancel = () => {
    down = null;
  };

  const onLeave = () => {
    last = null;
    forget();
    if (hover) view.setHighlight(null);
    tell(null);
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
