import type { Box3 } from 'three';

/**
 * Radius of the smallest origin-centred sphere containing `box`, i.e. the
 * distance to its farthest corner. Mesh and skeleton coordinates put the soma
 * at the origin, so this is how far the camera must see when orbiting the
 * soma. 0 for an empty box.
 */
export function orbitRadius(box: Box3): number {
  if (box.isEmpty()) return 0;
  return Math.hypot(
    Math.max(Math.abs(box.min.x), Math.abs(box.max.x)),
    Math.max(Math.abs(box.min.y), Math.abs(box.max.y)),
    Math.max(Math.abs(box.min.z), Math.abs(box.max.z))
  );
}

/**
 * Distance along +z from the origin at which a camera looking down -z at the origin (the soma) sees every one of
 * `points` (x, y, z after one another), with `tanX`, `tanY` the tangents of its half fields of view. Each point needs
 * the camera `|x| / tanX` (or `|y| / tanY`) in front of it to fit, and `fill` shrinks the half fields so the point
 * that decides the distance sits that fraction of the way from the centre to its edge: that side of the cell comes
 * close to the edge of the view, the others as far as keeping the soma in the centre leaves. Never closer than
 * `minGap` in front of the nearest point. 0 when there are no points.
 */
export function fitDistance(
  points: ArrayLike<number>,
  tanX: number,
  tanY: number,
  fill: number,
  minGap = 0
): number {
  const sx = 1 / (tanX * fill),
    sy = 1 / (tanY * fill);
  let d = 0;
  for (let i = 0; i + 2 < points.length; i += 3) {
    const need =
      points[i + 2] + Math.max(Math.abs(points[i]) * sx, Math.abs(points[i + 1]) * sy, minGap);
    if (need > d) d = need;
  }
  return d;
}

/** Near plane as a fraction of the orbit distance: what is cut sits 1000× closer than the target. */
const NEAR_FRACTION = 1 / 1000;
/** Below this float32 vertex positions jitter anyway, millimetres from the soma. */
const NEAR_FLOOR = 0.001;

/**
 * Clip planes for a camera `orbitDist` from its orbit target and `originDist`
 * from the origin, around a scene within `radius` of the origin. The near
 * plane follows the zoom, so a fibre can fill the view however large the cell;
 * depth precision depends on the near plane alone, so the far plane simply
 * clears the whole scene from wherever the camera is.
 */
export function clipRange(
  orbitDist: number,
  originDist: number,
  radius: number
): { near: number; far: number } {
  const near = Math.max(NEAR_FLOOR, orbitDist * NEAR_FRACTION);
  return { near, far: Math.max(near * 2, (originDist + radius) * 1.05) };
}

/** How far a depth colour scale reaches either side of the orbit target at most, as a fraction of the orbit distance. */
const DEPTH_WINDOW = 0.4;

/**
 * The depths, in front of a camera at `eye` looking along the unit vector `dir` at a target `orbitDist` away, that a
 * depth colour scale runs over: those of `points` (x, y, z after one another; a sample of the mesh), cut to
 * `DEPTH_WINDOW` × `orbitDist` either side of the target. From afar that is the cell's own depth, however shallow it
 * is along the view, so the whole scale is used; close up the scale spreads over what lies around the target. Just the
 * window when no point lies in it. Where the camera's distance does not follow the zoom (orthographic), the window is
 * `DEPTH_WINDOW` × `reach` instead: `reach` is the distance a perspective camera would need for the same view.
 */
export function depthSpan(
  points: ArrayLike<number>,
  eye: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  orbitDist: number,
  reach: number = orbitDist
): { near: number; far: number } {
  let lo = Infinity,
    hi = -Infinity;
  for (let i = 0; i + 2 < points.length; i += 3) {
    const z =
      (points[i] - eye.x) * dir.x +
      (points[i + 1] - eye.y) * dir.y +
      (points[i + 2] - eye.z) * dir.z;
    if (z < lo) lo = z;
    if (z > hi) hi = z;
  }
  const w = DEPTH_WINDOW * reach;
  const near = Math.max(lo, orbitDist - w),
    far = Math.min(hi, orbitDist + w);
  return far > near ? { near, far } : { near: orbitDist - w, far: orbitDist + w };
}
