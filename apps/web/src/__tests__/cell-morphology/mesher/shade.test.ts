// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';

import {
  FieldSampler,
  SHADE_HANDOVER,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/field';
import {
  buildMesh,
  type MeshResult,
  planMesh,
  simplifierReady,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher';
import { parseSwc } from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';
import { SectionPath } from '@/features/entities/cell-morphology/morpho-viewer/engine/tubes';

import { degrees, params } from './mesh-utils';

/** A straight section along x: a cylinder of radius 2 up to x = 3, then a cone of slope −0.3 in two segments. */
const TAPERING = `
  1 3 0 0 0 2.0 -1
  2 3 3 0 0 2.0 1
  3 3 6 0 0 1.1 2
  4 3 9 0 0 0.2 3
`;

/**
 * A soma and neurites of one radius each, with bends and a fork: nothing tapers but the soma's necks. No stem sizes the
 * soma, so it is raised to 5 µm and necked to where the stems get 6.25 µm out (soma.ts).
 */
const UNTAPERED = `
  1 1 0 0 0 4 -1
  2 3 0 0 0 1 1
  3 3 10 0 0 1 2
  4 3 16 5 0 1 3
  5 3 16 -5 2 1 3
  6 3 24 8 3 1 4
  7 2 0 0 0 0.6 1
  8 2 -9 0 3 0.6 7
  9 2 -14 6 3 0.6 8
`;

/** The bends of `UNTAPERED` within a section, which is where its surface folds: the point before, the bend, the point after, the radius. */
const UNTAPERED_BENDS: { from: number[]; at: number[]; to: number[]; r: number }[] = [
  { from: [10, 0, 0], at: [16, 5, 0], to: [24, 8, 3], r: 1 },
  { from: [0, 0, 0], at: [-9, 0, 3], to: [-14, 6, 3], r: 0.6 },
];

/**
 * Where hulls mislead, being larger than the cones they stand in for. Each of these has caught a version of `shade`
 * that trusted them too far: the vertices it names got a normal tens of degrees off the triangles around them.
 */
const MISLEADING: {
  name: string;
  voxel: number;
  simplifyMesh: number;
  turned: number;
  swc: string;
}[] = [
  {
    // Two thin branches start at the radius of their parent: each has a funnel for a first segment, whose hull is
    // mostly the sphere at the fork. Weighed by its hull, such a branch pulls at the normals of the other one.
    name: 'a fork of thin branches on a thick one',
    voxel: 0.05,
    simplifyMesh: 0.025,
    turned: 50,
    swc: `
      1 3 0 0 0 0.65 -1
      2 3 6 0 0 0.65 1
      3 3 6.8 0.4 0 0.1 2
      4 3 10 2 0 0.1 3
      5 3 6.8 -0.4 0.2 0.1 2
      6 3 10 -2 1 0.1 5
    `,
  },
  {
    // The hulls of a funnel and of the tube after it fold a little way from where the surface does; the vertices in
    // between are on the tube and nearer to the funnel's hull.
    name: 'a sharp bend after a funnel',
    voxel: 0.1,
    simplifyMesh: 0,
    turned: 200,
    swc: `
      1 3 0 0 0 1.35 -1
      2 3 4 0 0 1.35 1
      3 3 5.9 0 0 0.6 2
      4 3 6.3 2.2 0 0.62 3
      5 3 6.5 6 0 0.62 4
    `,
  },
  {
    // Vertices on the neck lie inside the hull of the shoulder, two and three segments back round the bend.
    name: 'a stem with a shoulder much thicker than its neck',
    voxel: 0.2,
    simplifyMesh: 0.1,
    turned: 10,
    swc: `
      1 1 0 0 0 3.7 -1
      2 3 0 0 0 3.7 1
      3 3 4 2.2 1.8 3.5 2
      4 3 5.2 2.8 2.7 2.6 3
      5 3 5.7 3.1 3.6 2.2 4
      6 3 5.8 3.2 4.7 2.1 5
      7 3 5.7 3.4 7 2.0 6
      8 3 5.7 3.6 12 1.8 7
    `,
  },
];

/** Unit normals of the mesh's own triangles at its vertices, weighted by the angle each triangle has there. */
function triangleNormals(res: MeshResult): Float64Array {
  const P = res.positions,
    I = res.indices;
  const G = new Float64Array(P.length);
  for (let t = 0; t < I.length; t += 3) {
    const v = [I[t], I[t + 1], I[t + 2]];
    const e = (a: number, b: number): [number, number, number] => [
      P[3 * b] - P[3 * a],
      P[3 * b + 1] - P[3 * a + 1],
      P[3 * b + 2] - P[3 * a + 2],
    ];
    const u = e(v[0], v[1]),
      w = e(v[0], v[2]);
    const f = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const fl = Math.hypot(f[0], f[1], f[2]) || 1;
    for (let k = 0; k < 3; k++) {
      const a = e(v[k], v[(k + 1) % 3]),
        b = e(v[k], v[(k + 2) % 3]);
      const angle = Math.acos(
        Math.max(
          -1,
          Math.min(
            1,
            (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b) || 1)
          )
        )
      );
      for (let c = 0; c < 3; c++) G[3 * v[k] + c] += (angle * f[c]) / fl;
    }
  }
  for (let v = 0; v < G.length; v += 3) {
    const l = Math.hypot(G[v], G[v + 1], G[v + 2]) || 1;
    G[v] /= l;
    G[v + 1] /= l;
    G[v + 2] /= l;
  }
  return G;
}

/** The field's own unit normal at a point, and the radius of the section there. */
function fieldNormal(
  sampler: FieldSampler,
  x: number,
  y: number,
  z: number
): { f: number[]; r: number } {
  sampler.sample(x, y, z);
  const g = Math.hypot(sampler.gx, sampler.gy, sampler.gz) || 1;
  return { f: [-sampler.gx / g, -sampler.gy / g, -sampler.gz / g], r: sampler.radius };
}

/**
 * Whether a normal is what the hand-over makes of a vertex next to a fold: within the turn from the field's normal at
 * the point to the field's normal farthest from it within a tenth of the radius (next to a fold, and only there, that
 * turn is a wide one), and no more than halfway, since the vertex's own side weighs most.
 */
function towardsFold(sampler: FieldSampler, x: number, y: number, z: number, n: number[]): boolean {
  const { f, r } = fieldNormal(sampler, x, y, z);
  let far = f,
    fold = 0;
  for (let k = 0; k < 27; k++) {
    const d = [(k % 3) - 1, (Math.floor(k / 3) % 3) - 1, Math.floor(k / 9) - 1];
    const l = Math.hypot(d[0], d[1], d[2]);
    if (l === 0) continue;
    const q = fieldNormal(
      sampler,
      x + (0.1 * r * d[0]) / l,
      y + (0.1 * r * d[1]) / l,
      z + (0.1 * r * d[2]) / l
    ).f;
    const a = degrees(q[0] * f[0] + q[1] * f[1] + q[2] * f[2]);
    if (a > fold) {
      fold = a;
      far = q;
    }
  }
  const own = degrees(n[0] * f[0] + n[1] * f[1] + n[2] * f[2]),
    other = degrees(n[0] * far[0] + n[1] * far[1] + n[2] * far[2]);
  return own + other < fold + 5 && own < 0.5 * fold + 3;
}

describe('shading normals', () => {
  beforeAll(() => simplifierReady);

  it("run on past a skeleton point where the field's own normal turns by the cone's slope", () => {
    const sampler = new FieldSampler(
      planMesh(parseSwc(TAPERING), params({ voxel: 0.1 }), { maxSlabs: 1 }).jobs[0]
    );
    // Along the line on the surface above the axis, from the cylinder over both skeleton points onto the second cone.
    let fieldJump = 0,
      shadeJump = 0;
    let field: number[] | null = null,
      shade: number[] | null = null;
    for (let x = 1; x < 8; x += 0.002) {
      let lo = 0,
        hi = 3;
      for (let i = 0; i < 50; i++) {
        const y = 0.5 * (lo + hi);
        sampler.sample(x, y, 0);
        if (sampler.value > 1) lo = y;
        else hi = y;
      }
      const y = 0.5 * (lo + hi);
      sampler.sample(x, y, 0);
      const g = Math.hypot(sampler.gx, sampler.gy, sampler.gz);
      const f = [-sampler.gx / g, -sampler.gy / g, -sampler.gz / g];
      expect(sampler.shade(x, y, 0)).toBe(true);
      const s = [sampler.nx, sampler.ny, sampler.nz];
      expect(Math.hypot(s[0], s[1], s[2])).toBeCloseTo(1, 12);
      if (field !== null && shade !== null) {
        fieldJump = Math.max(
          fieldJump,
          degrees(f[0] * field[0] + f[1] * field[1] + f[2] * field[2])
        );
        shadeJump = Math.max(
          shadeJump,
          degrees(s[0] * shade[0] + s[1] * shade[1] + s[2] * shade[2])
        );
      }
      field = f;
      shade = s;
      // On the cylinder the two are one; on the cone the hull's side is steeper than the field's cone by asin τ − atan τ.
      if (x < 2.5) expect(degrees(f[0] * s[0] + f[1] * s[1] + f[2] * s[2])).toBeLessThan(1e-4);
      if (x > 7) expect(s[0]).toBeCloseTo(0.3, 9);
    }
    // atan 0.3 = 16.7°, where the cone meets the sphere around the point at x = 6.
    expect(fieldJump).toBeGreaterThan(16);
    expect(shadeJump).toBeLessThan(0.2);
  });

  it("are the field's own normals where no radius changes, but for the folds", () => {
    const m = parseSwc(UNTAPERED);
    const res = buildMesh(m, params());
    const sampler = new FieldSampler(planMesh(m, params(), { maxSlabs: 1 }).jobs[0]);
    const unit = (v: number[]): number[] => v.map((c) => c / Math.hypot(v[0], v[1], v[2]));
    // Around the fold on the inside of a bend of φ the distances to the two axes differ by 2 sin(φ / 2) times the
    // distance from the plane between them, and the hand-over reaches as far as they differ by its share of the scale.
    // That is in the plane of the bend: up the flanks the fold gets shallower, the distances part more slowly and the
    // hand-over reaches farther, for a smaller turn. Three times as far covers it.
    const folds = UNTAPERED_BENDS.map(({ from, at, to, r }) => {
      const a = unit(at.map((c, k) => c - from[k])),
        b = unit(to.map((c, k) => c - at[k]));
      const half = 0.5 * Math.acos(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]);
      const scale = Math.max(0.5 * r, params().voxel);
      return {
        at,
        r,
        half,
        across: unit(a.map((c, k) => c + b[k])),
        inwards: unit(b.map((c, k) => c - a[k])),
        reach: (SHADE_HANDOVER * scale) / (2 * Math.sin(half)),
      };
    });
    // The soma is left out: a neck shades as the cone it is, where the fold rounds it into the sphere (field.ts).
    const soma = m.somaStems.neckDistance + 2;
    let worst = 0,
      softened = 0;
    for (let v = 0; v < res.positions.length; v += 3) {
      const p = [0, 1, 2].map((k) => res.positions[v + k] + res.center[k]);
      if (Math.hypot(p[0], p[1], p[2]) < soma) continue;
      const { f } = fieldNormal(sampler, p[0], p[1], p[2]);
      const off = degrees(
        f[0] * res.normals[v] + f[1] * res.normals[v + 1] + f[2] * res.normals[v + 2]
      );
      const fold = folds.find(({ at, r, across, inwards, reach }) => {
        const d = p.map((c, k) => c - at[k]);
        return (
          Math.hypot(d[0], d[1], d[2]) < 3 * r &&
          d[0] * inwards[0] + d[1] * inwards[1] + d[2] * inwards[2] > 0 &&
          Math.abs(d[0] * across[0] + d[1] * across[1] + d[2] * across[2]) < 3 * reach
        );
      });
      if (fold === undefined) worst = Math.max(worst, off);
      else {
        // Between the two sides: at most half the bend from either.
        expect(off).toBeLessThan((fold.half * 180) / Math.PI + 1);
        if (off > 5) softened++;
      }
    }
    expect(res.positions.length).toBeGreaterThan(30000);
    // The mesh holds float32 normals.
    expect(worst).toBeLessThan(0.05);
    expect(softened).toBeGreaterThan(10);
  });

  it('turn across the fold on the inside of a bend instead of jumping', () => {
    // A tube of radius 1 along x that turns by 60° towards y at the origin. In the plane of the bend the two cylinders
    // meet, on the inside, at x = −tan 30°.
    const bend = Math.PI / 3,
      crease = -Math.tan(0.5 * bend);
    const swc = `1 3 -10 0 0 1 -1\n2 3 0 0 0 1 1\n3 3 ${10 * Math.cos(bend)} ${10 * Math.sin(bend)} 0 1 2`;
    const sampler = new FieldSampler(
      planMesh(parseSwc(swc), params({ voxel: 0.1 }), { maxSlabs: 1 }).jobs[0]
    );
    // The distances to the two axes differ by sin 60° times the way along x, and the scale of the blend is 0.5.
    const reach = (SHADE_HANDOVER * 0.5) / Math.sin(bend);
    let fieldJump = 0,
      shadeJump = 0;
    let field: number[] | null = null,
      shade: number[] | null = null;
    for (let x = crease - 0.4; x < crease + 0.4; x += 0.002) {
      let lo = 0.5,
        hi = 3;
      for (let i = 0; i < 50; i++) {
        const y = 0.5 * (lo + hi);
        sampler.sample(x, y, 0);
        if (sampler.value > 1) lo = y;
        else hi = y;
      }
      const y = 0.5 * (lo + hi);
      const { f } = fieldNormal(sampler, x, y, 0);
      expect(sampler.shade(x, y, 0)).toBe(true);
      const s = [sampler.nx, sampler.ny, sampler.nz];
      if (field !== null && shade !== null) {
        fieldJump = Math.max(
          fieldJump,
          degrees(f[0] * field[0] + f[1] * field[1] + f[2] * field[2])
        );
        shadeJump = Math.max(
          shadeJump,
          degrees(s[0] * shade[0] + s[1] * shade[1] + s[2] * shade[2])
        );
        // It turns one way only, from the one cylinder's normal to the other's.
        expect(s[0]).toBeLessThanOrEqual(shade[0] + 1e-12);
      }
      field = f;
      shade = s;
      // Beyond the hand-over nothing changes; at the fold it is halfway.
      if (Math.abs(x - crease) > reach + 0.004)
        expect(degrees(f[0] * s[0] + f[1] * s[1] + f[2] * s[2])).toBeLessThan(1e-4);
      if (Math.abs(x - crease) < 0.001)
        expect(degrees(s[0] * -Math.sin(0.5 * bend) + s[1] * Math.cos(0.5 * bend))).toBeLessThan(1);
    }
    expect(fieldJump).toBeGreaterThan(59);
    expect(shadeJump).toBeLessThan(1.5);
  });

  it.each(MISLEADING)('stay with the surface at $name', ({
    swc,
    voxel,
    simplifyMesh,
    turned: atLeast,
  }) => {
    const m = parseSwc(swc);
    const p = params({ voxel, simplifyMesh });
    const res = buildMesh(m, p);
    const sampler = new FieldSampler(planMesh(m, p, { maxSlabs: 1 }).jobs[0]);
    const G = triangleNormals(res);
    let turned = 0,
      astray = 0;
    for (let v = 0; v < res.positions.length; v += 3) {
      const n = [res.normals[v], res.normals[v + 1], res.normals[v + 2]];
      expect(Math.hypot(n[0], n[1], n[2])).toBeCloseTo(1, 5);
      sampler.sample(
        res.positions[v] + res.center[0],
        res.positions[v + 1] + res.center[1],
        res.positions[v + 2] + res.center[2]
      );
      const g = Math.hypot(sampler.gx, sampler.gy, sampler.gz);
      const f = [-sampler.gx / g, -sampler.gy / g, -sampler.gz / g];
      if (degrees(f[0] * n[0] + f[1] * n[1] + f[2] * n[2]) > 5) turned++;
      // Well off the triangles around the vertex, where the field's own normal is not; unless it is a vertex next to a
      // sharp fold, whose triangles are all on one side of it, and its normal is part of the way to the other side's.
      const off = degrees(n[0] * G[v] + n[1] * G[v + 1] + n[2] * G[v + 2]);
      if (off > 35 && degrees(f[0] * G[v] + f[1] * G[v + 1] + f[2] * G[v + 2]) < 20) {
        if (
          !towardsFold(
            sampler,
            res.positions[v] + res.center[0],
            res.positions[v + 1] + res.center[1],
            res.positions[v + 2] + res.center[2],
            n
          )
        )
          astray++;
      }
    }
    // The tapers are steep: there is something to correct, and it is corrected.
    expect(turned).toBeGreaterThan(atLeast);
    expect(astray).toBe(0);
  });

  it("are the same from the field and from a section's path, which shades the tubes and the patches' cut edges", () => {
    // An oblique section that swells and tapers, its slope falling from 0.15 to −0.15 point by point. Where a slope
    // rises instead, two hulls cross a little before the skeleton point: the path turns the normal there, the field at
    // the point, where the surface has its crease.
    const dir = [0.62, 0.71, 0.33].map((d) => d / Math.hypot(0.62, 0.71, 0.33));
    const radii = [1.0, 1.6, 2.0, 2.2, 2.2, 2.0, 1.6, 1.0];
    const swc = radii
      .map((r, i) => `${i + 1} 3 ${dir.map((d) => 4 * i * d).join(' ')} ${r} ${i === 0 ? -1 : i}`)
      .join('\n');
    const sampler = new FieldSampler(
      planMesh(parseSwc(swc), params({ voxel: 0.1 }), { maxSlabs: 1 }).jobs[0]
    );
    const path = new SectionPath(
      Float64Array.from(radii.flatMap((r, i) => [...dir.map((d) => 4 * i * d), r]))
    );
    const last = path.count - 2;
    // Two directions across the axis.
    const e1 = [dir[1], -dir[0], 0].map((c) => c / Math.hypot(dir[0], dir[1]));
    const e2 = [
      dir[1] * e1[2] - dir[2] * e1[1],
      dir[2] * e1[0] - dir[0] * e1[2],
      dir[0] * e1[1] - dir[1] * e1[0],
    ];
    let worst = 0,
      leaning = 0;
    for (let s = 1.003; s < 27; s += 0.0617) {
      for (let k = 0; k < 5; k++) {
        const a = 0.4 + (2 * Math.PI * k) / 5;
        const ray = [0, 1, 2].map((c) => Math.cos(a) * e1[c] + Math.sin(a) * e2[c]);
        const rho = path.cast(
          s * dir[0],
          s * dir[1],
          s * dir[2],
          ray[0],
          ray[1],
          ray[2],
          1,
          0,
          last
        );
        const x = s * dir[0] + rho * ray[0],
          y = s * dir[1] + rho * ray[1],
          z = s * dir[2] + rho * ray[2];
        path.shade(x, y, z, 0, last);
        expect(sampler.shade(x, y, z)).toBe(true);
        worst = Math.max(
          worst,
          degrees(path.nx * sampler.nx + path.ny * sampler.ny + path.nz * sampler.nz)
        );
        if (Math.abs(path.nx * dir[0] + path.ny * dir[1] + path.nz * dir[2]) > 0.1) leaning++;
      }
    }
    expect(leaning).toBeGreaterThan(500);
    expect(worst).toBeLessThan(1e-4);
  });

  it('are the same from one slab or many', () => {
    const m = parseSwc(MISLEADING[1].swc);
    // Not simplified: slabs simplify each on their own, and the meshes would share only some of their vertices.
    const p = params({ voxel: 0.1 });
    const byPosition = (res: MeshResult): Map<string, number[]> => {
      const out = new Map<string, number[]>();
      for (let v = 0; v < res.positions.length; v += 3) {
        out.set(`${res.positions[v]},${res.positions[v + 1]},${res.positions[v + 2]}`, [
          res.normals[v],
          res.normals[v + 1],
          res.normals[v + 2],
        ]);
      }
      return out;
    };
    const one = byPosition(buildMesh(m, p));
    const manyMesh = buildMesh(m, p, { maxSlabs: 4, bandVoxelsPerSlab: 0 });
    expect(manyMesh.stats.slabs).toBeGreaterThan(1);
    const many = byPosition(manyMesh);
    expect(many.size).toBe(one.size);
    // A vertex on a seam has its normal from the slabs on both sides of it.
    for (const [key, n] of many) {
      const o = one.get(key);
      expect(o).toBeDefined();
      expect(degrees(n[0] * o![0] + n[1] * o![1] + n[2] * o![2])).toBeLessThan(0.05);
    }
  });
});
