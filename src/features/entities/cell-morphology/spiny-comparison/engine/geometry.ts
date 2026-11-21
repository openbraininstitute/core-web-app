/**
 * The comparison view's geometry, worked out in its worker: a skeleton's sections as swept tubes, a spine's vertices
 * turned and moved from its own frame onto the cell, and smooth normals packed to a byte an axis. No three.js here.
 */

import type { SkeletonTubes, Vec3 } from './types';

/** The thinnest a skeleton tube is drawn, µm: a radius of 0 would leave a fibre out. */
export const TUBE_FLOOR = 0.15;

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const scaled = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
function unit(a: Vec3): Vec3 {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l > 0 ? scaled(a, 1 / l) : [0, 0, 0];
}

/** How many sides a tube of radius `r` gets: 8 for a thin fibre, up to 14 for a thick one. */
export function sidesFor(r: number): number {
  return Math.min(14, Math.max(8, Math.round(8 + 5 * r)));
}

/** A mesh as it is built: positions and float normals, a section per vertex, and triangles. */
class Builder {
  positions: number[] = [];
  normals: number[] = [];
  sections: number[] = [];
  indices: number[] = [];

  get count(): number {
    return this.sections.length;
  }

  vertex(p: Vec3, n: Vec3, section: number): void {
    this.positions.push(p[0], p[1], p[2]);
    this.normals.push(n[0], n[1], n[2]);
    this.sections.push(section);
  }
}

let unitSphere: { positions: Vec3[]; indices: number[] } | null = null;

/** A UV sphere of radius 1, 12 round and 8 high. */
function sphereTemplate(): { positions: Vec3[]; indices: number[] } {
  if (unitSphere) return unitSphere;
  const [round, high] = [12, 8];
  const positions: Vec3[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= high; j++) {
    const v = (j / high) * Math.PI;
    for (let i = 0; i <= round; i++) {
      const u = (i / round) * 2 * Math.PI;
      positions.push([-Math.cos(u) * Math.sin(v), Math.cos(v), Math.sin(u) * Math.sin(v)]);
    }
  }
  for (let j = 0; j < high; j++) {
    for (let i = 0; i < round; i++) {
      const a = j * (round + 1) + i;
      const b = a + round + 1;
      if (j !== 0) indices.push(a, b, a + 1);
      if (j !== high - 1) indices.push(a + 1, b, b + 1);
    }
  }
  unitSphere = { positions, indices };
  return unitSphere;
}

/** A sphere of radius `r` round `c`: to close a tube's joint or end. */
function sphere(b: Builder, c: Vec3, r: number, section: number): void {
  const { positions, indices } = sphereTemplate();
  const base = b.count;
  for (const n of positions)
    b.vertex([c[0] + r * n[0], c[1] + r * n[1], c[2] + r * n[2]], n, section);
  for (const i of indices) b.indices.push(base + i);
}

/**
 * A tube along `points`, of `radii`, with `sides` sides, its rings kept from twisting by a rotation-minimising frame
 * (double reflection: Wang, Jüttler, Zheng and Liu 2008). Its triangles face out. Open at both ends.
 */
function tube(b: Builder, points: Vec3[], radii: number[], sides: number, section: number): void {
  const n = points.length;
  if (n < 2) return;
  const tangents = points.map((_, i) =>
    unit(sub(points[Math.min(i + 1, n - 1)], points[Math.max(i - 1, 0)]))
  );
  const t0 = tangents[0];
  const away: Vec3 = Math.abs(t0[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  let r = unit(cross(cross(t0, away), t0));
  const frames: Vec3[] = [r];
  for (let i = 0; i < n - 1; i++) {
    const v1 = sub(points[i + 1], points[i]);
    const c1 = dot(v1, v1);
    if (c1 < 1e-12) {
      frames.push(r);
      continue;
    }
    const rL = sub(r, scaled(v1, (2 / c1) * dot(v1, r)));
    const tL = sub(tangents[i], scaled(v1, (2 / c1) * dot(v1, tangents[i])));
    const v2 = sub(tangents[i + 1], tL);
    const c2 = dot(v2, v2);
    r = unit(c2 < 1e-12 ? rL : sub(rL, scaled(v2, (2 / c2) * dot(v2, rL))));
    frames.push(r);
  }
  const base = b.count;
  for (let i = 0; i < n; i++) {
    const s = cross(tangents[i], frames[i]);
    for (let k = 0; k < sides; k++) {
      const a = (2 * Math.PI * k) / sides;
      const d: Vec3 = [
        Math.cos(a) * frames[i][0] + Math.sin(a) * s[0],
        Math.cos(a) * frames[i][1] + Math.sin(a) * s[1],
        Math.cos(a) * frames[i][2] + Math.sin(a) * s[2],
      ];
      const p = points[i];
      b.vertex(
        [p[0] + radii[i] * d[0], p[1] + radii[i] * d[1], p[2] + radii[i] * d[2]],
        d,
        section
      );
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < sides; k++) {
      const a = base + i * sides + k;
      const c = a + sides;
      const b1 = base + i * sides + ((k + 1) % sides);
      const d = b1 + sides;
      b.indices.push(a, b1, c, b1, d, c);
    }
  }
}

/** One section of a skeleton: its SWC type, its parent's index (-1 for none), and x, y, z and radius per point. */
export interface SkeletonSection {
  type: number;
  parent: number;
  points: Float64Array;
}

/** A section's length along its points, µm. */
export function sectionLength(points: Float64Array): number {
  let total = 0;
  for (let k = 4; k + 3 < points.length; k += 4) {
    total += Math.hypot(
      points[k] - points[k - 4],
      points[k + 1] - points[k - 3],
      points[k + 2] - points[k - 2]
    );
  }
  return total;
}

/**
 * Where each section starts, as a path distance from the soma, µm: 0 for those that leave the soma (or have no
 * parent), else its parent's start and length. The soma's own sections count as 0 long.
 */
export function pathDistances(sections: SkeletonSection[]): {
  start: Float64Array;
  length: Float64Array;
} {
  const length = Float64Array.from(sections, (s) => (s.type === 1 ? 0 : sectionLength(s.points)));
  const start = new Float64Array(sections.length).fill(Number.NaN);
  const startOf = (s: number): number => {
    if (!Number.isNaN(start[s])) return start[s];
    // iteratively, up to a section whose start is known: a dendrite can be hundreds of sections deep
    const chain: number[] = [];
    let at = s;
    while (at >= 0 && Number.isNaN(start[at])) {
      const p = sections[at].parent;
      if (p < 0 || p >= sections.length || sections[p].type === 1) {
        start[at] = 0;
        break;
      }
      chain.push(at);
      at = p;
    }
    for (let k = chain.length - 1; k >= 0; k--) {
      const c = chain[k];
      const p = sections[c].parent;
      start[c] = start[p] + length[p];
    }
    return start[s];
  };
  for (let s = 0; s < sections.length; s++) startOf(s);
  return { start, length };
}

/**
 * Every section but the soma as a tube of its points' radii (at least `floor`), with a sphere at each end to close the
 * joints: one sphere to a place, where sections meet. Each vertex keeps its section's index in `sections`.
 */
export function skeletonTubes(sections: SkeletonSection[], floor = TUBE_FLOOR): SkeletonTubes {
  const b = new Builder();
  const joints = new Set<string>();
  sections.forEach((section, s) => {
    if (section.type === 1) return;
    const points: Vec3[] = [];
    const radii: number[] = [];
    const p = section.points;
    for (let k = 0; k + 3 < p.length; k += 4) {
      const q: Vec3 = [p[k], p[k + 1], p[k + 2]];
      const last = points.at(-1);
      if (last && dot(sub(q, last), sub(q, last)) < 1e-12) continue;
      points.push(q);
      radii.push(Math.max(floor, p[k + 3]));
    }
    if (points.length === 0) return;
    tube(b, points, radii, sidesFor(Math.max(...radii)), s);
    for (const end of [0, points.length - 1]) {
      const key = points[end].map((v) => v.toFixed(4)).join(',');
      if (joints.has(key)) continue;
      joints.add(key);
      sphere(b, points[end], radii[end], s);
    }
  });
  const sectionIndex = Uint16Array.from(b.sections);
  return {
    positions: Float32Array.from(b.positions),
    normals: packNormals(Float32Array.from(b.normals)),
    indices: Uint32Array.from(b.indices),
    sections: sectionIndex,
    types: Uint8Array.from(sectionIndex, (s) => sections[s].type),
  };
}

/**
 * `local`'s vertices (x, y, z after one another) turned by the unit quaternion `q` (x, y, z, w, as scipy's `from_quat`
 * takes it) and moved by `t`, written into `out` from vertex `at`: a spine from its own frame onto the cell.
 */
export function placeVertices(
  local: ArrayLike<number>,
  q: readonly [number, number, number, number],
  t: Vec3,
  out: Float32Array,
  at: number
): void {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  const [x, y, z, w] = [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
  // the rotation's matrix, row by row
  const m00 = 1 - 2 * (y * y + z * z);
  const m01 = 2 * (x * y - z * w);
  const m02 = 2 * (x * z + y * w);
  const m10 = 2 * (x * y + z * w);
  const m11 = 1 - 2 * (x * x + z * z);
  const m12 = 2 * (y * z - x * w);
  const m20 = 2 * (x * z - y * w);
  const m21 = 2 * (y * z + x * w);
  const m22 = 1 - 2 * (x * x + y * y);
  for (let i = 0, o = 3 * at; i + 2 < local.length; i += 3, o += 3) {
    const [a, b, c] = [local[i], local[i + 1], local[i + 2]];
    out[o] = m00 * a + m01 * b + m02 * c + t[0];
    out[o + 1] = m10 * a + m11 * b + m12 * c + t[1];
    out[o + 2] = m20 * a + m21 * b + m22 * c + t[2];
  }
}

/**
 * Smooth normals, each vertex's triangles' normals weighted by their area, for the vertices `from` to `to` and the
 * triangles `triFrom` to `triTo` (which only use those vertices), written into `out` as bytes.
 */
export function normalsInto(
  positions: Float32Array,
  indices: Uint32Array,
  from: number,
  to: number,
  triFrom: number,
  triTo: number,
  out: Int8Array
): void {
  const n = to - from;
  const acc = new Float32Array(3 * n);
  for (let t = triFrom; t < triTo; t++) {
    const ia = indices[3 * t],
      ib = indices[3 * t + 1],
      ic = indices[3 * t + 2];
    const ax = positions[3 * ia],
      ay = positions[3 * ia + 1],
      az = positions[3 * ia + 2];
    const ux = positions[3 * ib] - ax,
      uy = positions[3 * ib + 1] - ay,
      uz = positions[3 * ib + 2] - az;
    const vx = positions[3 * ic] - ax,
      vy = positions[3 * ic + 1] - ay,
      vz = positions[3 * ic + 2] - az;
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    for (const i of [ia, ib, ic]) {
      const k = 3 * (i - from);
      acc[k] += nx;
      acc[k + 1] += ny;
      acc[k + 2] += nz;
    }
  }
  for (let i = 0; i < n; i++) {
    const k = 3 * i;
    const l = Math.hypot(acc[k], acc[k + 1], acc[k + 2]) || 1;
    out[3 * (from + i)] = Math.round((127 * acc[k]) / l);
    out[3 * (from + i) + 1] = Math.round((127 * acc[k + 1]) / l);
    out[3 * (from + i) + 2] = Math.round((127 * acc[k + 2]) / l);
  }
}

/** Unit normals as bytes, × 127. */
export function packNormals(normals: Float32Array): Int8Array {
  const out = new Int8Array(normals.length);
  for (let i = 0; i < normals.length; i++) out[i] = Math.round(127 * normals[i]);
  return out;
}
