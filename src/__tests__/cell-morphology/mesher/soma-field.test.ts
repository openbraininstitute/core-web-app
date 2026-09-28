// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';

import {
  FieldSampler,
  somaRounding,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/field';
import {
  buildHybrid,
  type HybridParams,
  planHybrid,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/hybrid';
import {
  accumulateField,
  B,
  BS,
  buildMesh,
  collectPrimitives,
  layoutOptions,
  type Prim,
  planPrimitives,
  type SlabJob,
  simplifierReady,
  somaNecks,
  tangentNeck,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher';
import {
  prepareMorphology,
  simplifySection,
  untangleReport,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/prepare';
import {
  type Closest,
  closestOnSegment,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/segments';
import {
  BASE_RADIUS_FRACTION,
  SOMA_MIN_RADIUS,
  STEM_FAR_DISTANCE,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/soma';
import {
  type Morphology,
  parseSwc,
  SWC_AXON,
  SWC_BASAL,
  SWC_SOMA,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';

import { cell, expectWatertight, radialStats, params as testParams } from './mesh-utils';

const params = (over: Partial<HybridParams> = {}): HybridParams =>
  testParams({ blend: 0.1, simplifyMesh: 0.125, ...over });

/** Stems at 8, 12 and 30 µm: all valid, the last one far. */
const NECKED = cell([
  { d: 8, r: 2 },
  { d: 12, r: 1.5 },
  { d: 30, r: 1, type: SWC_AXON },
]);
/** The same stems within 5 µm of the centre: none valid, so the traced sphere stands and they are cut 7.5 µm out. */
const PLAIN = cell([
  { d: 2, r: 2 },
  { d: 3, r: 1.5 },
  { d: 4, r: 1 },
]);

beforeAll(() => simplifierReady);

/** The one slab job of m's primitives as prepared. */
function jobOf(m: Morphology, p: HybridParams): SlabJob {
  const prims = collectPrimitives(prepareMorphology(m, p), p);
  return planPrimitives(prims, { voxel: p.voxel, simplifyMesh: 0, project: true }, [0, 0, 0], {
    maxSlabs: 1,
  }).jobs[0];
}

function fieldOf(m: Morphology, p: HybridParams): FieldSampler {
  return new FieldSampler(jobOf(m, p));
}

/** sin α and cos α of the cone tangent to spheres of radii R and r whose centres are d apart: its half-angle. */
function halfAngle(R: number, r: number, d: number): [number, number] {
  const sin = (R - r) / d;
  return [sin, Math.sqrt(1 - sin * sin)];
}

/** Angle between two vectors, degrees. */
function angle(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return (
    (Math.acos(
      Math.max(-1, Math.min(1, dot / (Math.hypot(a[0], a[1], a[2]) * Math.hypot(b[0], b[1], b[2]))))
    ) *
      180) /
    Math.PI
  );
}

/** The soma primitive: the one of the soma's type. */
function somaPrim(prims: Prim[]): Prim {
  const soma = prims.filter((P) => P.type === SWC_SOMA);
  expect(soma).toHaveLength(1);
  return soma[0];
}

/** The point where the ray from the centre along dir leaves the surface, between lo and hi µm out (one crossing between). */
function surfaceAlong(
  f: FieldSampler,
  dir: number[],
  from: number,
  to: number
): [number, number, number] {
  let lo = from;
  let hi = to;
  for (let i = 0; i < 60; i++) {
    const t = 0.5 * (lo + hi);
    f.sample(dir[0] * t, dir[1] * t, dir[2] * t);
    if (f.value > 1) lo = t;
    else hi = t;
  }
  const t = 0.5 * (lo + hi);
  return [dir[0] * t, dir[1] * t, dir[2] * t];
}

/** The least normalised distance of a point from the soma's parts: where the plain union of sphere and necks is. */
function unionU(soma: Prim, h: number, q: number[]): number {
  const s = soma.segs,
    near: Closest = { d: 0, s: 0, t: 0 };
  let best = Infinity;
  for (let o = 0; o < s.length; o += 8) {
    closestOnSegment(q[0], q[1], q[2], s, o, s, o + 4, near);
    const r = s[o + 3] + (s[o + 7] - s[o + 3]) * near.s;
    best = Math.min(best, (near.d - r) / Math.max(soma.beta * r, h));
  }
  return best;
}

/**
 * Walk over the surface through the rays from the centre along dirs: the most the field's normal and the shading
 * normal turn from one point to the next, the whole turn of the field's, the most the shading is off the field's, and
 * how far out of the plain union of the soma's parts the surface stands, least and most, in normalised distance.
 */
function walk(f: FieldSampler, soma: Prim, h: number, dirs: number[][], lo: number, hi: number) {
  const out = {
    fieldStep: 0,
    shadeStep: 0,
    turn: 0,
    shadeOff: 0,
    outMin: Infinity,
    outMax: -Infinity,
  };
  let field: number[] | null = null,
    shade: number[] | null = null;
  for (const dir of dirs) {
    const q = surfaceAlong(f, dir, lo, hi);
    f.sample(q[0], q[1], q[2]);
    const n = [-f.gx, -f.gy, -f.gz];
    expect(f.shade(q[0], q[1], q[2])).toBe(true);
    const s = [f.nx, f.ny, f.nz];
    if (field && shade) {
      out.fieldStep = Math.max(out.fieldStep, angle(field, n));
      out.shadeStep = Math.max(out.shadeStep, angle(shade, s));
      out.turn += angle(field, n);
    }
    out.shadeOff = Math.max(out.shadeOff, angle(n, s));
    const u = unionU(soma, h, q);
    out.outMin = Math.min(out.outMin, u);
    out.outMax = Math.max(out.outMax, u);
    field = n;
    shade = s;
  }
  return out;
}

describe('the soma emanated to its stems', () => {
  const m = parseSwc(NECKED);
  const base = BASE_RADIUS_FRACTION * 8;
  /** The far neck's radius at its target, 25 µm out: on the line from the base radius at the centre to the axon's 1 at 30. */
  const farRadius = base + (1 - base) * (STEM_FAR_DISTANCE / 30);

  it('is one primitive: the base sphere and a neck to every valid arbor, whose section starts at the target', () => {
    const p = params();
    const prims = collectPrimitives(m, p);
    const soma = somaPrim(prims);
    expect(soma.beta).toBe(p.somaBlend);
    // The sphere, then the necks in section order: each between the circles where the cone tangent to the base sphere
    // and to the target's sphere touches them, R sin α and r sin α beyond the two centres, of radii R cos α and r cos α.
    const neck = (axis: number, d: number, r: number): number[] => {
      const [sin, cos] = halfAngle(base, r, d);
      const at = (x: number): number[] => [0, 1, 2].map((c) => (c === axis ? x : 0));
      return [...at(base * sin), base * cos, ...at(d + r * sin), r * cos];
    };
    const expected = [
      0,
      0,
      0,
      base,
      0,
      0,
      0,
      base,
      ...neck(0, 8, 2),
      ...neck(1, 12, 1.5),
      ...neck(2, STEM_FAR_DISTANCE, farRadius),
    ];
    expect(soma.segs).toHaveLength(expected.length);
    soma.segs.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 12));
    // The near arbors' sections begin at their first sample; the far one's at the added sample, and comes down to its first.
    const sections = prims.filter((P) => P.type !== SWC_SOMA);
    expect(sections.map((P) => Array.from(P.segs.subarray(0, 8)))).toEqual([
      [8, 0, 0, 2, 28, 0, 0, 2],
      [0, 12, 0, 1.5, 0, 32, 0, 1.5],
      [0, 0, STEM_FAR_DISTANCE, farRadius, 0, 0, 30, 1],
    ]);
    expect(sections.map((P) => P.segs.length / 8)).toEqual([1, 1, 2]);
    expect([...somaNecks(m, null).keys()]).toEqual([0, 1, 2]);
  });

  it('meshes as one closed surface, in the voxel and in the hybrid mesher', () => {
    for (const mesh of [buildMesh(m, params()), buildHybrid(m, params())]) {
      expectWatertight(mesh);
      expect(mesh.stats.soma).toEqual({ radius: base, necks: 3 });
    }
  });

  it("has the neck's surface where the cone is, and the far neck reaching 25 µm, not the sample at 30", () => {
    const p = params();
    const f = fieldOf(m, p);
    // Along the far neck, at 20 µm: the tangent cone's radius there, (R − z sin α) / cos α, with nothing else within reach.
    const [sin, cos] = halfAngle(base, farRadius, STEM_FAR_DISTANCE);
    const rNeck = (base - 20 * sin) / cos;
    f.sample(rNeck, 0, 20);
    expect(f.value).toBeCloseTo(1, 6);
    f.sample(rNeck + p.voxel, 0, 20);
    expect(f.value).toBeLessThan(1);
    // Beyond its first sample the axon is its own tube, of radius 1, where the neck's cone would be far wider.
    f.sample(1, 0, 40);
    expect(f.value).toBeCloseTo(1, 6);
    f.sample(2, 0, 40);
    expect(f.value).toBeLessThan(1);
    // At a target, the neck's cap and the section's start blend: on the surface or a little inside, a band farther out.
    for (const [x, y, z, r] of [
      [8, 0, 0, 2],
      [0, 12, 0, 1.5],
    ]) {
      f.sample(x, y, z + r);
      expect(f.value).toBeGreaterThanOrEqual(1);
      f.sample(x, y, z + r + 2 * p.somaBlend * r + p.voxel);
      expect(f.value).toBeLessThan(1);
    }
    // The mesh has the neck too: around z = 20 the raw surface's vertices stand off the axis by the cone's radius, not the axon's.
    const mesh = buildMesh(m, params({ simplifyMesh: 0 }));
    const ring: number[] = [];
    for (let v = 0; v < mesh.positions.length; v += 3) {
      if (Math.abs(mesh.positions[v + 2] - 20) < 0.3)
        ring.push(mesh.positions[v], mesh.positions[v + 1], mesh.positions[v + 2]);
    }
    expect(ring.length).toBeGreaterThan(30);
    const radial = radialStats(Float32Array.from(ring), [0, 0, 1], [0, 0, 0]);
    expect(radial.min).toBeGreaterThan(rNeck - 0.5);
    expect(radial.max).toBeLessThan(rNeck + 0.5);
  });

  /** The necks of `NECKED`: axis, distance and radius of the target. */
  const NECKS: [number, number, number][] = [
    [0, 8, 2],
    [1, 12, 1.5],
    [2, STEM_FAR_DISTANCE, farRadius],
  ];
  /**
   * A neck's half-angle, the point at radius rho off its axis and z along it on the side away from the other necks,
   * and the angle from the axis, seen from the centre, of the points a tenth of a micron before the circle where the
   * neck leaves the sphere, on the sphere.
   */
  const probe = (axis: number, d: number, r: number) => {
    const [sin, cos] = halfAngle(base, r, d);
    const point = (rho: number, z: number): [number, number, number] => {
      const q: [number, number, number] = [0, 0, 0];
      q[axis] = z;
      q[(axis + 1) % 3] = -rho;
      return q;
    };
    return { sin, cos, point, back: Math.asin(sin) - 0.1 / base };
  };

  it('leaves the sphere in a round that stands out of the plain union by little, and shades the neck as the cone it is', () => {
    const p = params();
    const soma = somaPrim(collectPrimitives(prepareMorphology(m, p), p));
    const f = fieldOf(m, p);
    const k = somaRounding(p.somaBlend);
    for (const [axis, d, r] of NECKS) {
      const { sin, point } = probe(axis, d, r);
      // Rays in the plane of the neck's axis, away from the other necks, from 20° on the cone's side of the circle
      // where it touches the sphere to 20° on the sphere's.
      const circle = Math.PI / 2 - Math.asin(sin);
      const dirs = Array.from({ length: 201 }, (_, i) => {
        const phi = circle - 0.35 + (0.7 * i) / 200;
        return point(Math.sin(phi), Math.cos(phi));
      });
      const w = walk(f, soma, p.voxel, dirs, 0.5 * base, 3 * base);
      // Sphere and neck are tangent there, and the smooth minimum of the two swells the surface by a quarter of its
      // width; where a third part is near, by up to twice that. It never takes anything away.
      expect(w.outMin).toBeGreaterThan(-1e-9);
      expect(w.outMax).toBeGreaterThan(0.2 * k);
      expect(w.outMax).toBeLessThan(0.5 * k);
      // The shading turns through the round without a step. (The field kinks a little behind the circle, where the
      // neck's own cone meets its end sphere and the fold takes a share of that in; past its end the neck is shaded as
      // the sphere it is tangent to there, so that the shading does not.)
      expect(w.shadeStep).toBeLessThan(2);
    }
    // Halfway along the far neck nothing else is within reach: the surface is the cone, and so is its shading normal.
    const [axis, d, r] = NECKS[2];
    const { sin, cos, point } = probe(axis, d, r);
    const z = 0.5 * (base * sin + d + r * sin);
    const q = point((base - z * sin) / cos, z);
    f.sample(q[0], q[1], q[2]);
    expect(f.value).toBeCloseTo(1, 6);
    expect(f.shade(q[0], q[1], q[2])).toBe(true);
    expect(angle([f.nx, f.ny, f.nz], point(cos, sin))).toBeLessThan(1e-6);
  });

  /** Two stems 37° apart, whose necks cross. */
  const CROSSING = cell([
    { d: 8, r: 2 },
    { d: 9, r: 1.5, dir: [0.8, 0.6, 0] },
  ]);

  it('rounds the crease where two necks cross, and shades it as the surface turns', () => {
    const two = parseSwc(CROSSING);
    const between = [0.9, 0.3, 0].map((c) => c / Math.hypot(0.9, 0.3)),
      side = [between[1], -between[0], 0];
    for (const somaBlend of [0.3, 1]) {
      const p = params({ somaBlend });
      const soma = somaPrim(collectPrimitives(prepareMorphology(two, p), p));
      const f = fieldOf(two, p);
      const k = somaRounding(somaBlend);
      // Rays swept sideways across the crease, from one neck's side to the other's, at three heights above the plane
      // of the two axes.
      for (const up of [0.35, 0.5, 0.7]) {
        const dirs = Array.from({ length: 201 }, (_, i) => {
          const g = -0.5 + i / 200;
          const v = [
            Math.cos(up) * between[0] + g * side[0],
            Math.cos(up) * between[1] + g * side[1],
            Math.sin(up),
          ];
          return v.map((c) => c / Math.hypot(v[0], v[1], v[2]));
        });
        const w = walk(f, soma, p.voxel, dirs, 0.5 * base, 3 * base);
        // The surface bends by tens of degrees there, and nowhere at once, the shading with it. The plain union's normal
        // jumps by up to 40° from one ray to the next, and its shading within a hand-over's width, which is less than a
        // simplified mesh's triangles are wide.
        expect(w.turn).toBeGreaterThan(40);
        expect(w.fieldStep).toBeLessThan(1);
        expect(w.shadeStep).toBeLessThan(1);
        expect(w.shadeOff).toBeLessThan(2);
        expect(w.outMin).toBeGreaterThan(-1e-9);
        expect(w.outMax).toBeLessThan(0.5 * k);
      }
    }
  });

  it('has no step where the band of a part it folds in ends', () => {
    // Random points on the surface, and one a hundredth of a micron from each: the field changes by no more than its
    // gradient allows. At a blend of 0.2 the rounding reaches as far as a band does, and a part that the fold lost at
    // once where its band ends left steps of 0.02 to 0.06 in the field there, around the surface.
    const two = parseSwc(CROSSING);
    const f = fieldOf(two, params({ somaBlend: 0.2 }));
    let seed = 7,
      steps = 0,
      pairs = 0;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    while (pairs < 40000) {
      const z = 2 * random() - 1,
        a = 2 * Math.PI * random(),
        sxy = Math.sqrt(1 - z * z);
      const dir = [sxy * Math.cos(a), sxy * Math.sin(a), z];
      if (dir[0] < 0) continue; // the side of the soma where the necks are
      const q = surfaceAlong(f, dir, 0.5 * base, 3 * base);
      f.sample(q[0], q[1], q[2]);
      if (Math.abs(f.value - 1) > 1e-6) continue;
      const g = Math.hypot(f.gx, f.gy, f.gz),
        step = [random() - 0.5, random() - 0.5, random() - 0.5],
        l = Math.hypot(step[0], step[1], step[2]);
      f.sample(
        q[0] + (0.01 * step[0]) / l,
        q[1] + (0.01 * step[1]) / l,
        q[2] + (0.01 * step[2]) / l
      );
      if (Math.abs(f.value - 1) > 3 * g * 0.01) steps++;
      pairs++;
    }
    expect(steps).toBe(0);
  });

  it("folds the soma's parts on the grid as the sampler does, and has the gradient of what it returns", () => {
    const two = parseSwc(CROSSING);
    const p = params({ somaBlend: 0.3 });
    const job = jobOf(two, p);
    const f = new FieldSampler(job);
    const g = job.grid,
      h = p.voxel;
    let compared = 0,
      worst = 0;
    for (const blk of accumulateField(job).blocks.values()) {
      for (let k = 0; k < BS; k += 2) {
        for (let j = 0; j < BS; j += 2) {
          for (let i = 0; i < BS; i += 2) {
            const acc = blk.acc[(k * BS + j) * BS + i];
            if (!(acc > 0.5 && acc < 1.5)) continue;
            f.sample(
              g.ox + (blk.bx * B + i) * h,
              g.oy + (blk.by * B + j) * h,
              g.oz + (blk.bz * B + k) * h
            );
            worst = Math.max(worst, Math.abs(f.value - acc));
            compared++;
          }
        }
      }
    }
    expect(compared).toBeGreaterThan(10000);
    // The grid holds float32, and folds in it.
    expect(worst).toBeLessThan(1e-5);
    // Off the surface across the crease, where the kernel has no kink, the gradient is the field's. The gradient leaves
    // out how the blend scale changes along a tapering segment, and a fold stands off its parts, where that is not
    // small; so the necks here are as thick as the base sphere, cylinders, and what is left is the fold's own slopes.
    const cylinders = parseSwc(
      cell([
        { d: 8, r: base },
        { d: 9, r: base, dir: [0.8, 0.6, 0] },
      ])
    );
    const c = fieldOf(cylinders, p);
    const at = (x: number, y: number, z: number): number => {
      c.sample(x, y, z);
      return c.value;
    };
    const between = [0.9, 0.3, 0].map((v) => v / Math.hypot(0.9, 0.3)),
      side = [between[1], -between[0], 0],
      e = 1e-5;
    let off = 0;
    for (let i = 0; i <= 20; i++) {
      const v = [
        0.88 * between[0] + (-0.5 + i / 20) * side[0],
        0.88 * between[1] + (-0.5 + i / 20) * side[1],
        0.48,
      ];
      const q = surfaceAlong(
        c,
        v.map((x) => x / Math.hypot(v[0], v[1], v[2])),
        0.5 * base,
        3 * base
      );
      c.sample(q[0], q[1], q[2]);
      const n = Math.hypot(c.gx, c.gy, c.gz);
      const [x, y, z] = [
        q[0] - (0.3 * h * c.gx) / n,
        q[1] - (0.3 * h * c.gy) / n,
        q[2] - (0.3 * h * c.gz) / n,
      ];
      const numeric = [
        (at(x + e, y, z) - at(x - e, y, z)) / (2 * e),
        (at(x, y + e, z) - at(x, y - e, z)) / (2 * e),
        (at(x, y, z + e) - at(x, y, z - e)) / (2 * e),
      ];
      c.sample(x, y, z);
      off = Math.max(
        off,
        Math.hypot(c.gx - numeric[0], c.gy - numeric[1], c.gz - numeric[2]) /
          Math.hypot(c.gx, c.gy, c.gz)
      );
    }
    expect(off).toBeLessThan(1e-4);
  });

  it('shades across the circle where each neck leaves the sphere as the surface turns there', () => {
    const f = fieldOf(m, params());
    for (const [axis, d, r] of NECKS) {
      const { sin, cos, point, back } = probe(axis, d, r);
      // Behind the circle, the neck's end sphere lies inside the base sphere: the base sphere answers for the neck
      // there, not that end sphere, whose normal is off by the neck's half-angle.
      const turn = (
        fn: (x: number, y: number, z: number) => void,
        read: () => number[]
      ): number => {
        const a = point(base * Math.cos(back), base * Math.sin(back)),
          b = point(base * cos - 0.1 * sin, base * sin + 0.1 * cos);
        fn(a[0], a[1], a[2]);
        const na = read();
        fn(b[0], b[1], b[2]);
        return angle(na, read());
      };
      const field = turn(
        (x, y, z) => f.sample(x, y, z),
        () => [-f.gx, -f.gy, -f.gz]
      );
      expect(
        turn(
          (x, y, z) => expect(f.shade(x, y, z)).toBe(true),
          () => [f.nx, f.ny, f.nz]
        )
      ).toBeLessThan(field + 1);
    }
  });

  it('makes the neck the larger sphere where one sphere holds the other', () => {
    expect(tangentNeck([0, 0, 0], 6, [3, 0, 0], 2)).toEqual([0, 0, 0, 6, 0, 0, 0, 6]);
    expect(tangentNeck([0, 0, 0], 1, [3, 0, 0], 5)).toEqual([3, 0, 0, 5, 3, 0, 0, 5]);
    // A neck that widens has its circles behind the centres.
    const [sin, cos] = halfAngle(1, 2, 10);
    tangentNeck([0, 0, 0], 1, [10, 0, 0], 2).forEach((v, i) =>
      expect(v).toBeCloseTo([sin, 0, 0, cos, 10 + 2 * sin, 0, 0, 2 * cos][i], 12)
    );
  });

  it("lays its necks again at a hybrid patch's floor, tangent to the sphere and the targets as floored", () => {
    // A floor between the second neck's radius where it touches its target, r cos α, and the target's own r.
    const p = params({ minRadius: 1.45 });
    const plan = planHybrid(m, p, { maxBatches: 1, bigPatchBandVoxels: Infinity });
    const patch = plan.batches
      .flatMap((b) => b.patches)
      .find((q) => q.prims.some((P) => P.type === SWC_SOMA))!;
    const floor = layoutOptions(p).floorVoxels * patch.voxel;
    const s = patch.prims.find((P) => P.type === SWC_SOMA)!.segs;
    const R = Math.max(base, floor);
    expect(s.subarray(0, 8)).toEqual(Float64Array.of(0, 0, 0, R, 0, 0, 0, R));
    let under = 0;
    NECKS.forEach(([axis, d, r], i) => {
      if (r * halfAngle(base, r, d)[1] < floor) under++;
      // Each circle where the neck touches a sphere lies on it: its centre's distance from the sphere's and its radius
      // make the sphere's radius. A neck raised to the floor once laid had its circle off the target's sphere.
      const o = 8 * (i + 1),
        t = [0, 1, 2].map((c) => (c === axis ? d : 0)),
        rt = Math.max(r, floor);
      expect(Math.hypot(s[o], s[o + 1], s[o + 2]) ** 2 + s[o + 3] ** 2).toBeCloseTo(R * R, 9);
      expect(
        Math.hypot(s[o + 4] - t[0], s[o + 5] - t[1], s[o + 6] - t[2]) ** 2 + s[o + 7] ** 2
      ).toBeCloseTo(rt * rt, 9);
    });
    expect(under).toBe(1);
    expectWatertight(buildHybrid(m, p));
  });

  it('gives each section forking right at the soma its own neck, and none to a type that is left out', () => {
    const two = parseSwc(cell([{ d: 8 }, { d: 8, dir: [0, 1, 0] }, { d: 30, type: SWC_AXON }]));
    expect(somaPrim(collectPrimitives(two, params())).segs.length / 8).toBe(4);
    expect(
      somaPrim(collectPrimitives(two, params({ includeTypes: [SWC_BASAL] }))).segs.length / 8
    ).toBe(3);
    expect(buildHybrid(two, params({ includeTypes: [SWC_BASAL] })).stats.soma).toEqual({
      radius: BASE_RADIUS_FRACTION * 8,
      necks: 2,
    });
    expectWatertight(buildHybrid(two, params()));
  });

  it("keeps a valid arbor's first sample through smoothing, resampling and simplification, and follows it there", () => {
    // Samples every micron: simplification would drop the first one, and the axon's resampling would replace it.
    const dense = parseSwc(
      cell([
        { d: 8, n: 30, step: 1 },
        { d: 10, n: 30, step: 1, type: SWC_AXON },
        { d: 2, n: 30, step: 1 },
      ])
    );
    const p = params({ smoothing: 1, simplify: 0.5, axonStep: 5 });
    const prepared = prepareMorphology(dense, p);
    const necks = somaNecks(prepared, null);
    expect([...necks.keys()]).toEqual([0, 1]);
    for (const [section, n] of necks) {
      const sec = prepared.sections[section];
      expect(sec.nodes[1]).toBe(dense.somaStems.arbors[section].stemNode);
      expect(n).toEqual(sec.points.subarray(4));
    }
    // The axon's steps are counted from its first sample (the simplification then drops the collinear points again).
    const axon = prepareMorphology(dense, params({ axonStep: 5 })).sections[1];
    expect(axon.points[5]).toBe(10);
    expect(axon.points[9] - axon.points[5]).toBeCloseTo(5, 6);
    expect(axon.points.length / 4).toBe(8);
    // The stem within 5 µm is simplified as before: its first sample is gone.
    expect(prepared.sections[2].nodes[1]).not.toBe(dense.somaStems.arbors[2].stemNode);
    expect(buildHybrid(dense, p).stats.soma).toEqual({
      radius: BASE_RADIUS_FRACTION * 8,
      necks: 2,
    });
  });

  it('keeps the first sample of a stem that untangling moves, with points put in before it', () => {
    // A thin straight stem along x, and a thick one that leaves along y and crosses it 40 µm out, a micron above it.
    const crossing = parseSwc(`
      1 1 0 0 0 6 -1
      2 3 8 0 0 0.5 1
      3 3 60 0 0 0.5 2
      4 3 0 8 1 1.5 1
      5 3 40 8 1 1.5 4
      6 3 40 -20 1 1.5 5
    `);
    const stem = crossing.somaStems.arbors[0].stemNode;
    const untangled = prepareMorphology(crossing, params({ untangle: 0.25 }));
    expect(untangleReport(untangled)?.contacts).toBeGreaterThan(0);
    // The thin stem moved, and has points of its own before its first sample, which is collinear with the rest: the
    // simplification keeps it only as the point it is pinned at, not as the section's second.
    const moved = untangled.sections[0];
    const k = moved.nodes.indexOf(stem);
    expect(k).toBeGreaterThan(1);
    expect(moved.nodes[1]).toBe(-1);
    expect(simplifySection(moved, 0.5, 1).nodes).not.toContain(stem);
    expect(simplifySection(moved, 0.5, k).nodes).toContain(stem);
    const p = params({ simplify: 0.5, untangle: 0.25 });
    const prepared = prepareMorphology(crossing, p);
    const thin = prepared.sections[0];
    expect(thin.nodes).toContain(stem);
    const necks = somaNecks(prepared, null);
    expect([...necks.keys()]).toEqual([0, 1]);
    expect(necks.get(0)).toEqual(thin.points.subarray(4 * thin.nodes.indexOf(stem)));
    expectWatertight(buildHybrid(crossing, p));
  });
});

describe('a soma without a valid arbor', () => {
  const m = parseSwc(PLAIN);
  /** Where the stems are cut: 1.25 × the fitted radius, 6. */
  const cut = 6 / BASE_RADIUS_FRACTION;

  it('is the fitted sphere with a neck to where each arbor first gets 1.25 × its radius out, and the sections start there', () => {
    expect(m.somaStems).toMatchObject({ source: 'fitted', baseRadius: 6, neckDistance: cut });
    const prims = collectPrimitives(m, params());
    const soma = somaPrim(prims);
    const neck = (axis: number, r: number): number[] => {
      const [sin, cos] = halfAngle(6, r, cut);
      const at = (x: number): number[] => [0, 1, 2].map((c) => (c === axis ? x : 0));
      return [...at(6 * sin), 6 * cos, ...at(cut + r * sin), r * cos];
    };
    const expected = [0, 0, 0, 6, 0, 0, 0, 6, ...neck(0, 2), ...neck(1, 1.5), ...neck(2, 1)];
    expect(soma.segs).toHaveLength(expected.length);
    soma.segs.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 12));
    // What lies within the cut goes with the neck: the stems at 2, 3 and 4 µm begin 7.5 µm out.
    const sections = prims.filter((P) => P.type !== SWC_SOMA);
    expect(sections.map((P) => Array.from(P.segs, (v) => +v.toFixed(9)))).toEqual([
      [cut, 0, 0, 2, 22, 0, 0, 2],
      [0, cut, 0, 1.5, 0, 23, 0, 1.5],
      [0, 0, cut, 1, 0, 0, 24, 1],
    ]);
    expect([...somaNecks(m, null).keys()]).toEqual([0, 1, 2]);
  });

  it('meshes closed, and the page says so', () => {
    for (const mesh of [buildMesh(m, params()), buildHybrid(m, params())]) {
      expectWatertight(mesh);
      expect(mesh.stats.soma).toEqual({ radius: 6, necks: 3 });
    }
  });

  it('follows the cut through smoothing, resampling, untangling and simplification, and meshes a placeholder soma at the minimum', () => {
    // A soma traced at 0.088 µm, the projection neurons' placeholder, with stems that start on the centre and are
    // sampled every micron.
    const dense = parseSwc(
      cell(
        [
          { d: 0.001, r: 0.4, n: 30, step: 1 },
          { d: 0.003, r: 0.8, n: 30, step: 1, dir: [0.6, 0.8, 0] },
          { d: 0.005, r: 0.6, n: 30, step: 1, type: SWC_AXON, dir: [0, 0, -1] },
        ],
        '1 1 0 0 0 0.088 -1'
      )
    );
    expect(dense.somaStems).toMatchObject({
      source: 'minimum',
      baseRadius: SOMA_MIN_RADIUS,
      neckDistance: SOMA_MIN_RADIUS / BASE_RADIUS_FRACTION,
    });
    const p = params({ smoothing: 1, simplify: 0.5, axonStep: 5, untangle: 0.25 });
    const prepared = prepareMorphology(dense, p);
    const necks = somaNecks(prepared, null);
    expect([...necks.keys()]).toEqual([0, 1, 2]);
    for (const [section, n] of necks) {
      // The neck ends where the section as prepared first gets as far out, and the section goes on from there.
      expect(Math.hypot(n[0], n[1], n[2])).toBeCloseTo(dense.somaStems.neckDistance, 9);
      const q = prepared.sections[section].points;
      let k = 0;
      while (Math.hypot(q[4 * k], q[4 * k + 1], q[4 * k + 2]) < dense.somaStems.neckDistance) k++;
      expect(n.subarray(4)).toEqual(q.subarray(4 * k));
    }
    for (const mesh of [buildMesh(dense, p), buildHybrid(dense, p)]) {
      expectWatertight(mesh);
      expect(mesh.stats.soma).toEqual({ radius: SOMA_MIN_RADIUS, necks: 3 });
    }
  });
});
