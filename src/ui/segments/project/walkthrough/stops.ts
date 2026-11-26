/** The first of `stops` past `at`, down (1) or up (-1); null if there is none. */
export function stopFrom(stops: number[], at: number, way: 1 | -1): number | null {
  const ahead = stops.filter((stop) => (way > 0 ? stop > at + 2 : stop < at - 2));
  if (!ahead.length) return null;
  return way > 0 ? Math.min(...ahead) : Math.max(...ahead);
}

/**
 * Going back against a held turn: a swipe, three events or more in a row that travel `REVERSE_SWIPE_PX` between
 * them; or one event that travels `REVERSE_NOTCH_PX`, as a mouse wheel's notch does. Smaller, it is a stray tick as
 * a trackpad gesture ends, which would bounce the page back the way it came.
 */
export const REVERSE_SWIPE_PX = 60;
export const REVERSE_SWIPE_EVENTS = 3;
export const REVERSE_NOTCH_PX = 100;

/** What the wheel has done against a held turn so far: how far, and in how many events in a row. */
export type TReverse = { px: number; events: number };

/**
 * Whether a wheel event against the held turn's way (`heldWay`) is the visitor going back, rather than a stray tick
 * as a trackpad gesture ends. An event the held way starts the count again.
 */
export function reverseOf(
  before: TReverse,
  delta: number,
  heldWay: number
): TReverse & { back: boolean } {
  const way = Math.sign(delta);
  if (!heldWay || !way || way === heldWay) return { px: 0, events: 0, back: false };
  const px = before.px + Math.abs(delta);
  const events = before.events + 1;
  const swipe = events >= REVERSE_SWIPE_EVENTS && px >= REVERSE_SWIPE_PX;
  return { px, events, back: swipe || Math.abs(delta) >= REVERSE_NOTCH_PX };
}
