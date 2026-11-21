/**
 * The camera's glide from one shot to the next, worked out without three.js: how far it stands
 * from a shot's target, how long it takes, and where it is along the way.
 */

export type Vec3 = [number, number, number];

/** Ease in and out, 0 to 1, the slope flat at both ends. */
export function easeInOut(u: number): number {
  const t = Math.min(1, Math.max(0, u));
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * How far from its target a perspective camera of vertical field `fovDeg`, `aspect` wide per unit
 * of height, must stand to see a sphere of `radius` round the target whole, times `fill`: below 1
 * comes closer, as a shot's sphere holds more than the subject in most directions.
 */
export function shotDistance(radius: number, fovDeg: number, aspect: number, fill = 1): number {
  const half = (fovDeg * Math.PI) / 360;
  const halfX = Math.atan(Math.tan(half) * Math.max(aspect, 1e-3));
  return (radius / Math.sin(Math.min(half, halfX))) * fill;
}

/** Where the camera looks and from how far: one end of a glide. */
export interface Stance {
  target: Vec3;
  distance: number;
}

/**
 * The camera `u` of the way through a glide (0 to 1, not yet eased): its target, its distance, and
 * how far its turn has gone (0 to 1, for a slerp). The distance changes by the same factor in equal
 * times, so that a zoom from the whole cell to one spine looks steady, and the target moves as the
 * distance does: zooming in it reaches the new subject early, while the view is still wide enough to
 * show where it is; zooming out it leaves the old one late. Over about the same distance both go
 * evenly.
 */
export function glideAt(
  from: Stance,
  to: Stance,
  u: number
): { target: Vec3; distance: number; turn: number } {
  const e = easeInOut(u);
  const ratio = to.distance / from.distance;
  const k = Math.abs(Math.log(ratio));
  const distance = from.distance * ratio ** e;
  // How much the target's path follows the zoom: not at all for a glide that barely zooms, where
  // the fraction below divides by nearly nothing.
  const w = Math.min(1, k / 0.7);
  const zoomed = k > 1e-6 ? (distance - from.distance) / (to.distance - from.distance) : e;
  const s = (1 - w) * e + w * zoomed;
  const target = from.target.map((v, i) => v + (to.target[i] - v) * s) as Vec3;
  return { target, distance, turn: e };
}

/** How long a glide takes, ms: longer the more it zooms and turns, from 1.2 to 1.8 s. */
export function glideMs(from: Stance, to: Stance, turnRad: number): number {
  const k = Math.abs(Math.log(to.distance / from.distance));
  return Math.min(1800, 1200 + 150 * k + (300 * Math.abs(turnRad)) / Math.PI);
}
