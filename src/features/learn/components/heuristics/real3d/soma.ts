/**
 * A soma as a mesh, rather than a dot: a sphere that swells smoothly out into
 * each branch leaving it, so the cell body flows into its dendrites and axon
 * instead of sitting on them like a bead.
 *
 * The surface is that of a smooth union of the sphere with a tapering cone
 * along each branch, found by casting a ray out from the centre through each
 * vertex of a subdivided icosahedron. Every cone contains the centre, so each
 * ray crosses the surface once.
 *
 * Branches are drawn thicker than life when the view is far out, so the soma
 * is built at a few exaggerations, with each one's branches meeting it at
 * their own drawn thickness; in between, the radii are blended.
 */

import type { Neuron, V3 } from './data';

export interface SomaMesh {
  /** The vertices' directions from the centre, unit, flat; and the triangles, wound to face out. */
  dirs: Float32Array;
  faces: Uint16Array;
  /** The exaggerations it was built at, and at each, how far the surface is from the centre along each direction, µm. */
  levels: number[];
  radii: Float32Array[];
}

const LEVELS = [1, 1.4, 1.9, 2.5, 3.2];

function icosphere(times: number) {
  const t = (1 + Math.sqrt(5)) / 2;
  const verts: V3[] = [];
  const push = (p: V3) => {
    const l = Math.hypot(p[0], p[1], p[2]);
    verts.push([p[0] / l, p[1] / l, p[2] / l]);
    return verts.length - 1;
  };
  for (const p of [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ] as V3[])
    push(p);
  let faces: [number, number, number][] = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  for (let k = 0; k < times; k++) {
    const middles = new Map<string, number>();
    const middle = (a: number, b: number) => {
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      let i = middles.get(key);
      if (i === undefined) {
        i = push([
          (verts[a][0] + verts[b][0]) / 2,
          (verts[a][1] + verts[b][1]) / 2,
          (verts[a][2] + verts[b][2]) / 2,
        ]);
        middles.set(key, i);
      }
      return i;
    };
    faces = faces.flatMap(([a, b, c]): [number, number, number][] => {
      const ab = middle(a, b);
      const bc = middle(b, c);
      const ca = middle(c, a);
      return [
        [a, ab, ca],
        [b, bc, ab],
        [c, ca, bc],
        [ab, bc, ca],
      ];
    });
  }
  // wind every triangle to face out
  const flat = new Uint16Array(faces.length * 3);
  faces.forEach(([a, b, c], i) => {
    const [p, q, r] = [verts[a], verts[b], verts[c]];
    const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    const v = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const out =
      n[0] * (p[0] + q[0] + r[0]) + n[1] * (p[1] + q[1] + r[1]) + n[2] * (p[2] + q[2] + r[2]) > 0;
    flat.set(out ? [a, b, c] : [a, c, b], i * 3);
  });
  return { dirs: Float32Array.from(verts.flat()), faces: flat };
}

/**
 * Each branch leaving the soma: which way it heads, measured to where it is
 * `reach` µm out (following, at each fork, the side carrying more), and how
 * thick it is there.
 */
function branches(
  n: Neuron,
  diam: Float32Array,
  kids: number[][],
  weight: Float32Array,
  reach: number
) {
  const out: { u: V3; len: number; r: number }[] = [];
  for (const first of kids[0]) {
    let i = first;
    while (Math.hypot(n.x[i], n.y[i], n.z[i]) < reach && kids[i].length) {
      i = kids[i].reduce((a, b) => (weight[b] > weight[a] ? b : a));
    }
    const len = Math.hypot(n.x[i], n.y[i], n.z[i]);
    if (len > 0.5) out.push({ u: [n.x[i] / len, n.y[i] / len, n.z[i] / len], len, r: diam[i] / 2 });
  }
  return out;
}

/**
 * The soma of `n`, radius `radius` µm, with branches of diameter `diam` (µm,
 * per node) leaving it; `kids` and `weight` (how much of the tree hangs off
 * each node) pick the way along each branch.
 */
export function buildSoma(
  n: Neuron,
  diam: Float32Array,
  kids: number[][],
  weight: Float32Array,
  radius: number
): SomaMesh {
  const { dirs, faces } = icosphere(3);
  const count = dirs.length / 3;
  const radii = LEVELS.map((x) => {
    const r0 = radius * x;
    const cones = branches(n, diam, kids, weight, r0 * 1.9).map((b) => {
      const end = Math.max(0.35, b.r * x);
      return {
        u: b.u,
        len: Math.min(b.len, r0 + Math.min(r0, 4 * end)),
        from: Math.max(end, 0.55 * r0),
        to: end,
      };
    });
    const k = 0.45 * r0;
    const field = (px: number, py: number, pz: number) => {
      let f = Math.hypot(px, py, pz) - r0;
      for (const c of cones) {
        const h = Math.max(0, Math.min(1, (px * c.u[0] + py * c.u[1] + pz * c.u[2]) / c.len));
        const g =
          Math.hypot(px - c.u[0] * h * c.len, py - c.u[1] * h * c.len, pz - c.u[2] * h * c.len) -
          (c.from + (c.to - c.from) * h);
        // a smooth minimum, so each cone flares into the sphere
        const m = Math.max(k - Math.abs(f - g), 0) / k;
        f = Math.min(f, g) - m * m * k * 0.25;
      }
      return f;
    };
    let far = r0 * 2;
    for (const c of cones) far = Math.max(far, c.len + c.to + r0);
    const out = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const [dx, dy, dz] = [dirs[i * 3], dirs[i * 3 + 1], dirs[i * 3 + 2]];
      let lo = 0;
      let hi = far;
      for (let step = 0; step < 24; step++) {
        const mid = (lo + hi) / 2;
        if (field(dx * mid, dy * mid, dz * mid) < 0) lo = mid;
        else hi = mid;
      }
      out[i] = (lo + hi) / 2;
    }
    return out;
  });
  return { dirs, faces, levels: LEVELS, radii };
}

/** The surface's distance from the centre along each direction, at exaggeration `x`. */
export function radiiAt(m: SomaMesh, x: number, out: Float32Array) {
  const { levels, radii } = m;
  let i = 0;
  while (i < levels.length - 2 && x > levels[i + 1]) i++;
  const k = Math.max(0, Math.min(1, (x - levels[i]) / (levels[i + 1] - levels[i])));
  const a = radii[i];
  const b = radii[i + 1];
  for (let j = 0; j < a.length; j++) out[j] = a[j] + (b[j] - a[j]) * k;
  return out;
}
