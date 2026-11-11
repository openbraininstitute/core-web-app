/**
 * A mouse to hold the brain: drawn, not measured. Its body is lofted from the
 * nose back to the rump, each section across it a rounded box, sized to a
 * mouse of about 25 g with the atlas's brain in its head — a little under the
 * skull's top, the snout running on some 9 mm past the olfactory bulbs — and
 * it has ears, legs and a tail. A mouse's, not a rat's: its head large for its
 * body, its body short and round, its ears big and round, its eyes big, and
 * its tail thin and as long as the rest of it. It is in the atlas's own frame,
 * (AP, DV, ML) µm, so the brain sits in it just as it is.
 *
 * It comes in pieces, so that it can walk: its body, with its head and ears;
 * each leg, to swing from its shoulder or hip; and its tail, to sway from its
 * root. Its eyes and whiskers are not surfaces: they come as points, to be
 * drawn over it — as do its nerves, the way signals run between its brain and
 * the rest of it.
 */

import type { Mesh, V3 } from './data';

/** The brain's midline, ML µm. */
const MID = 5690;

/**
 * Behind its head, all of it — body, legs, spine — drawn this much shorter
 * along it than first set down below: its head large for the rest of it, as a
 * mouse's is, not a rat's.
 */
const NECK = 14000;
const SHORTER = 0.8;
const back = (ap: number) => (ap <= NECK ? ap : NECK + (ap - NECK) * SHORTER);
const shorter = (p: [number, number, number]): [number, number, number] => [back(p[0]), p[1], p[2]];

/** The body, nose first: where along it (AP), the middle of its section (DV), and the section's half height and half width; µm. */
const BODY: [number, number, number, number][] = (
  [
    [-9400, 5950, 650, 700],
    [-8500, 5800, 1750, 1900],
    [-6000, 5300, 2900, 3200],
    [-3000, 4900, 4100, 4600],
    [0, 4600, 5100, 5900],
    [3500, 4500, 5700, 7000],
    [7500, 4600, 5900, 7600],
    [11000, 4800, 6000, 7400],
    [14000, 5400, 6500, 7700],
    [18000, 6800, 8000, 9000],
    [24000, 8600, 10200, 11200],
    [33000, 9600, 11600, 12800],
    [45000, 9800, 12900, 13900],
    [57000, 9900, 12800, 13700],
    [67000, 10300, 11200, 12300],
    [75000, 11200, 8200, 9000],
    [80000, 12200, 4300, 4700],
    [82500, 12800, 1500, 1600],
  ] as [number, number, number, number][]
).map(([ap, dv, hh, hw]) => [back(ap), dv, hh, hw]);
/** How square each section is: 2 an ellipse, more a rounder box. */
const SQUARE = 2.5;

/** Its legs, each from the shoulder or hip to the toes, with the radius at each joint; µm. Left front, left hind, right front, right hind. */
export const LEGS: { path: [number, number, number][]; r: number[] }[] = [-1, 1].flatMap((side) =>
  [
    {
      path: [
        [23000, 15500, MID + side * 8200],
        [27000, 21500, MID + side * 9000],
        [24500, 25400, MID + side * 8700],
        [21000, 26600, MID + side * 8300],
      ],
      r: [2800, 1900, 1200, 850],
    },
    {
      path: [
        [65000, 13500, MID + side * 9800],
        [57500, 19500, MID + side * 11400],
        [64500, 24600, MID + side * 10600],
        [54500, 26600, MID + side * 10000],
      ],
      r: [5000, 3000, 1400, 950],
    },
  ].map((leg) => ({ ...leg, path: leg.path.map((q) => shorter(q as [number, number, number])) }))
);

/**
 * The tail: from the rump, back and down to the ground, and on along it,
 * curving off to one side — about as long as the rest of the mouse, as a
 * mouse's is — and how it thins.
 */
const ROOT = back(81500);
export const TAIL: [number, number, number][] = [
  [ROOT, 12800, MID],
  [ROOT + 10500, 16800, MID + 1200],
  [ROOT + 21000, 22500, MID + 3500],
  [ROOT + 31500, 25700, MID + 7500],
  [ROOT + 42000, 26300, MID + 13000],
  [ROOT + 51500, 26400, MID + 20000],
  [ROOT + 60000, 26400, MID + 28000],
];
const TAIL_R = [1150, 380];

/** The ears: where each is, which way it faces, and its half height, half width and half thickness; µm. */
const EARS = [-1, 1].map((side) => ({
  centre: [10500, -6100, MID + side * 6700] as V3,
  facing: [-0.7, -0.2, side * 0.7] as V3,
  radii: [6800, 6500, 600] as V3,
}));

/** Where its eyes are, and how big; and where its whiskers spring from and reach to. */
export const EYES: { at: V3; r: number }[] = [-1, 1].map((side) => ({
  at: [-1800, 4100, MID + side * 4900],
  r: 1750,
}));
export const WHISKERS: [V3, V3][] = [-1, 1].flatMap((side) =>
  Array.from({ length: 6 }, (_, k): [V3, V3] => {
    const from: V3 = [-7600, 5900 + 120 * k, MID + side * 1600];
    const sweep = -0.75 + 0.3 * k;
    const len = 15000 + 1500 * Math.sin(k * 1.7);
    return [
      from,
      [
        from[0] + Math.sin(sweep) * len,
        from[1] + (k - 2.5) * 900,
        from[2] + side * Math.cos(sweep) * len,
      ],
    ];
  })
);
/** The floor it stands on, DV µm. */
export const GROUND = 26900;
/**
 * The way down its spinal cord, from the brainstem behind the brain to the
 * root of its tail — where the nerves to its legs leave it at the shoulders
 * and hips — and the way in from its whiskers to the brainstem; µm.
 */
export const SPINE: V3[] = (
  [
    [12500, 6600, MID],
    [17000, 7600, MID],
    [24000, 8000, MID],
    [40000, 7400, MID],
    [56000, 7600, MID],
    [66000, 8600, MID],
    [78000, 11400, MID],
  ] as [number, number, number][]
).map(shorter);
export const WHISKER_NERVE: V3[] = [
  [-7200, 6200, MID],
  [-2000, 6800, MID],
  [6000, 7600, MID],
  [12500, 6600, MID],
];

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: V3): V3 => scale(a, 1 / (Math.hypot(a[0], a[1], a[2]) || 1));

/** Catmull–Rom through `pts`, `per` samples to each span. */
function through<T extends number[]>(pts: T[], per: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b, c, d] = [
      pts[Math.max(0, i - 1)],
      pts[i],
      pts[i + 1],
      pts[Math.min(pts.length - 1, i + 2)],
    ];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(
        b.map(
          (_, j) =>
            0.5 *
            (2 * b[j] +
              (c[j] - a[j]) * t +
              (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t2 +
              (3 * b[j] - a[j] - 3 * c[j] + d[j]) * t3)
        ) as T
      );
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** A surface being built: its points, and its triangles — each with a point inside the part it bounds, to face it away from. */
class Build {
  v: number[] = [];
  f: number[] = [];
  point(p: V3) {
    this.v.push(p[0], p[1], p[2]);
    return this.v.length / 3 - 1;
  }
  at(i: number): V3 {
    return [this.v[i * 3], this.v[i * 3 + 1], this.v[i * 3 + 2]];
  }
  face(a: number, b: number, c: number, inside: V3) {
    const [p, q, r] = [this.at(a), this.at(b), this.at(c)];
    const n = cross(sub(q, p), sub(r, p));
    const mid = scale(add(add(p, q), r), 1 / 3);
    if (dot(n, sub(mid, inside)) >= 0) this.f.push(a, b, c);
    else this.f.push(a, c, b);
  }
  /** Rings of points, each round its own middle, stitched one to the next; and the ends closed. */
  rings(rings: number[][], middles: V3[]) {
    const n = rings[0].length;
    for (let k = 0; k < rings.length - 1; k++) {
      const inside = scale(add(middles[k], middles[k + 1]), 0.5);
      for (let j = 0; j < n; j++) {
        const [a, b] = [rings[k][j], rings[k][(j + 1) % n]];
        const [c, d] = [rings[k + 1][j], rings[k + 1][(j + 1) % n]];
        this.face(a, b, d, inside);
        this.face(a, d, c, inside);
      }
    }
    for (const [ring, middle, ahead] of [
      [rings[0], middles[0], middles[1]],
      [rings[rings.length - 1], middles[middles.length - 1], middles[middles.length - 2]],
    ] as const) {
      const tip = this.point(middle);
      const inside = scale(add(middle, ahead), 0.5);
      for (let j = 0; j < n; j++) this.face(tip, ring[j], ring[(j + 1) % n], inside);
    }
  }
}

/** A tube along a smoothed path, its radius going from joint to joint as `r` says. */
function tube(b: Build, path: V3[], r: number[], around: number, per: number) {
  const spine = through(
    path.map((p, i) => [...p, r[Math.min(i, r.length - 1)]]),
    per
  ).map((q) => ({ p: [q[0], q[1], q[2]] as V3, r: q[3] }));
  let normal: V3 = [0, -1, 0];
  const rings: number[][] = [];
  spine.forEach(({ p, r: radius }, i) => {
    const ahead = spine[Math.min(spine.length - 1, i + 1)].p;
    const behind = spine[Math.max(0, i - 1)].p;
    const along = unit(sub(ahead, behind));
    // carried along the path, turning only as much as the path does
    normal = unit(sub(normal, scale(along, dot(normal, along))));
    if (!Number.isFinite(normal[0]) || Math.hypot(...normal) < 0.5)
      normal = unit(cross(along, [1, 0, 0]));
    const side = cross(along, normal);
    rings.push(
      Array.from({ length: around }, (_, j) => {
        const a = (j / around) * Math.PI * 2;
        return b.point(
          add(p, add(scale(normal, Math.cos(a) * radius), scale(side, Math.sin(a) * radius)))
        );
      })
    );
  });
  b.rings(
    rings,
    spine.map((q) => q.p)
  );
}

/** An ellipsoid round `centre` along the three axes given — each scaled to its half length. */
function ellipsoid(b: Build, centre: V3, axes: [V3, V3, V3], lat: number, lon: number) {
  const top = b.point(add(centre, axes[0]));
  const bottom = b.point(sub(centre, axes[0]));
  const rows: number[][] = [];
  for (let i = 1; i < lat; i++) {
    const t = (i / lat) * Math.PI;
    rows.push(
      Array.from({ length: lon }, (_, j) => {
        const a = (j / lon) * Math.PI * 2;
        return b.point(
          add(
            centre,
            add(
              scale(axes[0], Math.cos(t)),
              add(
                scale(axes[1], Math.sin(t) * Math.cos(a)),
                scale(axes[2], Math.sin(t) * Math.sin(a))
              )
            )
          )
        );
      })
    );
  }
  for (let j = 0; j < lon; j++) {
    const k = (j + 1) % lon;
    b.face(top, rows[0][j], rows[0][k], centre);
    b.face(bottom, rows[rows.length - 1][k], rows[rows.length - 1][j], centre);
    for (let i = 0; i < rows.length - 1; i++) {
      b.face(rows[i][j], rows[i][k], rows[i + 1][k], centre);
      b.face(rows[i][j], rows[i + 1][k], rows[i + 1][j], centre);
    }
  }
}

/** The mouse in pieces: its body, with its head and ears; each leg, with the joint it swings from; and its tail, with its root. */
interface MouseParts {
  body: Mesh;
  legs: { mesh: Mesh; joint: V3 }[];
  tail: { mesh: Mesh; root: V3 };
}

const meshOf = (b: Build): Mesh => ({ v: Float32Array.from(b.v), f: Uint32Array.from(b.f) });

let parts: MouseParts | null = null;

/** The mouse's surfaces, piece by piece: made once, and kept. */
export function mouseParts(): MouseParts {
  if (parts) return parts;
  const body = new Build();
  // the body: sections across it, round each a point on the curve from nose to rump
  const sections = through(BODY, 6);
  const around = 40;
  const rings: number[][] = [];
  const middles: V3[] = [];
  for (const [ap, dv, hh, hw] of sections) {
    middles.push([ap, dv, MID]);
    rings.push(
      Array.from({ length: around }, (_, j) => {
        const a = (j / around) * Math.PI * 2;
        const [c, s] = [Math.cos(a), Math.sin(a)];
        const across = Math.sign(c) * Math.abs(c) ** (2 / SQUARE);
        const down = Math.sign(s) * Math.abs(s) ** (2 / SQUARE);
        return body.point([ap, dv + hh * down, MID + hw * across]);
      })
    );
  }
  body.rings(rings, middles);
  for (const ear of EARS) {
    const n = unit(ear.facing);
    const up = unit(sub([0, -1, 0], scale(n, dot([0, -1, 0], n))));
    const across = cross(n, up);
    ellipsoid(
      body,
      ear.centre,
      [scale(up, ear.radii[0]), scale(across, ear.radii[1]), scale(n, ear.radii[2])],
      10,
      18
    );
  }
  const legs = LEGS.map((leg) => {
    const b = new Build();
    tube(b, leg.path, leg.r, 12, 6);
    return { mesh: meshOf(b), joint: leg.path[0] as V3 };
  });
  const tail = new Build();
  tube(
    tail,
    TAIL,
    TAIL.map((_, i) => TAIL_R[0] + ((TAIL_R[1] - TAIL_R[0]) * i) / (TAIL.length - 1)),
    10,
    10
  );
  parts = { body: meshOf(body), legs, tail: { mesh: meshOf(tail), root: TAIL[0] } };
  return parts;
}

let whole: Mesh | null = null;

/** The mouse's surface all in one, standing still: for the room it takes, and its shadow. */
export function mouseMesh(): Mesh {
  if (whole) return whole;
  const { body, legs, tail } = mouseParts();
  const all = [body, ...legs.map((l) => l.mesh), tail.mesh];
  const v = new Float32Array(all.reduce((n, m) => n + m.v.length, 0));
  const f = new Uint32Array(all.reduce((n, m) => n + m.f.length, 0));
  let [vi, fi] = [0, 0];
  for (const m of all) {
    v.set(m.v, vi);
    for (let k = 0; k < m.f.length; k++) f[fi + k] = m.f[k] + vi / 3;
    vi += m.v.length;
    fi += m.f.length;
  }
  whole = { v, f };
  return whole;
}
