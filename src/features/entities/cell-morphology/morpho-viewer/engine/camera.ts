/**
 * The orthographic view and the perspective one, kept as alike as they can be: switching keeps the target, the
 * direction and how large the cell is at the target. An orthographic camera stays where the perspective one was, so
 * what hangs on the camera's distance (fog, the cutaway plane, the depth colours) works the same, and `reach`, the
 * distance a perspective camera would need for the same view, stands in for the zoom.
 */

const halfTan = (fov: number): number => Math.tan((fov * Math.PI) / 360);

/** Half the height, µm, that a perspective camera `distance` from its target sees there, for a vertical `fov` in degrees. */
export function halfHeightAt(distance: number, fov: number): number {
  return distance * halfTan(fov);
}

/** The distance from its target at which a perspective camera sees `halfHeight` µm above and below it. */
export function distanceFor(halfHeight: number, fov: number): number {
  return halfHeight / halfTan(fov);
}

/**
 * Half the height of an orthographic view down -z at the origin that holds every one of `points` (x, y, z after one
 * another) for a view `aspect` wide per unit of height, the side that reaches farthest `fill` of the way to the edge,
 * as `fitDistance` frames a perspective view. 0 without points.
 */
export function fitHalfHeight(points: ArrayLike<number>, aspect: number, fill: number): number {
  let half = 0;
  for (let i = 0; i + 2 < points.length; i += 3) {
    half = Math.max(half, Math.abs(points[i + 1]), Math.abs(points[i]) / aspect);
  }
  return half / fill;
}

/** µm per CSS pixel of an orthographic camera `top` - `bottom` µm high at zoom 1, drawn `cssHeight` pixels high. */
export function orthoPixelScale(
  top: number,
  bottom: number,
  zoom: number,
  cssHeight: number
): number {
  return (top - bottom) / (zoom * Math.max(1, cssHeight));
}

/**
 * Clip planes of an orthographic camera `distance` from its target, around a scene within `radius` of that target.
 * The near plane can fall behind the camera: an orthographic view has no eye to stay in front of.
 */
export function orthoClip(distance: number, radius: number): { near: number; far: number } {
  const r = 1.05 * Math.max(radius, 1e-3);
  return { near: distance - r, far: distance + r };
}

/**
 * The depth cue's fog, for a camera `distance` from its target and a view as close as a perspective camera `reach`
 * away: from 0.45 × reach in front of the target to 0.9 × reach behind it (0.55 to 1.9 × the distance in perspective).
 */
export function fogRange(distance: number, reach: number): { near: number; far: number } {
  return { near: distance - 0.45 * reach, far: distance + 0.9 * reach };
}
