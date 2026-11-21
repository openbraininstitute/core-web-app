/**
 * The fly-throughs' paths: a dendrite from the soma to one of its tips, resampled and smoothed for a camera to ride,
 * with a frame along it that does not twist. No three.js here.
 */

import type { SpinyData, Vec3 } from './types';

/** How far apart the path's samples are, µm. */
export const PATH_STEP = 0.5;
/** How far either side each sample is averaged over, µm: the camera rides the dendrite's course, not its wiggles. */
const SMOOTH_UM = 6;

/** A dendrite from the soma to a tip, as the camera rides it. */
export interface DendritePath {
  /** The sections, root first, by their row in the skeleton's structure (the spine table's afferent_section_id). */
  sections: number[];
  /** Spines on those sections. */
  spines: number;
  /** Its length, µm. */
  length: number;
  /** x, y, z per sample, PATH_STEP apart, smoothed; in the file's frame. */
  points: Float32Array;
  /** A unit tangent per sample, and a unit normal to it that turns as little as it can: the camera's up. */
  tangents: Float32Array;
  ups: Float32Array;
  /** The dendrite's radius per sample, µm, smoothed as the points are. */
  radii: Float32Array;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function unit(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 0 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0];
}
const at = (a: ArrayLike<number>, i: number, stride = 3): Vec3 => [
  a[stride * i],
  a[stride * i + 1],
  a[stride * i + 2],
];

/** Points every `step` along a polyline (x, y, z after one another), from its start to its end. */
export function resample(points: Vec3[], step: number): Vec3[] {
  if (points.length < 2) return points.slice();
  const out: Vec3[] = [points[0]];
  let left = step;
  for (let i = 1; i < points.length; i++) {
    let a = points[i - 1];
    const b = points[i];
    let d = Math.hypot(...sub(b, a));
    while (d >= left) {
      const f = left / d;
      a = [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2])];
      out.push(a);
      d -= left;
      left = step;
    }
    left -= d;
  }
  const last = points[points.length - 1];
  if (Math.hypot(...sub(last, out[out.length - 1])) > 1e-6) out.push(last);
  return out;
}

/** Each point the mean of those within `half` samples of it, fewer near the ends. */
function smoothed(points: Vec3[], half: number): Vec3[] {
  return points.map((_, i) => {
    const from = Math.max(0, i - half);
    const to = Math.min(points.length - 1, i + half);
    const m: Vec3 = [0, 0, 0];
    for (let k = from; k <= to; k++) for (let a = 0; a < 3; a++) m[a] += points[k][a];
    const n = to - from + 1;
    return [m[0] / n, m[1] / n, m[2] / n];
  });
}

/**
 * The tangents along `points`, and a rotation-minimising normal to them (each the last projected onto the plane across
 * the next tangent), starting from the part of `up` across the first tangent.
 */
export function frames(points: Vec3[], up: Vec3): { tangents: Vec3[]; ups: Vec3[] } {
  const n = points.length;
  const tangents = points.map((_, i) =>
    unit(sub(points[Math.min(n - 1, i + 1)], points[Math.max(0, i - 1)]))
  );
  const ups: Vec3[] = [];
  let u = up;
  for (let i = 0; i < n; i++) {
    const t = tangents[i];
    let across = unit(sub(u, [t[0] * dot(u, t), t[1] * dot(u, t), t[2] * dot(u, t)]));
    if (dot(across, across) < 0.5) {
      // up along the tangent: any other way across it
      const other: Vec3 = Math.abs(t[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      across = unit(sub(other, [t[0] * dot(other, t), t[1] * dot(other, t), t[2] * dot(other, t)]));
    }
    ups.push(across);
    u = across;
  }
  return { tangents, ups };
}

/**
 * The dendrites from the soma to each tip, the spiniest first (then the longest): every tip's path back to the soma,
 * its sections' points joined, resampled every PATH_STEP and smoothed. `up` starts each path's frame.
 */
export function dendritePaths(data: SpinyData, up: Vec3, count = 8): DendritePath[] {
  const { sectionPoints, pointStart, sectionParent, sectionTypes, spines } = data;
  const n = sectionParent.length;
  const hasChild = new Uint8Array(n);
  for (let s = 0; s < n; s++) if (sectionParent[s] >= 0) hasChild[sectionParent[s]] = 1;
  const spinesOn = new Float64Array(n);
  for (const s of spines.section) if (s >= 0 && s < n) spinesOn[s]++;
  const chains: { sections: number[]; spines: number }[] = [];
  for (let tip = 0; tip < n; tip++) {
    if (hasChild[tip] || sectionTypes[tip] === 1) continue;
    const chain: number[] = [];
    let total = 0;
    for (let s = tip; s >= 0 && sectionTypes[s] !== 1 && chain.length < n; s = sectionParent[s]) {
      chain.push(s);
      total += spinesOn[s];
    }
    chains.push({ sections: chain.reverse(), spines: total });
  }
  const length = (sections: number[]) => {
    let l = 0;
    for (const s of sections)
      for (let p = pointStart[s] + 1; p < pointStart[s + 1]; p++)
        l += Math.hypot(...sub(at(sectionPoints, p, 4), at(sectionPoints, p - 1, 4)));
    return l;
  };
  const ranked = chains
    .map((c) => ({ ...c, length: length(c.sections) }))
    .sort((a, b) => b.spines - a.spines || b.length - a.length)
    .slice(0, count);
  return ranked.map((c) => {
    const raw: Vec3[] = [];
    const rawRadii: number[] = [];
    for (const s of c.sections) {
      for (let p = pointStart[s]; p < pointStart[s + 1]; p++) {
        const q = at(sectionPoints, p, 4);
        const last = raw.at(-1);
        if (!last || Math.hypot(...sub(q, last)) > 1e-6) {
          raw.push(q);
          rawRadii.push(sectionPoints[4 * p + 3]);
        }
      }
    }
    const half = Math.round(SMOOTH_UM / PATH_STEP);
    const samples = resample(raw, PATH_STEP);
    const points = smoothed(samples, half);
    const f = frames(points, up);
    // each sample's radius: the nearest raw point's, walked along together, then smoothed as the points are
    const radii: number[] = [];
    let j = 0;
    for (const q of samples) {
      while (
        j + 1 < raw.length &&
        Math.hypot(...sub(raw[j + 1], q)) <= Math.hypot(...sub(raw[j], q))
      )
        j++;
      radii.push(rawRadii[j] ?? 0.5);
    }
    const smoothRadii = radii.map((_, i) => {
      const from = Math.max(0, i - half);
      const to = Math.min(radii.length - 1, i + half);
      let sum = 0;
      for (let k = from; k <= to; k++) sum += radii[k];
      return sum / (to - from + 1);
    });
    return {
      sections: c.sections,
      spines: c.spines,
      length: c.length,
      points: Float32Array.from(points.flat()),
      tangents: Float32Array.from(f.tangents.flat()),
      ups: Float32Array.from(f.ups.flat()),
      radii: Float32Array.from(smoothRadii),
    };
  });
}

/** A path's point, tangent and up `s` µm along it (clamped), between its samples. */
export function alongPath(
  path: DendritePath,
  s: number
): { point: Vec3; tangent: Vec3; up: Vec3; radius: number } {
  const n = path.points.length / 3;
  const x = Math.min(n - 1, Math.max(0, s / PATH_STEP));
  const i = Math.min(n - 2, Math.floor(x));
  const f = n < 2 ? 0 : x - i;
  const mix = (a: Float32Array): Vec3 => {
    const p = at(a, Math.max(0, i));
    const q = at(a, Math.min(n - 1, i + 1));
    return [p[0] + f * (q[0] - p[0]), p[1] + f * (q[1] - p[1]), p[2] + f * (q[2] - p[2])];
  };
  const r0 = path.radii[Math.max(0, i)] ?? 0.5;
  const r1 = path.radii[Math.min(n - 1, i + 1)] ?? r0;
  return {
    point: mix(path.points),
    tangent: unit(mix(path.tangents)),
    up: unit(mix(path.ups)),
    radius: r0 + f * (r1 - r0),
  };
}

/** The unit vector `u` of the way round from `a` to `b` on the sphere, by the shorter way; any way round if opposite. */
export function slerpDirection(a: Vec3, b: Vec3, u: number): Vec3 {
  const c = Math.min(1, Math.max(-1, dot(a, b)));
  const angle = Math.acos(c);
  if (angle < 1e-4) return b;
  let axisOff: Vec3 = sub(b, [a[0] * c, a[1] * c, a[2] * c]);
  if (Math.hypot(...axisOff) < 1e-6) {
    const other: Vec3 = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    axisOff = sub(other, [a[0] * dot(other, a), a[1] * dot(other, a), a[2] * dot(other, a)]);
  }
  const e = unit(axisOff);
  const t = angle * u;
  return unit([
    a[0] * Math.cos(t) + e[0] * Math.sin(t),
    a[1] * Math.cos(t) + e[1] * Math.sin(t),
    a[2] * Math.cos(t) + e[2] * Math.sin(t),
  ]);
}

/** `v` turned by `angle` about the unit `axis` (Rodrigues). */
export function turnAbout(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  const k = unit(axis);
  const kxv: Vec3 = [
    k[1] * v[2] - k[2] * v[1],
    k[2] * v[0] - k[0] * v[2],
    k[0] * v[1] - k[1] * v[0],
  ];
  const kv = dot(k, v);
  return [
    v[0] * c + kxv[0] * s + k[0] * kv * (1 - c),
    v[1] * c + kxv[1] * s + k[1] * kv * (1 - c),
    v[2] * c + kxv[2] * s + k[2] * kv * (1 - c),
  ];
}
