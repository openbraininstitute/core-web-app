// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { FieldSampler } from '@/features/entities/cell-morphology/morpho-viewer/engine/field';
import {
  accumulateField,
  B,
  BS,
  buildMesh,
  mergeSlabs,
  meshSlab,
  planMesh,
  planPrimitives,
  simplifierReady,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher';
import { parseSwc, SWC_BASAL } from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';

import { BRANCHED, checkMesh, flatTriangles, MESH_TIMEOUT, params } from './mesh-utils';

vi.setConfig({ testTimeout: MESH_TIMEOUT });

const DIRECTION = [0.62, 0.71, 0.33].map((d) => d / Math.hypot(0.62, 0.71, 0.33));

/**
 * A soma and a straight fibre of the given length leaving it obliquely, thinner than any voxel used here. The fibre
 * starts on the centre, so the soma is raised to the 5 µm minimum and necked to it 6.25 µm out (soma.ts).
 */
function fibre(length: number): string {
  // In short segments, as traced: the mesher visits the whole bounding box of a segment's band.
  const lines = ['1 1 0 0 0 1 -1'];
  for (let i = 0; 2 * i <= length; i++) {
    const [x, y, z] = DIRECTION.map((d) => 2 * i * d);
    lines.push(`${i + 2} 2 ${x} ${y} ${z} 0.01 ${i + 1}`);
  }
  return lines.join('\n');
}

/** Position along the fibre and distance from its axis. */
function alongAndOff(x: number, y: number, z: number): [number, number] {
  const t = x * DIRECTION[0] + y * DIRECTION[1] + z * DIRECTION[2];
  return [t, Math.hypot(x - t * DIRECTION[0], y - t * DIRECTION[1], z - t * DIRECTION[2])];
}

describe('field sampler', () => {
  it('reproduces the grid field at the samples', () => {
    const h = 0.25;
    const job = planMesh(parseSwc(BRANCHED), params({ voxel: h }), { maxSlabs: 1 }).jobs[0];
    const sampler = new FieldSampler(job);
    const g = job.grid;
    let compared = 0,
      worst = 0;
    for (const blk of accumulateField(job).blocks.values()) {
      for (let k = 0; k < BS; k += 3) {
        for (let j = 0; j < BS; j += 3) {
          for (let i = 0; i < BS; i += 3) {
            sampler.sample(
              g.ox + (blk.bx * B + i) * h,
              g.oy + (blk.by * B + j) * h,
              g.oz + (blk.bz * B + k) * h
            );
            worst = Math.max(worst, Math.abs(sampler.value - blk.acc[(k * BS + j) * BS + i]));
            compared++;
          }
        }
      }
    }
    expect(compared).toBeGreaterThan(10000);
    // The grid holds float32 sums.
    expect(worst).toBeLessThan(1e-5);
  });

  it('has the gradient of the field it returns', () => {
    const h = 0.25,
      d = 1e-5;
    const m = parseSwc(BRANCHED);
    const res = buildMesh(m, params({ voxel: h }));
    const sampler = new FieldSampler(planMesh(m, params({ voxel: h }), { maxSlabs: 1 }).jobs[0]);
    const at = (x: number, y: number, z: number): number => {
      sampler.sample(x, y, z);
      return sampler.value;
    };
    // Not the soma: no stem sizes it, so it has necks to where they get 6.25 µm out (soma.ts), and on a tapering neck
    // the gradient of the soma's fold leaves out how its lift changes along it (soma-field.test.ts uses cylinders).
    const soma = m.somaStems.neckDistance + 1;
    let worst = 0;
    for (let v = 0; v < res.positions.length; v += 3 * 97) {
      // Off the surface, where the kernel has no kink.
      const x = res.positions[v] + res.center[0] + 0.3 * h * res.normals[v];
      const y = res.positions[v + 1] + res.center[1] + 0.3 * h * res.normals[v + 1];
      const z = res.positions[v + 2] + res.center[2] + 0.3 * h * res.normals[v + 2];
      if (Math.hypot(x, y, z) < soma) continue;
      const numeric = [
        (at(x + d, y, z) - at(x - d, y, z)) / (2 * d),
        (at(x, y + d, z) - at(x, y - d, z)) / (2 * d),
        (at(x, y, z + d) - at(x, y, z - d)) / (2 * d),
      ];
      sampler.sample(x, y, z);
      const size = Math.hypot(sampler.gx, sampler.gy, sampler.gz);
      worst = Math.max(
        worst,
        Math.hypot(sampler.gx - numeric[0], sampler.gy - numeric[1], sampler.gz - numeric[2]) / size
      );
    }
    // The gradient leaves out how the blend scale changes along a tapering segment.
    expect(worst).toBeLessThan(0.05);
  });

  it('takes memory by the segments, not by the extent they span', () => {
    // 2000 segments across 4 mm, as a long-range axon: a row per coarse cell of their box would be a billion rows.
    const h = 0.25,
      length = 4000;
    const job = planMesh(parseSwc(fibre(length)), params({ voxel: h, minRadius: h }), {
      maxSlabs: 1,
    }).jobs[0];
    const sampler = new FieldSampler(job);
    expect((sampler as unknown as { coarseStart: Uint32Array }).coarseStart.length).toBeLessThan(
      1e6
    );
    // The far end is still found: on the axis of a tube of one voxel radius, u = -1 and g = 2.
    const [x, y, z] = DIRECTION.map((d) => (length - 1) * d);
    sampler.sample(x, y, z);
    expect(sampler.value).toBeCloseTo(2, 6);
    expect(sampler.radius).toBeCloseTo(h, 6);
  });
});

describe('projection onto the field', () => {
  it('puts the vertices of a thin oblique fibre on the tube, with radial normals', () => {
    const h = 0.2;
    const m = parseSwc(fibre(40));
    const spread = (project: boolean): { min: number; max: number; normal: number } => {
      const res = buildMesh(m, params({ voxel: h, project }));
      let min = Infinity,
        max = -Infinity,
        normal = Infinity;
      for (let v = 0; v < res.positions.length; v += 3) {
        const x = res.positions[v] + res.center[0],
          y = res.positions[v + 1] + res.center[1],
          z = res.positions[v + 2] + res.center[2];
        const [t, off] = alongAndOff(x, y, z);
        // Past the soma, its neck and the soma's blend around where the neck hands over to the fibre.
        if (t < 15 || t > 35) continue;
        min = Math.min(min, off);
        max = Math.max(max, off);
        const n = [res.normals[v], res.normals[v + 1], res.normals[v + 2]];
        const radial = [x - t * DIRECTION[0], y - t * DIRECTION[1], z - t * DIRECTION[2]].map(
          (c) => c / off
        );
        normal = Math.min(normal, n[0] * radial[0] + n[1] * radial[1] + n[2] * radial[2]);
      }
      return { min, max, normal };
    };
    // The radius is clamped to one voxel. Surface nets leave the vertices up to a third of a voxel inside the tube.
    const before = spread(false),
      after = spread(true);
    expect(before.min).toBeLessThan(0.8 * h);
    expect(after.min).toBeGreaterThan(0.99 * h);
    expect(after.max).toBeLessThan(1.01 * h);
    expect(after.normal).toBeGreaterThan(0.999);
    expect(before.normal).toBeLessThan(0.99);
  });

  it('keeps the mesh closed, outward facing and the same from one slab or many', () => {
    const m = parseSwc(BRANCHED);
    const one = buildMesh(m, params());
    const chk = checkMesh(one.positions, one.indices);
    expect(chk.closed).toBe(true);
    expect(chk.manifold).toBe(true);
    expect(chk.volume).toBeGreaterThan(0);
    const many = buildMesh(m, params(), { maxSlabs: 5, bandVoxelsPerSlab: 0 });
    expect(many.stats.slabs).toBeGreaterThan(1);
    expect([...many.positions].sort()).toEqual([...one.positions].sort());
  });

  it('leaves no two vertices in one place', () => {
    // A sphere of 20 voxels centred on a sample has samples exactly on its surface.
    for (const swc of ['1 1 0 0 0 5 -1', BRANCHED]) {
      const res = buildMesh(parseSwc(swc), params({ project: false }));
      const seen = new Set<string>();
      for (let v = 0; v < res.positions.length; v += 3)
        seen.add(`${res.positions[v]},${res.positions[v + 1]},${res.positions[v + 2]}`);
      expect(seen.size).toBe(res.positions.length / 3);
    }
  });
});

describe('checked simplification', () => {
  beforeAll(() => simplifierReady);

  it('does not cut a thin fibre, however large the mesh it is part of', () => {
    // 400 µm at an error of 0.04 µm: squared and relative to the extent, far below what the simplifier's float32
    // quadrics resolve when it is given the whole mesh.
    const h = 0.2;
    const res = buildMesh(parseSwc(fibre(400)), params({ voxel: h, simplifyMesh: 0.6 * h }));
    expect(res.stats.defects).toBe(0);
    expect(res.stats.simplifyPasses).toBeGreaterThan(0);
    // A tube two voxels across has little to give.
    expect(res.stats.triangles).toBeLessThan(0.7 * res.stats.rawTriangles);
    const chk = checkMesh(res.positions, res.indices);
    expect(chk.closed).toBe(true);
    expect(chk.manifold).toBe(true);

    // No triangle comes anywhere near the axis: the tube keeps its cross-section.
    let closest = Infinity;
    const P = res.positions,
      c = res.center;
    for (let t = 0; t < res.indices.length; t += 3) {
      const [a, b, d] = [res.indices[t], res.indices[t + 1], res.indices[t + 2]].map((v) => [
        P[3 * v] + c[0],
        P[3 * v + 1] + c[1],
        P[3 * v + 2] + c[2],
      ]);
      for (let i = 0; i <= 4; i++) {
        for (let j = 0; i + j <= 4; j++) {
          const u = i / 4,
            w = j / 4,
            s = 1 - u - w;
          const [along, off] = alongAndOff(
            u * a[0] + w * b[0] + s * d[0],
            u * a[1] + w * b[1] + s * d[1],
            u * a[2] + w * b[2] + s * d[2]
          );
          if (along > 5 && along < 395) closest = Math.min(closest, off);
        }
      }
    }
    expect(closest).toBeGreaterThan(0.4 * h);
  });

  it('keeps the simplified surface within the error of the field', () => {
    const h = 0.25,
      error = 0.5 * h;
    const m = parseSwc(BRANCHED);
    const p = params({ voxel: h, simplifyMesh: error });
    const res = buildMesh(m, p);
    expect(res.stats.triangles).toBeLessThan(0.4 * res.stats.rawTriangles);
    const sampler = new FieldSampler(planMesh(m, p, { maxSlabs: 1 }).jobs[0]);
    const P = res.positions,
      c = res.center;
    let worst = 0;
    for (let t = 0; t < res.indices.length; t += 3) {
      const [a, b, d] = [res.indices[t], res.indices[t + 1], res.indices[t + 2]].map((v) => [
        P[3 * v] + c[0],
        P[3 * v + 1] + c[1],
        P[3 * v + 2] + c[2],
      ]);
      sampler.sample((a[0] + b[0] + d[0]) / 3, (a[1] + b[1] + d[1]) / 3, (a[2] + b[2] + d[2]) / 3);
      worst = Math.max(
        worst,
        Math.abs(sampler.value - 1) / Math.hypot(sampler.gx, sampler.gy, sampler.gz)
      );
    }
    // Checked on a lattice of a voxel, so a centroid in between may be a little over.
    expect(worst).toBeLessThan(1.25 * error);
  });

  it('turns no triangle over', () => {
    // Settings at which the simplifier alone turns a triangle over somewhere on this cell (all but 0.25 µm at 0.7
    // voxel), where the raw mesh has none.
    const m = parseSwc(BRANCHED);
    for (const h of [0.2, 0.25]) {
      const sampler = new FieldSampler(planMesh(m, params({ voxel: h }), { maxSlabs: 1 }).jobs[0]);
      for (const f of [0.7, 0.8, 0.9]) {
        const res = buildMesh(m, params({ voxel: h, simplifyMesh: f * h }));
        const P = res.positions,
          c = res.center;
        // The field's unit normal at every vertex.
        const N = new Float64Array(P.length);
        for (let v = 0; v < P.length; v += 3) {
          sampler.sample(P[v] + c[0], P[v + 1] + c[1], P[v + 2] + c[2]);
          const g = Math.hypot(sampler.gx, sampler.gy, sampler.gz);
          N[v] = -sampler.gx / g;
          N[v + 1] = -sampler.gy / g;
          N[v + 2] = -sampler.gz / g;
        }
        let over = 0;
        for (let t = 0; t < res.indices.length; t += 3) {
          const [a, b, d] = [3 * res.indices[t], 3 * res.indices[t + 1], 3 * res.indices[t + 2]];
          const u = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]];
          const w = [P[d] - P[a], P[d + 1] - P[a + 1], P[d + 2] - P[a + 2]];
          const n = [
            u[1] * w[2] - u[2] * w[1],
            u[2] * w[0] - u[0] * w[2],
            u[0] * w[1] - u[1] * w[0],
          ];
          if (
            n[0] * (N[a] + N[b] + N[d]) +
              n[1] * (N[a + 1] + N[b + 1] + N[d + 1]) +
              n[2] * (N[a + 2] + N[b + 2] + N[d + 2]) <
            0
          )
            over++;
        }
        expect(over, `voxel ${h}, mesh simplify ${f}`).toBe(0);
      }
    }
  });

  it('leaves no triangle without area, which the slabs on both sides of a cut could lay over the same seam vertices', () => {
    // A thick straight fibre lying along the cuts puts the seam vertices on lines. Where the simplifier kept the flat
    // triangles, both sides of a cut laid one over the same three seam vertices in each of these, and the stitched mesh
    // had one or two edges with four triangles.
    const cases = [
      // radius, voxel, rise per length, mesh simplify in voxels, slabs, length, start
      [2.5, 0.075, 0.01, 0.6, 3, 8, [5, 3.25, 3]],
      [2.5, 0.08, 0.01, 0.7, 6, 8, [2, 2, 1.25]],
      [2, 0.075, 0.02, 0.5, 8, 12, [2.75, 0.75, 4]],
      [2, 0.08, 0.01, 0.5, 8, 12, [3.5, 4, 4.25]],
    ] as const;
    for (const [r, h, rise, f, slabs, length, [x, y, z]] of cases) {
      const segs = Float64Array.from([x, y, z, r, x, y + length, z + rise * length, r]);
      const { jobs, ...plan } = planPrimitives(
        [{ type: SWC_BASAL, beta: 0.5, segs }],
        { voxel: h, simplifyMesh: f * h },
        [0, 0, 0],
        {
          maxSlabs: slabs,
          bandVoxelsPerSlab: 0,
          axis: 0,
        }
      );
      const res = mergeSlabs(
        { ...plan, points: 0, rawPoints: 0 },
        jobs.map((job) => meshSlab(job))
      );
      expect(res.stats.slabs).toBe(slabs);
      const chk = checkMesh(res.positions, res.indices);
      expect(chk.closed).toBe(true);
      expect(chk.nonManifoldEdges, `voxel ${h}, ${slabs} slabs`).toBe(0);
      expect(res.stats.nonManifoldEdges).toBe(0);
      expect(flatTriangles(res.positions, res.indices)).toBe(0);
    }
  });
});
