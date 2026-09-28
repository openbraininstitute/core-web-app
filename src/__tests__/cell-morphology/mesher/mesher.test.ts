// @vitest-environment node
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  buildMesh,
  countNonManifoldEdges,
  type MeshResult,
  MIN_RADIUS_VOXELS,
  mergeSlabs,
  meshSlab,
  planMesh,
  simplifierReady,
  smoothVertexTypes,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher';
import {
  parseSwc,
  SWC_APICAL,
  SWC_BASAL,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';

import {
  BRANCHED,
  canonicalTriangles,
  checkMesh,
  connectedComponents,
  MESH_TIMEOUT,
  params,
  radialStats,
  sampleSwc,
} from './mesh-utils';

vi.setConfig({ testTimeout: MESH_TIMEOUT });

const sampleCell = () => parseSwc(sampleSwc());

/** Chunks partition the index buffer in order, and each chunk's box contains the vertices its triangles use. */
function expectChunksCover(res: MeshResult): void {
  let next = 0;
  let outside = 0;
  for (const c of res.chunks) {
    expect(c.indexStart).toBe(next);
    next += c.indexCount;
    for (let t = c.indexStart; t < c.indexStart + c.indexCount; t++) {
      const v = 3 * res.indices[t];
      for (let k = 0; k < 3; k++) {
        if (res.positions[v + k] < c.bounds[k] || res.positions[v + k] > c.bounds[3 + k]) outside++;
      }
    }
  }
  expect(next).toBe(res.indices.length);
  expect(outside).toBe(0);
}

/** Same triangles, vertex types and (up to rounding) normals, in any order. */
function expectSameMesh(a: MeshResult, b: MeshResult): void {
  expect(a.stats.vertices).toBe(b.stats.vertices);
  expect(a.stats.triangles).toBe(b.stats.triangles);
  const ta = canonicalTriangles(a.positions, a.indices, a.vertexTypes);
  const tb = canonicalTriangles(b.positions, b.indices, b.vertexTypes);
  expect(ta.findIndex((t, i) => t !== tb[i])).toBe(-1);

  const posKey = (p: Float32Array, v: number) => `${p[3 * v]},${p[3 * v + 1]},${p[3 * v + 2]}`;
  const inB = new Map<string, number>();
  for (let v = 0; v < b.stats.vertices; v++) {
    const k = posKey(b.positions, v);
    inB.set(k, inB.has(k) ? -1 : v);
  }
  let worst = 1;
  for (let v = 0; v < a.stats.vertices; v++) {
    const w = inB.get(posKey(a.positions, v)) ?? -1;
    if (w < 0) continue;
    const dot =
      a.normals[3 * v] * b.normals[3 * w] +
      a.normals[3 * v + 1] * b.normals[3 * w + 1] +
      a.normals[3 * v + 2] * b.normals[3 * w + 2];
    worst = Math.min(worst, dot);
  }
  expect(worst).toBeGreaterThan(0.9999);
}

describe('buildMesh', () => {
  it('meshes a lone sphere as a closed, outward-facing surface of the right size', () => {
    const r = 5;
    const m = parseSwc(`1 1 3.3 -2.1 7.9 ${r} -1`);
    const res = buildMesh(m, params({ voxel: 0.25 }));
    const chk = checkMesh(res.positions, res.indices);
    expect(res.stats.defects).toBe(0);
    expect(chk.closed).toBe(true);
    expect(chk.manifold).toBe(true);
    expect(chk.volume).toBeGreaterThan(0);
    expect(chk.volume).toBeCloseTo((4 / 3) * Math.PI * r ** 3, -1);
    expect(chk.area / (4 * Math.PI * r * r)).toBeCloseTo(1, 1);
    // All vertices lie close to the sphere (mesh is centred on the soma).
    for (let i = 0; i < res.positions.length; i += 3) {
      const d = Math.hypot(res.positions[i], res.positions[i + 1], res.positions[i + 2]);
      expect(Math.abs(d - r)).toBeLessThan(0.25);
      const n = res.normals;
      expect(Math.hypot(n[i], n[i + 1], n[i + 2])).toBeCloseTo(1, 4);
      expect(
        (n[i] * res.positions[i] +
          n[i + 1] * res.positions[i + 1] +
          n[i + 2] * res.positions[i + 2]) /
          d
      ).toBeGreaterThan(0.95);
    }
    expect(res.center).toEqual([3.3, -2.1, 7.9]);
    // Every vertex knows the radius of its section: the sphere's.
    expect(res.radii).toHaveLength(res.positions.length / 3);
    for (const x of res.radii) expect(x).toBeCloseTo(r, 5);
    // One chunk covering every triangle, with a box that holds every vertex.
    expect(res.chunks).toHaveLength(1);
    expect(res.chunks[0]).toMatchObject({ indexStart: 0, indexCount: res.indices.length });
    expectChunksCover(res);
  });

  it('meshes a straight capsule across block boundaries without seams', () => {
    // A single section from (0,0,0) to (37.3, 0, 0) with radius 1.5: long
    // enough to span several 8-cell blocks in x and straddle them in y/z.
    const m = parseSwc(`
      1 3 0.13 0.21 0.07 1.5 -1
      2 3 12 0.21 0.07 1.5 1
      3 3 25 0.21 0.07 1.5 2
      4 3 37.43 0.21 0.07 1.5 3
    `);
    const res = buildMesh(m, params({ voxel: 0.2 }));
    const chk = checkMesh(res.positions, res.indices);
    expect(res.stats.defects).toBe(0);
    expect(chk.closed).toBe(true);
    expect(chk.manifold).toBe(true);
    const L = 37.3,
      r = 1.5;
    const expected = Math.PI * r * r * L + (4 / 3) * Math.PI * r ** 3;
    expect(Math.abs(chk.volume - expected) / expected).toBeLessThan(0.05);
    // No beading at the interior joints: radius along the shaft stays flat.
    // Positions are relative to res.center (the bounding-box centre here).
    const ax = 0.13 - res.center[0];
    const shaft = new Float32Array(
      [...Array(res.positions.length / 3).keys()]
        .filter((i) => res.positions[3 * i] > ax + 2 && res.positions[3 * i] < ax + 35)
        .flatMap((i) => [res.positions[3 * i], res.positions[3 * i + 1], res.positions[3 * i + 2]])
    );
    const rs = radialStats(shaft, [1, 0, 0], [ax, 0.21 - res.center[1], 0.07 - res.center[2]]);
    expect(rs.min).toBeGreaterThan(r - 0.15);
    expect(rs.max).toBeLessThan(r + 0.15);
  });

  it('blends a branch and its parent into one closed surface', () => {
    const m = parseSwc(BRANCHED);
    const res = buildMesh(m, params({ voxel: 0.2 }));
    const chk = checkMesh(res.positions, res.indices);
    expect(res.stats.defects).toBe(0);
    expect(chk.closed).toBe(true);
    expect(chk.manifold).toBe(true);
    expect(chk.volume).toBeGreaterThan((4 / 3) * Math.PI * 64);
    // Vertex types cover the soma, dendrite and axon.
    const types = new Set(res.vertexTypes);
    expect(types).toEqual(new Set([1, 2, 3]));
  });

  it('honours the type filter and the minimum radius', () => {
    const m = parseSwc(`
      1 1 0 0 0 4 -1
      2 3 0 0 0 1 1
      3 3 10 0 0 1 2
      4 2 0 0 0 0.05 1
      5 2 -10 0 0 0.05 4
    `);
    const only = buildMesh(m, params({ voxel: 0.25, includeTypes: [3] }));
    expect(new Set(only.vertexTypes)).toEqual(new Set([1, 3]));

    const thin = buildMesh(m, params({ voxel: 0.25, includeTypes: [2], minRadius: 0.2 }));
    expect(thin.stats.defects).toBe(0);
    expect(checkMesh(thin.positions, thin.indices).closed).toBe(true);
    const axon = new Float32Array(
      [...Array(thin.positions.length / 3).keys()]
        .filter((i) => thin.positions[3 * i] < -6)
        .flatMap((i) => [
          thin.positions[3 * i],
          thin.positions[3 * i + 1],
          thin.positions[3 * i + 2],
        ])
    );
    expect(axon.length).toBeGreaterThan(0);
    expect(radialStats(axon, [1, 0, 0], [0, 0, 0]).mean).toBeGreaterThan(0.12);
  });

  it('keeps thin tubes connected in any orientation thanks to the radius floor', () => {
    let seed = 7;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const h = 0.4;
    const dirs: [number, number, number][] = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [1, 1, 0],
      [1, 0, 1],
      [1, 1, 1],
    ];
    while (dirs.length < 24) dirs.push([rnd() - 0.5, rnd() - 0.5, rnd() - 0.5]);
    for (const [dx0, dy0, dz0] of dirs) {
      const len = Math.hypot(dx0, dy0, dz0);
      const dx = dx0 / len,
        dy = dy0 / len,
        dz = dz0 / len;
      const ox = rnd() * h,
        oy = rnd() * h,
        oz = rnd() * h;
      // Radius far below the voxel: the floor must take over.
      const r = 0.2 * h;
      const swc = `1 2 ${ox} ${oy} ${oz} ${r} -1\n2 2 ${ox + dx * 30} ${oy + dy * 30} ${oz + dz * 30} ${r} 1`;
      const res = buildMesh(parseSwc(swc), params({ voxel: h, minRadius: 0 }));
      expect(res.stats.defects).toBe(0);
      expect(connectedComponents(res.positions.length / 3, res.indices)).toBe(1);
      // Surface nets shrink a one-voxel tube, so only sanity-check the calibre:
      // clearly fatter than the 0.2-voxel input, not wider than the floor allows.
      const rs = radialStats(
        res.positions,
        [dx, dy, dz],
        [ox - res.center[0], oy - res.center[1], oz - res.center[2]]
      );
      expect(rs.mean).toBeGreaterThan(MIN_RADIUS_VOXELS * h * 0.5);
      expect(rs.max).toBeLessThan(MIN_RADIUS_VOXELS * h * 2);
    }
  });

  it('meshes the dendrites of the sample cell into a closed surface', () => {
    const m = sampleCell();
    const res = buildMesh(
      m,
      params({ voxel: 0.5, minRadius: 0.35, includeTypes: [SWC_BASAL, SWC_APICAL] })
    );
    expect(res.stats.defects).toBe(0);
    const chk = checkMesh(res.positions, res.indices);
    expect(chk.closed).toBe(true);
    expect(chk.volume).toBeGreaterThan(0);
    expect(res.stats.triangles).toBeGreaterThan(10000);
  });
});

describe('slabs', () => {
  it.each([0, 1, 2])('cutting along axis %i reproduces the single-slab mesh', (axis) => {
    const m = parseSwc(BRANCHED);
    const one = buildMesh(m, params({ voxel: 0.2 }));
    expect(one.stats.slabs).toBe(1);
    // 64 slabs is more than there are block layers, so every layer becomes its own slab.
    for (const maxSlabs of [2, 3, 5, 64]) {
      const many = buildMesh(m, params({ voxel: 0.2 }), { maxSlabs, bandVoxelsPerSlab: 0, axis });
      expect(many.stats.slabs).toBeGreaterThan(1);
      expect(many.stats.defects).toBe(0);
      expect(checkMesh(many.positions, many.indices).closed).toBe(true);
      expectSameMesh(many, one);
    }
  });

  it('merges slab results that arrive out of order', () => {
    const m = parseSwc(BRANCHED);
    const plan = planMesh(m, params({ voxel: 0.2 }), { maxSlabs: 6, bandVoxelsPerSlab: 0 });
    expect(plan.slabs).toBe(6);
    const results = plan.jobs.map((job) => meshSlab(job));
    const merged = mergeSlabs(plan, [
      results[3],
      results[0],
      results[5],
      results[1],
      results[4],
      results[2],
    ]);
    expect(merged.stats.defects).toBe(0);
    expectSameMesh(merged, buildMesh(m, params({ voxel: 0.2 })));
  });

  it('splits the sample cell into balanced slabs that stitch seamlessly', () => {
    const m = sampleCell();
    const p = params({ voxel: 0.5, minRadius: 0.35, includeTypes: [SWC_BASAL, SWC_APICAL] });
    const one = buildMesh(m, p);
    const many = buildMesh(m, p, { maxSlabs: 12, bandVoxelsPerSlab: 0 });
    expect(many.stats.slabs).toBe(12);
    expect(many.stats.defects).toBe(0);
    expect(many.stats.blocks).toBe(one.stats.blocks);
    expectSameMesh(many, one);
    expect(many.chunks).toHaveLength(12);
    expectChunksCover(many);
  });

  it('keeps small meshes in one slab', () => {
    const m = parseSwc(BRANCHED);
    expect(buildMesh(m, params({ voxel: 0.5 }), { maxSlabs: 8 }).stats.slabs).toBe(1);
  });

  it('goes beyond maxSlabs to keep a slab under the band voxel limit', () => {
    const m = sampleCell();
    const p = params({ voxel: 0.5, minRadius: 0.35, includeTypes: [SWC_BASAL, SWC_APICAL] });
    const { bandVoxels } = planMesh(m, p, { maxSlabs: 1 });
    expect(planMesh(m, p, { maxSlabs: 2, bandVoxelsPerSlab: 0 }).slabs).toBe(2);
    expect(
      planMesh(m, p, { maxSlabs: 2, bandVoxelsPerSlab: 0, maxBandVoxelsPerSlab: bandVoxels / 5.5 })
        .slabs
    ).toBe(6);
  });
});

describe('countNonManifoldEdges', () => {
  it('counts the edges with more than two triangles', () => {
    // A tetrahedron, then two back-to-back triangles hanging off its edge 0-1, then a third pair on the same edge.
    const tetrahedron = [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3];
    expect(countNonManifoldEdges(Uint32Array.from(tetrahedron), 4)).toBe(0);
    const flap = [...tetrahedron, 0, 1, 4, 1, 0, 4];
    expect(countNonManifoldEdges(Uint32Array.from(flap), 5)).toBe(1);
    expect(countNonManifoldEdges(Uint32Array.from([...flap, 0, 1, 5, 1, 0, 5]), 6)).toBe(1);
  });

  it('is zero for the meshes the mesher makes', () => {
    const m = parseSwc(BRANCHED);
    expect(
      buildMesh(m, params({ voxel: 0.2, simplifyMesh: 0.1 }), { maxSlabs: 3, bandVoxelsPerSlab: 0 })
        .stats.nonManifoldEdges
    ).toBe(0);
  });
});

describe('smoothVertexTypes', () => {
  it('removes an isolated speckle but keeps a solid region', () => {
    // A fan of six triangles around vertex 0; the ring vertices 1..6 share type 3.
    const indices = Uint32Array.from([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 1]);
    const types = Uint8Array.from([1, 3, 3, 3, 3, 3, 3]);
    smoothVertexTypes(indices, types);
    expect([...types]).toEqual([3, 3, 3, 3, 3, 3, 3]);

    // A single odd ring vertex is outvoted by the centre and its two ring neighbours.
    const types2 = Uint8Array.from([3, 3, 3, 1, 3, 3, 3]);
    smoothVertexTypes(indices, types2);
    expect([...types2]).toEqual([3, 3, 3, 3, 3, 3, 3]);

    // A uniform mesh is left alone (single type short-circuits).
    const types3 = Uint8Array.from([2, 2, 2, 2, 2, 2, 2]);
    smoothVertexTypes(indices, types3);
    expect([...types3]).toEqual([2, 2, 2, 2, 2, 2, 2]);
  });

  it('breaks ties between neighbour types independently of vertex order', () => {
    // Vertex 0 (type 1) is surrounded by two type-2 and two type-3 vertices.
    const indices = Uint32Array.from([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
    const a = Uint8Array.from([1, 3, 3, 2, 2]);
    const b = Uint8Array.from([1, 2, 2, 3, 3]);
    smoothVertexTypes(indices, a, 1);
    smoothVertexTypes(indices, b, 1);
    expect(a[0]).toBe(2);
    expect(b[0]).toBe(2);
  });
});

describe('mesh simplification', () => {
  beforeAll(() => simplifierReady);

  it('keeps a sphere closed and on the surface while dropping most triangles', () => {
    const r = 5,
      h = 0.25;
    const m = parseSwc(`1 1 0 0 0 ${r} -1`);
    const raw = buildMesh(m, params({ voxel: h }));
    const res = buildMesh(m, params({ voxel: h, simplifyMesh: 0.5 * h }));
    expect(res.stats.defects).toBe(0);
    expect(res.stats.rawTriangles).toBe(raw.stats.triangles);
    expect(res.stats.triangles).toBeLessThan(0.4 * raw.stats.triangles);
    expect(res.stats.simplifyMs).toBeGreaterThan(0);
    const chk = checkMesh(res.positions, res.indices);
    expect(chk.closed).toBe(true);
    expect(chk.manifold).toBe(true);
    // Every vertex may move inward by up to the error bound, so the volume can shrink by about 3 × error / r.
    const rawVolume = checkMesh(raw.positions, raw.indices).volume;
    expect(Math.abs(chk.volume - rawVolume) / rawVolume).toBeLessThan((3 * 0.5 * h) / r);
    // Collapses keep surviving vertices where they were, so every vertex still sits on the raw surface.
    for (let i = 0; i < res.positions.length; i += 3) {
      const d = Math.hypot(res.positions[i], res.positions[i + 1], res.positions[i + 2]);
      expect(Math.abs(d - r)).toBeLessThan(h);
      const n = res.normals;
      expect(Math.hypot(n[i], n[i + 1], n[i + 2])).toBeCloseTo(1, 4);
      expect(
        (n[i] * res.positions[i] +
          n[i + 1] * res.positions[i + 1] +
          n[i + 2] * res.positions[i + 2]) /
          d
      ).toBeGreaterThan(0.95);
    }
    expectChunksCover(res);
  });

  it('stitches simplified slabs into one closed surface', () => {
    const m = parseSwc(BRANCHED);
    const h = 0.2;
    const one = buildMesh(m, params({ voxel: h, simplifyMesh: 0.5 * h }));
    const oneVolume = checkMesh(one.positions, one.indices).volume;
    for (const maxSlabs of [3, 64]) {
      const many = buildMesh(m, params({ voxel: h, simplifyMesh: 0.5 * h }), {
        maxSlabs,
        bandVoxelsPerSlab: 0,
      });
      expect(many.stats.slabs).toBeGreaterThan(1);
      expect(many.stats.defects).toBe(0);
      const chk = checkMesh(many.positions, many.indices);
      expect(chk.closed).toBe(true);
      expect(chk.manifold).toBe(true);
      expect(Math.abs(chk.volume - oneVolume) / oneVolume).toBeLessThan(0.05);
      // Locked seams keep a few more triangles than the single-slab run, but the bulk still goes.
      expect(many.stats.triangles).toBeLessThan(0.5 * many.stats.rawTriangles);
      expect(new Set(many.vertexTypes)).toEqual(new Set([1, 2, 3]));
      expect(many.chunks).toHaveLength(many.stats.slabs);
      expectChunksCover(many);
    }
  });

  it('simplifies the sample dendrites in slabs to a closed surface', () => {
    const m = sampleCell();
    const p = params({
      voxel: 0.5,
      minRadius: 0.35,
      includeTypes: [SWC_BASAL, SWC_APICAL],
      simplifyMesh: 0.25,
    });
    const res = buildMesh(m, p, { maxSlabs: 12, bandVoxelsPerSlab: 0 });
    expect(res.stats.slabs).toBe(12);
    expect(res.stats.defects).toBe(0);
    expect(checkMesh(res.positions, res.indices).closed).toBe(true);
    expect(res.stats.triangles).toBeLessThan(0.3 * res.stats.rawTriangles);
    expectChunksCover(res);
  });
});
