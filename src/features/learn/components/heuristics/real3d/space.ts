/**
 * What the 3D heuristics share: points in the brain's own frame, an
 * orthographic view that turns about the brain's vertical axis, and a neuron
 * put in place — which way to look at it, how much room it needs, and the way
 * out along its axon.
 *
 * Everything is in the Allen CCF frame: (AP, DV, ML) in µm.
 */

import { type Pt, smooth } from '../shared';

import type { Neuron, V3 } from './data';

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const unit = (a: V3, fallback: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 1e-6 ? scale(a, 1 / l) : fallback;
};

/** How far the view looks down on the brain, and how fast it turns (radians, per second). */
export const PITCH = 0.3;
export const SPIN = 0.09;

/** The middle of a box around flat (AP, DV, ML) triples. */
export function centreOf(pts: ArrayLike<number>): V3 {
  const lo: V3 = [Infinity, Infinity, Infinity];
  const hi: V3 = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pts.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k], pts[i + k]);
      hi[k] = Math.max(hi[k], pts[i + k]);
    }
  }
  return [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
}

/** How far a view centred on `c` must reach — across, up, and all round — to hold all the points at every one of `yaws` (µm). */
export interface Ext {
  hx: number;
  hy: number;
  hr: number;
}

/** That reach, for all the points — or, with `share` below 1, for that share of them, letting the furthest few go. */
export function extent(pts: ArrayLike<number>, c: V3, yaws: number[], share = 1): Ext {
  const cp = Math.cos(PITCH);
  const sp = Math.sin(PITCH);
  const count = pts.length / 3;
  const xs = new Float32Array(count);
  const ys = new Float32Array(count);
  const rs = new Float32Array(count);
  for (const yaw of yaws) {
    const ct = Math.cos(yaw);
    const st = Math.sin(yaw);
    for (let i = 0; i < count; i++) {
      const qa = pts[i * 3] - c[0];
      const qd = pts[i * 3 + 1] - c[1];
      const qm = pts[i * 3 + 2] - c[2];
      const z1 = qa * st + qm * ct;
      const x = qa * ct - qm * st;
      const y = qd * cp - z1 * sp;
      xs[i] = Math.max(xs[i], Math.abs(x));
      ys[i] = Math.max(ys[i], Math.abs(y));
      rs[i] = Math.max(rs[i], Math.hypot(x, y));
    }
  }
  const pick = (a: Float32Array) => {
    if (!count) return 1;
    if (share < 1)
      return Math.max(
        1,
        Float32Array.from(a).sort()[Math.min(count - 1, Math.floor(share * count))]
      );
    let most = 1;
    for (const v of a) most = Math.max(most, v);
    return most;
  };
  return { hx: pick(xs), hy: pick(ys), hr: pick(rs) };
}

/** All the way round, for whatever keeps turning. */
export const ROUND = Array.from({ length: 24 }, (_, i) => (i * Math.PI) / 12);

/**
 * An orthographic view: the brain turned `yaw` about its vertical axis, looked
 * down on by `pitch` (PITCH, unless someone has tilted it), and the picture
 * that makes spun `roll` about the line of sight, clockwise; `s` px per µm,
 * with the point `c` on screen at (ox, oy). Screen x runs along the brain at
 * yaw 0 — nose to the left — and y down it; depth runs away from the viewer.
 */
export interface View {
  c: V3;
  ct: number;
  st: number;
  cp: number;
  sp: number;
  cr: number;
  sr: number;
  s: number;
  ox: number;
  oy: number;
}

export const view = (
  yaw: number,
  s: number,
  c: V3,
  ox: number,
  oy: number,
  pitch = PITCH,
  roll = 0
): View => ({
  c,
  ct: Math.cos(yaw),
  st: Math.sin(yaw),
  cp: Math.cos(pitch),
  sp: Math.sin(pitch),
  cr: Math.cos(roll),
  sr: Math.sin(roll),
  s,
  ox,
  oy,
});

export function at(v: View, p: V3): Pt {
  const qa = p[0] - v.c[0];
  const qd = p[1] - v.c[1];
  const qm = p[2] - v.c[2];
  const z1 = qa * v.st + qm * v.ct;
  const x = qa * v.ct - qm * v.st;
  const y = qd * v.cp - z1 * v.sp;
  return { x: v.ox + v.s * (x * v.cr - y * v.sr), y: v.oy + v.s * (x * v.sr + y * v.cr) };
}

/** How far `p` is in front of (−) or behind (+) the view's centre, µm. */
export function depthOf(v: View, p: V3) {
  const qa = p[0] - v.c[0];
  const qd = p[1] - v.c[1];
  const qm = p[2] - v.c[2];
  return qd * v.sp + (qa * v.st + qm * v.ct) * v.cp;
}

/** A direction in the brain, turned into the view's frame: (right, down, away). */
export function turn(v: View, d: V3): V3 {
  const z1 = d[0] * v.st + d[2] * v.ct;
  const x = d[0] * v.ct - d[2] * v.st;
  const y = d[1] * v.cp - z1 * v.sp;
  return [x * v.cr - y * v.sr, x * v.sr + y * v.cr, d[1] * v.sp + z1 * v.cp];
}

/** 1 below zoom `from`, 0 beyond `to`, eased between on a log scale: how much of something to show at zoom `z`. */
export const fadeOver = (z: number, from: number, to: number) =>
  1 - smooth(Math.log(z / from) / Math.log(to / from));

/* ---------------------------------------------------------- routes on screen */

/** The cumulative screen length along a route. */
export function lengths(route: Pt[]) {
  const cum = new Float64Array(route.length);
  for (let i = 1; i < route.length; i++)
    cum[i] = cum[i - 1] + Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y);
  return cum;
}

export function pointAt(route: Pt[], cum: Float64Array, d: number): Pt {
  const last = route.length - 1;
  if (d <= 0) return route[0];
  if (d >= cum[last]) return route[last];
  let lo = 1;
  let hi = last;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < d) lo = mid + 1;
    else hi = mid;
  }
  const seg = cum[lo] - cum[lo - 1];
  const k = seg > 0 ? (d - cum[lo - 1]) / seg : 0;
  return {
    x: route[lo - 1].x + (route[lo].x - route[lo - 1].x) * k,
    y: route[lo - 1].y + (route[lo].y - route[lo - 1].y) * k,
  };
}

/** A route as far as `reach` µm along it, by the µm `d` at each of its points. */
export function upTo(route: Pt[], d: number[], reach: number): Pt[] {
  const out: Pt[] = [route[0]];
  for (let i = 1; i < route.length; i++) {
    if (d[i] <= reach) {
      out.push(route[i]);
      continue;
    }
    const k = d[i] > d[i - 1] ? (reach - d[i - 1]) / (d[i] - d[i - 1]) : 0;
    out.push({
      x: route[i - 1].x + (route[i].x - route[i - 1].x) * k,
      y: route[i - 1].y + (route[i].y - route[i - 1].y) * k,
    });
    break;
  }
  return out;
}

/* --------------------------------------------------------------------- words */

export const capital = (s: string) => s[0].toUpperCase() + s.slice(1);
export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** A length the way people say it. */
export function length(um: number) {
  if (um >= 10000) return `${(um / 10000).toFixed(1)} cm`;
  if (um >= 1000) return `${(um / 1000).toFixed(1)} mm`;
  return `${Math.round(um)} µm`;
}

/* ------------------------------------------------------------ a neuron, placed */

export interface Placed {
  n: Neuron;
  /** The neuron's nodes in the brain, µm. */
  wx: Float32Array;
  wy: Float32Array;
  wz: Float32Array;
  soma: V3;
  brainCentre: V3;
  /** Which side of the midline the neuron is on: −1 or 1. */
  side: number;
  /** How much room the whole brain needs while it shows, and how deep it is. */
  brainExt: Ext;
  depth: number;
  /** The dendrites' centre, and their reach from it whichever way they turn. */
  centre: V3;
  ext: Ext;
  reach: number;
  /** The way out: soma to the axon's furthest end, with µm along it; from `cut` on, where the reconstruction stops, carried on as a guess. */
  out: { pts: V3[]; d: number[]; cut: number };
  /** The dendrites and that way out, together. */
  outCentre: V3;
  outExt: Ext;
  /** Where the view starts, turned to face the neuron's side from a little in front, and which way it turns from there. */
  yaw0: number;
  spin: number;
}

/**
 * A neuron in a brain whose surface points are `root`. The brain shows for
 * `brainFor` ms before the view has closed in, which is how far it turns while
 * it still has to fit — or, Infinity, for as long as anyone looks, turning all
 * the way round.
 */
export function place(root: Float32Array, n: Neuron, brainFor: number): Placed {
  const count = n.x.length;
  const wx = Float32Array.from(n.x, (v) => v + n.soma[0]);
  const wy = Float32Array.from(n.y, (v) => v + n.soma[1]);
  const wz = Float32Array.from(n.z, (v) => v + n.soma[2]);
  const node = (i: number): V3 => [wx[i], wy[i], wz[i]];
  const soma = node(0);

  const brainCentre = centreOf(root);
  // look at the neuron's side of the brain, from in front and a little to the side, turning towards the nose
  const side = soma[2] >= brainCentre[2] ? 1 : -1;
  const yaw0 = side > 0 ? Math.PI - 0.35 : 0.35;
  const spin = side > 0 ? -SPIN : SPIN;
  const brainYaws = Number.isFinite(brainFor)
    ? Array.from({ length: 8 }, (_, i) => yaw0 + (spin * brainFor * i) / 7000)
    : ROUND;
  let depth = 1;
  for (let i = 0; i < root.length; i += 3) {
    depth = Math.max(
      depth,
      Math.hypot(
        root[i] - brainCentre[0],
        root[i + 1] - brainCentre[1],
        root[i + 2] - brainCentre[2]
      )
    );
  }

  const dend: number[] = [];
  for (let i = 0; i < count; i++) if (n.type[i] !== 2) dend.push(wx[i], wy[i], wz[i]);
  const centre = centreOf(dend);
  const ext = extent(dend, centre, ROUND);
  const reach = Math.max(ext.hx, ext.hy);

  const pts = n.output.map(node);
  const d = n.output.map((i) => n.dist[i]);
  let cut = pts.length;
  if (n.axon.length < 1000) {
    // reconstructed from a slice, the axon stops where the slice did: carry on the way it was going
    if (!pts.length) {
      pts.push(soma);
      d.push(0);
    }
    cut = pts.length - 1;
    const last = pts[cut];
    const dir = unit(sub(last, pts.length > 1 ? pts[Math.max(0, cut - 3)] : centre), [0, 1, 0]);
    const len = reach * 0.45;
    for (let k = 1; k <= 10; k++) {
      pts.push(add(last, scale(dir, (len * k) / 10)));
      d.push(d[cut] + (len * k) / 10);
    }
  }
  const both = [...dend, ...pts.flat()];
  const outCentre = centreOf(both);

  return {
    n,
    wx,
    wy,
    wz,
    soma,
    brainCentre,
    side,
    brainExt: extent(root, brainCentre, brainYaws),
    depth,
    centre,
    ext,
    reach,
    out: { pts, d, cut },
    outCentre,
    outExt: extent(both, outCentre, ROUND),
    yaw0,
    spin,
  };
}
