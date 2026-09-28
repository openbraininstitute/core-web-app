// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';

import { flooredPath } from '@/features/entities/cell-morphology/morpho-viewer/engine/classify';
import { FieldSampler } from '@/features/entities/cell-morphology/morpho-viewer/engine/field';
import {
  buildHybrid,
  type HybridParams,
  hybridLayout,
  MAX_REFINE,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/hybrid';
import {
  buildMesh,
  type MeshResult,
  type Prim,
  planPrimitives,
  simplifierReady,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher';
import { prepareMorphology } from '@/features/entities/cell-morphology/morpho-viewer/engine/prepare';
import {
  type Morphology,
  parseSwc,
  SWC_AXON,
  SWC_BASAL,
  SWC_SOMA,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';
import {
  ringScale,
  SectionPath,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/tubes';

import {
  checkMesh,
  expectWatertight,
  SAMPLE_CELL_TIMEOUT,
  sampleSwc,
  params as testParams,
} from './mesh-utils';

/** A soma with an axon and a dendrite that forks well outside the soma's band; nothing thinner than the voxel. */
const BRANCHED = `
  1 1 0 0 0 4 -1
  2 3 0 0 0 1 1
  3 3 40 0 0 1 2
  4 3 70 8 0 0.6 3
  5 3 70 -8 0 0.6 3
  6 3 100 12 0 0.4 4
  7 2 0 0 0 0.3 1
  8 2 -45 0 3 0.3 7
`;

/** The same dendrite, and an axon of 0.1 µm that leaves the soma and forks far away from it. */
const THIN = `
  1 1 0 0 0 4 -1
  2 3 0 0 0 1 1
  3 3 40 0 0 1 2
  4 3 70 8 0 0.6 3
  5 3 70 -8 0 0.6 3
  6 2 0 0 0 0.1 1
  7 2 -60 0 0 0.1 6
  8 2 -90 10 0 0.1 7
  9 2 -90 -10 0 0.1 7
`;

const params = (over: Partial<HybridParams> = {}): HybridParams =>
  testParams({ simplifyMesh: 0.125, ...over });

beforeAll(() => simplifierReady);

/** The primitives with the radii that are meshed: the layout's paths. */
function meshedPrimitives(m: Morphology, p: HybridParams): Prim[] {
  const { prims, layout } = hybridLayout(prepareMorphology(m, p), p);
  return prims.map((P, i) => {
    const path = layout.paths[i];
    if (path === null || path.count < 2) return P;
    const segs: number[] = [];
    for (let k = 0; k + 1 < path.count; k++) segs.push(...path.points.subarray(4 * k, 4 * k + 8));
    return { ...P, segs: Float64Array.from(segs) };
  });
}

/**
 * Volume of the soma's sphere and the sections' cones as they are meshed: what overlaps counts twice, the soma's necks
 * and the fillets not at all.
 */
function skeletonVolume(m: Morphology, p: HybridParams): number {
  let volume = 0;
  for (const P of meshedPrimitives(m, p)) {
    const s = P.segs;
    if (P.type === SWC_SOMA) {
      volume += (4 / 3) * Math.PI * s[3] ** 3;
      continue;
    }
    for (let k = 0; k < s.length; k += 8) {
      const L = Math.hypot(s[k + 4] - s[k], s[k + 5] - s[k + 1], s[k + 6] - s[k + 2]);
      volume += (Math.PI * L * (s[k + 3] ** 2 + s[k + 3] * s[k + 7] + s[k + 7] ** 2)) / 3;
    }
  }
  return volume;
}

/**
 * Largest first-order distance of the triangles' edge midpoints and centroids from the sections' own surfaces, as a
 * share of what is allowed there, per index range. The sections are blended as finely as any patch blends them, so
 * that along a tube nothing but its own section counts.
 */
function deviation(
  m: Morphology,
  p: HybridParams,
  mesh: MeshResult,
  start: number,
  count: number
): number {
  const voxel = p.voxel / MAX_REFINE;
  const sampler = new FieldSampler(
    planPrimitives(meshedPrimitives(m, p), { voxel, simplifyMesh: 0, project: true }, [0, 0, 0], {
      maxSlabs: 1,
    }).jobs[0]
  );
  const P = mesh.positions,
    I = mesh.indices,
    C = mesh.center;
  let worst = 0;
  for (let t = start; t < start + count; t += 3) {
    const a = 3 * I[t],
      b = 3 * I[t + 1],
      c = 3 * I[t + 2];
    for (const [u, v, w] of [
      [0.5, 0.5, 0],
      [0, 0.5, 0.5],
      [0.5, 0, 0.5],
      [1 / 3, 1 / 3, 1 / 3],
    ]) {
      sampler.sample(
        u * P[a] + v * P[b] + w * P[c] + C[0],
        u * P[a + 1] + v * P[b + 1] + w * P[c + 1] + C[1],
        u * P[a + 2] + v * P[b + 2] + w * P[c + 2] + C[2]
      );
      const g = Math.hypot(sampler.gx, sampler.gy, sampler.gz);
      worst = Math.max(
        worst,
        Math.abs(sampler.value - 1) / g / Math.min(p.simplifyMesh, 0.5 * sampler.radius)
      );
    }
  }
  return worst;
}

describe('hybridLayout', () => {
  it('leaves the stretches between branch points to the tubes', () => {
    const m = parseSwc(BRANCHED);
    const p = params();
    const { layout } = hybridLayout(m, p);
    // The soma with the three sections leaving it, and the fork: two patches.
    expect(layout.patches).toHaveLength(2);
    expect(layout.patches.filter((q) => q.soma)).toHaveLength(1);
    // The trunk between them, the two branches and the axon.
    expect(layout.stretches.length).toBeGreaterThanOrEqual(4);
    expect(layout.plainLength).toBeGreaterThan(0.5 * layout.totalLength);
    expect(layout.plainLength).toBeLessThan(layout.totalLength);
    for (const f of layout.interfaces) {
      expect(f.patch).toBeLessThan(layout.patches.length);
      expect(Math.sign(f.sRing - f.sClip)).toBe(f.side);
      expect(Math.sign(f.sEnd - f.sClip)).toBe(f.side);
    }
    // Every open end of a stretch is some patch's interface, once.
    const used = layout.stretches
      .flatMap((s) => [s.startInterface, s.endInterface])
      .filter((i) => i >= 0)
      .sort((a, b) => a - b);
    expect(used).toEqual(layout.interfaces.map((_, i) => i));
    // Nothing here is thinner than a voxel: every patch has the voxel of the parameters, and no radius is raised.
    for (const patch of layout.patches) expect(patch.voxel).toBe(p.voxel);
    expect(layout.flooredLength).toBe(0);
  });

  it('gives a patch of thin fibres a voxel of their size, and keeps an expensive one coarse', () => {
    const m = parseSwc(THIN);
    const p = params();
    const { layout } = hybridLayout(m, p);
    const soma = layout.patches.find((q) => q.soma)!;
    const forks = layout.patches.filter((q) => !q.soma);
    expect(forks).toHaveLength(2);
    // The axon's fork: three fibres of 0.1 µm, at one voxel to the radius.
    expect(Math.min(...forks.map((q) => q.voxel))).toBeCloseTo(0.1, 6);
    // The dendrite's: nothing under a voxel.
    expect(Math.max(...forks.map((q) => q.voxel))).toBe(p.voxel);
    // The soma's patch would take 2.5³ times its voxels for the axon's sake. It gets some, and the axon is raised to
    // its floor inside it and comes down to 0.1 µm along a ramp outside.
    expect(soma.voxel).toBeGreaterThan(0.1);
    expect(soma.voxel).toBeLessThanOrEqual(p.voxel);
    expect(layout.flooredLength).toBeGreaterThan(0);
    expect(layout.flooredLength).toBeLessThan(0.2 * layout.totalLength);
    const axon =
      layout.paths[
        layout.interfaces.find(
          (f) => f.patch === layout.patches.indexOf(soma) && layout.paths[f.prim]!.points[3] < 0.5
        )!.prim
      ]!;
    expect(axon.points[3]).toBeCloseTo(soma.voxel, 6);
    expect(axon.points[axon.points.length - 1]).toBeCloseTo(0.1, 6);
  });

  it("keeps the clip planes clear of the skeleton's bends", () => {
    // A stem of 0.5 µm that bends by 70° a few µm before it forks, where the fork's patch ends on it. One branch is
    // thin, so the patch's voxel is a quarter of the stem's radius, and a plane one voxel from the run's end would lie
    // where the segment beyond the bend comes through it.
    const a = (70 * Math.PI) / 180;
    for (let back = 2.5; back <= 4; back += 0.5) {
      const bx = 30 - back * Math.cos(a),
        by = -back * Math.sin(a);
      const m = parseSwc(`
        1 1 0 0 0 4 -1
        2 3 0 0 0 0.5 1
        3 3 ${bx - 20} ${by} 0 0.5 2
        4 3 ${bx} ${by} 0 0.5 3
        5 3 30 0 0 0.5 4
        6 3 45 9 0 0.5 5
        7 3 45 -9 0 0.12 5
      `);
      const p = params({ voxel: 0.5, simplifyMesh: 0.25 });
      const { layout } = hybridLayout(m, p);
      const dirA = new Float64Array(3),
        dirB = new Float64Array(3);
      let bends = 0;
      for (const f of layout.interfaces) {
        const path = layout.paths[f.prim]!;
        for (let k = 1; k + 1 < path.count; k++) {
          path.direction(k - 1, dirA);
          path.direction(k, dirB);
          const cos = dirA[0] * dirB[0] + dirA[1] * dirB[1] + dirA[2] * dirB[2];
          if (cos > 0.9) continue;
          bends++;
          expect(Math.abs(f.sClip - path.arc[k])).toBeGreaterThanOrEqual(path.points[4 * k + 3]);
        }
      }
      expect(bends).toBeGreaterThan(0);
      expectWatertight(buildHybrid(m, p));
    }
  });

  it('takes a patch as far as the arms of a hairpin touch', () => {
    // An axon that turns back by 130° and swells to three times its radius within two µm of the turn, as boutons of a
    // raw tracing do. The swelling holds the arm before the turn for some 1.5 µm, several radii of that arm, and the
    // plane at which the turn's patch is cut open has to lie where the arm is a tube of its own again.
    const turn = (130 * Math.PI) / 180;
    const back = (d: number): string => `${-43.5 - d * Math.cos(turn)} ${-d * Math.sin(turn)} 0`;
    const m = parseSwc(`
      1 1 0 0 0 4 -1
      2 2 0 0 0 0.3 1
      3 2 -30 0 0 0.3 2
      4 2 -40 0 0 0.06 3
      5 2 -43.5 0 0 0.35 4
      6 2 ${back(0.95)} 0.75 5
      7 2 ${back(1.6)} 1.09 6
      8 2 ${back(2.6)} 1 7
      9 2 ${back(3.7)} 0.7 8
      10 2 ${back(4.8)} 0.1 9
      11 2 ${back(25)} 0.1 10
    `);
    for (const voxel of [0.1, 0.158, 0.2]) {
      const p = params({ voxel, simplifyMesh: 0.5 * voxel });
      const { layout } = hybridLayout(m, p);
      const tmp = new Float64Array(4);
      let planes = 0;
      for (const f of layout.interfaces) {
        const path = layout.paths[f.prim]!;
        path.at(f.sClip, tmp);
        // The plane on the thin arm before the turn: its circle, in the plane across x, against the arm after the turn.
        if (!(tmp[0] < -30 && tmp[0] > -43.5 && Math.abs(tmp[1]) < 1e-9)) continue;
        planes++;
        const after = path.segmentAt(f.sClip) + 1;
        for (let a = 0; a < 32; a++) {
          const y = tmp[3] * Math.cos((a * Math.PI) / 16),
            z = tmp[3] * Math.sin((a * Math.PI) / 16);
          expect(path.distance(tmp[0], y, z, after, path.count - 2)).toBeGreaterThan(
            layout.patches[f.patch].voxel
          );
        }
      }
      expect(planes).toBe(1);
      expectWatertight(buildHybrid(m, p));
    }
  });
});

describe('flooredPath', () => {
  const path = new SectionPath(
    Float64Array.from([0, 0, 0, 0.1, 10, 0, 0, 0.1, 10, 10, 0, 0.3, 10, 20, 0, 0.1])
  );

  it('returns the path itself when no floor is above it', () => {
    expect(flooredPath(path, [{ s0: 2, s1: 5, floor: 0.1 }], 0.25).path).toBe(path);
    expect(flooredPath(path, [], 0.25).raised).toBe(0);
  });

  it('raises the radii in a zone and lets them come down along a ramp on either side', () => {
    const { path: out, raised } = flooredPath(path, [{ s0: 4, s1: 6, floor: 0.2 }], 0.25);
    const at = (s: number): number => {
      const t = new Float64Array(4);
      out.at(s, t);
      return t[3];
    };
    // Same axis, same arc lengths.
    expect(out.length).toBeCloseTo(path.length, 9);
    for (const s of [4, 5, 6]) expect(at(s)).toBeCloseTo(0.2, 9);
    // 0.1 µm at a slope of a quarter: 0.4 µm of ramp.
    expect(at(3.8)).toBeCloseTo(0.15, 9);
    expect(at(6.2)).toBeCloseTo(0.15, 9);
    for (const s of [0, 3.6, 3, 6.4, 8]) expect(at(s)).toBeCloseTo(0.1, 9);
    // Beyond the bend the radius is the traced one where that is larger.
    expect(at(20)).toBeCloseTo(0.3, 9);
    // The zone, and half of either ramp.
    expect(raised).toBeCloseTo(2.4, 6);
  });
});

describe('buildHybrid', () => {
  it("closes a branched cell with the skeleton's volume", () => {
    const m = parseSwc(BRANCHED);
    const p = params();
    const hyb = buildHybrid(m, p);
    const vox = buildMesh(m, p);
    expectWatertight(hyb);
    const c = checkMesh(hyb.positions, hyb.indices),
      v = checkMesh(vox.positions, vox.indices);
    expect(c.volume / v.volume).toBeGreaterThan(0.97);
    expect(c.volume / v.volume).toBeLessThan(1.03);
    expect(hyb.stats.hybrid!.tubes).toBeGreaterThanOrEqual(4);
    expect(hyb.stats.hybrid!.finestVoxel).toBe(p.voxel);
    expect(hyb.stats.triangles).toBeLessThan(vox.stats.triangles);
    // Types: the soma's, the dendrite's and the axon's, nothing else.
    expect([...new Set(hyb.vertexTypes)].sort()).toEqual([SWC_SOMA, SWC_AXON, SWC_BASAL]);
    // Unit normals throughout.
    for (let i = 0; i < hyb.normals.length; i += 3) {
      expect(Math.hypot(hyb.normals[i], hyb.normals[i + 1], hyb.normals[i + 2])).toBeCloseTo(1, 4);
    }
  });

  it('carries the radius of the closest section on every vertex, tubes, patches and cuts alike', () => {
    const m = parseSwc(BRANCHED);
    const hyb = buildHybrid(m, params());
    expect(hyb.radii).toHaveLength(hyb.vertexTypes.length);
    // The skeleton's radii run from the axon's 0.3 to the soma's, traced at 4 µm and raised to the 5 µm minimum, as
    // both stems start on its centre (soma.ts); the floor cannot raise any of them here.
    expect(m.somaStems.baseRadius).toBe(5);
    for (let v = 0; v < hyb.radii.length; v++) {
      expect(hyb.radii[v]).toBeGreaterThanOrEqual(0.3 - 1e-6);
      expect(hyb.radii[v]).toBeLessThanOrEqual(5 + 1e-6);
    }
    // Along the dendrite's lone stretch a tube vertex is a radius off the axis, and its radius is that section's.
    let checked = 0;
    for (let v = 0; v < hyb.radii.length; v++) {
      const x = hyb.positions[3 * v],
        y = hyb.positions[3 * v + 1],
        z = hyb.positions[3 * v + 2];
      if (hyb.vertexTypes[v] !== SWC_BASAL || x < 12 || x > 28) continue;
      expect(hyb.radii[v]).toBeCloseTo(1, 5);
      expect(Math.hypot(y, z)).toBeCloseTo(1, 1);
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("keeps tubes and collars within the tolerance of the sections' surfaces", () => {
    for (const swc of [BRANCHED, THIN]) {
      const m = parseSwc(swc);
      const p = params();
      const hyb = buildHybrid(m, p);
      const tubes = 3 * hyb.stats.hybrid!.tubeTriangles;
      expect(tubes).toBeGreaterThan(0);
      expect(deviation(m, p, hyb, 0, tubes)).toBeLessThanOrEqual(1.02);
      const collars = hyb.chunks[hyb.chunks.length - 1];
      expect(collars.indexCount).toBe(3 * hyb.stats.hybrid!.collarTriangles);
      expect(deviation(m, p, hyb, collars.indexStart, collars.indexCount)).toBeLessThanOrEqual(
        1.02
      );
    }
  });

  it('meshes fibres thinner than a voxel at their traced calibre', () => {
    const m = parseSwc(THIN);
    const p = params();
    const hyb = buildHybrid(m, p);
    expectWatertight(hyb);
    expect(hyb.stats.hybrid!.finestVoxel).toBeCloseTo(0.1, 6);
    expect(hyb.stats.hybrid!.flooredFraction).toBeGreaterThan(0);
    // The axon between the soma's patch and its fork: a hexagon around 0.1 µm, not around a voxel of 0.25 µm.
    let min = Infinity,
      max = 0;
    for (let v = 0; v < hyb.vertexTypes.length; v++) {
      const x = hyb.positions[3 * v] + hyb.center[0];
      if (hyb.vertexTypes[v] !== SWC_AXON || x > -30 || x < -50) continue;
      const d = Math.hypot(
        hyb.positions[3 * v + 1] + hyb.center[1],
        hyb.positions[3 * v + 2] + hyb.center[2]
      );
      min = Math.min(min, d);
      max = Math.max(max, d);
    }
    expect(min).toBeCloseTo(0.1 * ringScale(6), 4);
    expect(max).toBeCloseTo(0.1 * ringScale(6), 4);
    // Where it leaves the soma's patch it is as thick as that patch's grid can hold.
    const soma = hybridLayout(m, p).layout.patches.find((q) => q.soma)!;
    let widest = 0;
    for (let v = 0; v < hyb.vertexTypes.length; v++) {
      const x = hyb.positions[3 * v] + hyb.center[0];
      if (hyb.vertexTypes[v] === SWC_AXON && x < -13 && x > -50)
        widest = Math.max(
          widest,
          Math.hypot(
            hyb.positions[3 * v + 1] + hyb.center[1],
            hyb.positions[3 * v + 2] + hyb.center[2]
          )
        );
    }
    expect(widest).toBeGreaterThan(0.9 * soma.voxel);
    expect(widest).toBeLessThan(1.2 * soma.voxel);
    // The volume of the voxel mesh at half the voxel, whose floor of 0.125 µm is next to the axon's 0.1, and not that of
    // the voxel mesh at this voxel, which holds the axon at 0.25 µm and has 1.4 % more.
    const c = checkMesh(hyb.positions, hyb.indices);
    const fine = buildMesh(m, params({ voxel: p.voxel / 2 })),
      coarse = buildMesh(m, p);
    const ratio = c.volume / checkMesh(fine.positions, fine.indices).volume;
    expect(ratio).toBeGreaterThan(0.99);
    expect(ratio).toBeLessThan(1.01);
    expect(checkMesh(coarse.positions, coarse.indices).volume / c.volume).toBeGreaterThan(1.01);
  });

  it("counts the radius floor in each patch's own voxels", () => {
    const m = parseSwc(THIN);
    // Two voxels to a radius: the fork's patch would need 0.05 µm, gets the finest voxel there is, and holds 0.125 µm.
    const p = params({ minRadius: 0.5 });
    const hyb = buildHybrid(m, p);
    expectWatertight(hyb);
    expect(hyb.stats.hybrid!.finestVoxel).toBeCloseTo(p.voxel / MAX_REFINE, 6);
  });

  it('cuts a coarse patch open where a vertex of its stub dips across the clip plane', () => {
    // Three points of the sample cell's axon, 0.13 µm in radius, around a bend of 100°, at a voxel of 0.1 µm and mesh
    // simplify from 0.6 voxels on, which lets the patch be off by nearly half the radius (the most it may). The bend's
    // patch keeps a few long triangles, and a vertex of the stub after the bend lies just short of the plane among
    // vertices beyond it: the triangles around it meet the plane in a small curve that comes nearer the axis than the
    // cut, by a nanometre. The soma is only there to put the mesh's centre where the sample cell has it: the patch is
    // simplified in float32 coordinates about the centre, and about the axon's own centre it comes out otherwise.
    const m = parseSwc(`
      1 1 0 0 0 0.3 -1
      2 2 -71.903 -13.788 26.249 0.129 -1
      3 2 -73.569 -13.622 26.045 0.124 2
      4 2 -72.042 -22.116 20.26 0.28 3
    `);
    for (const f of [0.6, 1]) {
      const hyb = buildHybrid(m, params({ voxel: 0.1, blend: 0.1, simplifyMesh: f * 0.1 }));
      const c = checkMesh(hyb.positions, hyb.indices);
      expect(c.closed).toBe(true);
      expect(c.manifold).toBe(true);
      expect(hyb.stats.defects).toBe(0);
      expect(hyb.stats.hybrid!.interfaces).toBe(2);
    }
  });

  it('sweeps a lone section without any voxels', () => {
    const m = parseSwc('1 3 0 0 0 0.5 -1\n2 3 8 1 0 0.5 1\n3 3 16 0 2 0.4 2\n4 3 24 -1 3 0.4 3');
    const hyb = buildHybrid(m, params());
    const c = checkMesh(hyb.positions, hyb.indices);
    expect(c.closed).toBe(true);
    expect(c.manifold).toBe(true);
    expect(hyb.stats.hybrid!.patches).toBe(0);
    expect(hyb.stats.hybrid!.tubes).toBe(1);
    expect(hyb.stats.blocks).toBe(0);
  });

  it('meshes a lone sphere and a soma without neurites as patches', () => {
    for (const swc of ['1 1 0 0 0 3 -1', '1 3 1 1 1 0.8 -1', '1 3 1 1 1 0.1 -1']) {
      const hyb = buildHybrid(parseSwc(swc), params());
      const c = checkMesh(hyb.positions, hyb.indices);
      expect(c.closed).toBe(true);
      expect(hyb.stats.hybrid!.tubes).toBe(0);
      expect(hyb.stats.hybrid!.patches).toBe(1);
    }
  });

  describe('on the sample cell', { timeout: SAMPLE_CELL_TIMEOUT }, () => {
    const m = parseSwc(sampleSwc());
    const p = params({
      smoothing: 1,
      axonRadius: 'heavy',
      voxel: 0.5,
      simplify: 0.25,
      minRadius: 0.5,
      simplifyMesh: 0.25,
    });

    it('gives one closed surface at the traced calibre, with fewer triangles than the voxel mesh', () => {
      const hyb = buildHybrid(m, p);
      const vox = buildMesh(m, p);
      expectWatertight(hyb);
      expect(hyb.stats.hybrid!.plainFraction).toBeGreaterThan(0.75);
      expect(hyb.stats.hybrid!.finestVoxel).toBeCloseTo(p.voxel / MAX_REFINE, 6);
      expect(hyb.stats.hybrid!.flooredFraction).toBeLessThan(0.01);
      expect(hyb.stats.triangles).toBeLessThan(0.8 * vox.stats.triangles);
      // The voxel mesh holds no fibre under a voxel of 0.5 µm; most of this axon is a fifth of that.
      const c = checkMesh(hyb.positions, hyb.indices),
        v = checkMesh(vox.positions, vox.indices);
      const exact = skeletonVolume(m, p);
      expect(c.volume / exact).toBeGreaterThan(0.95);
      expect(c.volume / exact).toBeLessThan(1.02);
      expect(v.volume / exact).toBeGreaterThan(1.5);
      expect(deviation(m, p, hyb, 0, 3 * hyb.stats.hybrid!.tubeTriangles)).toBeLessThanOrEqual(
        1.02
      );
    });

    it('gives the same surface from batches and slabbed patches as from one batch', () => {
      const one = buildHybrid(m, p);
      const many = buildHybrid(m, p, { maxBatches: 6, maxSlabs: 6 });
      const c = checkMesh(many.positions, many.indices);
      expect(c.closed).toBe(true);
      expect(c.manifold).toBe(true);
      expect(many.stats.slabs).toBeGreaterThan(1);
      expect(many.stats.hybrid!.tubeTriangles).toBe(one.stats.hybrid!.tubeTriangles);
      expect(many.stats.hybrid!.collarTriangles).toBeGreaterThan(0);
      const a = checkMesh(one.positions, one.indices);
      expect(c.volume / a.volume).toBeGreaterThan(0.999);
      expect(c.volume / a.volume).toBeLessThan(1.001);
    });

    it('keeps the raw surface nets in the patches when the mesh is not simplified', () => {
      const raw = buildHybrid(m, { ...p, simplifyMesh: 0 });
      const c = checkMesh(raw.positions, raw.indices);
      expect(c.closed).toBe(true);
      expect(raw.stats.simplifyPasses).toBe(0);
    });
  });
});
