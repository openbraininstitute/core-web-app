/**
 * The shots the skeleton figure works out in the browser, and the turn that puts a spine on its
 * dendrite: a spine's mesh is stored in a frame of its own, its root at the origin and +y along it,
 * and the spine table's rotation (a quaternion, x, y, z, w) and position (afferent_surface) put it
 * in place. No three.js here.
 */

import type { Shot } from './data';
import type { Vec3 } from './glide';

/** A unit quaternion, x, y, z, w: the order of the spine table's columns, scipy's and three.js's. */
export type Quat = [number, number, number, number];

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vec3): Vec3 => scale(a, 1 / (norm(a) || 1));
const UP: Vec3 = [0, 1, 0];

/** `p` turned by the unit quaternion `q`. */
export function rotate(q: Quat, p: Vec3): Vec3 {
  const [x, y, z, w] = q;
  // p + w t + q × t, with t = 2 q × p
  const t: Vec3 = [2 * (y * p[2] - z * p[1]), 2 * (z * p[0] - x * p[2]), 2 * (x * p[1] - y * p[0])];
  return add(add(p, scale(t, w)), cross([x, y, z], t));
}

/** A point of a spine's own frame put on the cell: turned by its rotation, then moved by its translation. */
export function placed(rotation: Quat, translation: Vec3, local: Vec3): Vec3 {
  return add(rotate(rotation, local), translation);
}

/** Any unit vector square to the unit vector `d`. */
function across(d: Vec3): Vec3 {
  return unit(cross(d, Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));
}

/** How much a shot of a picked spine holds round its middle, µm. */
export const PICK_RADIUS = 2.5;

/**
 * The shot of one row of the spine table, from the row alone: the spine's middle, half its length
 * from its root (afferent_surface) along its direction, about `PICK_RADIUS` round it, looked at
 * across the spine from as near the way `towards` points as is square to it. Its far end from the
 * dendrite is up: the tip, or, for a row whose frame is turned round (`reversed`: its root nearer
 * the free end and its direction into the dendrite), the root.
 */
export function pickShot(
  root: Vec3,
  direction: Vec3,
  length: number,
  reversed: boolean,
  towards: Vec3
): Shot {
  const d = unit(direction);
  const side = sub(towards, scale(d, dot(towards, d)));
  return {
    target: add(root, scale(d, length / 2)),
    radius: Math.max(PICK_RADIUS, 0.75 * length),
    direction: norm(side) > 1e-3 ? unit(side) : across(d),
    up: reversed ? scale(d, -1) : d,
  };
}

/**
 * Where the chosen spine's copy starts, upright in its own frame (no turn: its +y is the cell's +y),
 * and the shot that holds it and its place. The camera looks square to +y and to the spine's
 * direction, from `towards`' side, so that both lie across the view and the turn between them shows;
 * the copy starts beside its place on the side the spine leans to, past its tip, clear of the
 * dendrite. `lo` and `hi` are the spine's lowest and highest local y.
 */
export function frameShot(
  translation: Vec3,
  rotation: Quat,
  lo: number,
  hi: number,
  towards: Vec3
): { shot: Shot; start: Vec3 } {
  const d = rotate(rotation, UP);
  let view = cross(UP, d);
  // a spine already nearly upright: look across it from `towards`' side
  if (norm(view) < 0.2) view = sub(towards, scale(UP, dot(towards, UP)));
  view = norm(view) > 1e-3 ? unit(view) : [0, 0, 1];
  if (dot(view, towards) < 0) view = scale(view, -1);
  const lean = sub(d, scale(UP, dot(d, UP)));
  const sideways = norm(lean) > 0.05 ? unit(lean) : unit(cross(UP, view));
  const start = add(translation, scale(sideways, hi - lo + 0.8));
  const points = [
    add(start, scale(UP, lo)),
    add(start, scale(UP, hi)),
    translation,
    add(translation, scale(d, lo)),
    add(translation, scale(d, hi)),
  ];
  const min = [0, 1, 2].map((k) => Math.min(...points.map((p) => p[k]))) as Vec3;
  const max = [0, 1, 2].map((k) => Math.max(...points.map((p) => p[k]))) as Vec3;
  return {
    shot: {
      target: scale(add(min, max), 0.5),
      radius: Math.max(1.5, norm(sub(max, min)) / 2 + 0.5),
      direction: view,
      up: UP,
    },
    start,
  };
}
