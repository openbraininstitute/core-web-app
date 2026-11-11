// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  aroundFor,
  bridgeLoops,
  jointError,
  jointFits,
  ringScale,
  SectionPath,
  TubeMesher,
  type TubeSpec,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/tubes';

import { checkMesh } from './mesh-utils';

const CENTER: [number, number, number] = [3, -2, 5];

function mesh(spec: TubeSpec, tolerance: number, maxAspect = 8) {
  const tubes = new TubeMesher(CENTER, { tolerance, maxAspect });
  const ends = tubes.add(spec);
  return { ends, ...tubes.mesh() };
}

/** Largest distance from the path's surface over the vertices, edge midpoints and centroids of the triangles. */
function deviation(
  points: Float64Array,
  positions: Float32Array,
  indices: Uint32Array
): { vertex: number; triangle: number } {
  const path = new SectionPath(points);
  const last = path.count - 2;
  const at = (x: number, y: number, z: number): number =>
    Math.abs(path.distance(x + CENTER[0], y + CENTER[1], z + CENTER[2], 0, last));
  let vertex = 0,
    triangle = 0;
  for (let v = 0; v < positions.length; v += 3)
    vertex = Math.max(vertex, at(positions[v], positions[v + 1], positions[v + 2]));
  for (let t = 0; t < indices.length; t += 3) {
    const a = 3 * indices[t],
      b = 3 * indices[t + 1],
      c = 3 * indices[t + 2];
    const P = positions;
    for (const [u, v, w] of [
      [0.5, 0.5, 0],
      [0, 0.5, 0.5],
      [0.5, 0, 0.5],
      [1 / 3, 1 / 3, 1 / 3],
    ]) {
      triangle = Math.max(
        triangle,
        at(
          u * P[a] + v * P[b] + w * P[c],
          u * P[a + 1] + v * P[b + 1] + w * P[c + 1],
          u * P[a + 2] + v * P[b + 2] + w * P[c + 2]
        )
      );
    }
  }
  return { vertex, triangle };
}

/** A helix with a radius that tapers and swells, sampled finely enough for gentle bends. */
function helix(): Float64Array {
  const pts: number[] = [];
  for (let i = 0; i <= 120; i++) {
    const a = i * 0.08;
    pts.push(12 * Math.cos(a), 12 * Math.sin(a), 1.5 * a, 0.6 + 0.35 * Math.sin(i * 0.11));
  }
  return Float64Array.from(pts);
}

describe('aroundFor', () => {
  it('keeps the chord error within the tolerance', () => {
    for (const r of [0.1, 0.4, 1, 3, 10]) {
      for (const tol of [0.01, 0.05, 0.2]) {
        const n = aroundFor(r, tol);
        expect(n % 2).toBe(0);
        if (n < 96) expect(r * (1 - Math.cos(Math.PI / n))).toBeLessThanOrEqual(tol);
      }
    }
    expect(aroundFor(0.2, 5)).toBe(6);
  });
});

describe('jointFits', () => {
  it('accepts gentle bends and tapers and rejects sharp ones on thick tubes', () => {
    expect(jointFits(jointError(1, Math.cos(0.05), 0), 0.1)).toBe(true);
    expect(jointFits(jointError(5, Math.cos(0.5), 0), 0.1)).toBe(false);
    expect(jointFits(jointError(1, 1, 0.1), 0.1)).toBe(true);
    expect(jointFits(jointError(4, 1, 0.4), 0.1)).toBe(false);
  });
});

describe('TubeMesher', () => {
  it("closes a straight capsule, facing outwards, with the capsule's volume", () => {
    const r = 1,
      L = 20;
    const points = Float64Array.from([0, 0, 0, r, L * 0.6, L * 0.8, 0, r]);
    const m = mesh({ points, s0: 0, s1: L, capStart: true, capEnd: true, type: 3 }, 0.002);
    const c = checkMesh(m.positions, m.indices);
    expect(c.closed).toBe(true);
    expect(c.manifold).toBe(true);
    const exact = Math.PI * r * r * L + (4 / 3) * Math.PI * r ** 3;
    expect(c.volume).toBeGreaterThan(0.98 * exact);
    expect(c.volume).toBeLessThan(exact);
    expect(m.ends.start).toBeNull();
    expect(m.ends.end).toBeNull();
  });

  it('stays within the tolerance on a curved, tapering path', () => {
    const points = helix();
    const path = new SectionPath(points);
    for (const tol of [0.02, 0.08]) {
      const m = mesh(
        { points, s0: 0, s1: path.length, capStart: true, capEnd: true, type: 3 },
        tol
      );
      const c = checkMesh(m.positions, m.indices);
      expect(c.closed).toBe(true);
      expect(c.manifold).toBe(true);
      expect(c.volume).toBeGreaterThan(0);
      // The vertices stand outside the surface by about as much as the chords pass inside it.
      const d = deviation(points, m.positions, m.indices);
      expect(d.vertex).toBeGreaterThan(0.1 * tol);
      expect(d.vertex).toBeLessThanOrEqual(0.55 * tol);
      expect(d.triangle).toBeLessThanOrEqual(tol);
    }
  });

  it("keeps most of a hexagonal tube's cross-section", () => {
    const r = 0.1,
      L = 40;
    const points = Float64Array.from([0, 0, 0, r, L, 0, 0, r]);
    const m = mesh({ points, s0: 0, s1: L, capStart: true, capEnd: true, type: 2 }, 0.05);
    expect(aroundFor(r, 0.05)).toBe(6);
    const c = checkMesh(m.positions, m.indices);
    expect(c.closed).toBe(true);
    // A hexagon through 2 r / (1 + cos 30°) has 95 % of the circle's area; inscribed, it has 83 %.
    const exact = Math.PI * r * r * L + (4 / 3) * Math.PI * r ** 3;
    expect(c.volume / exact).toBeGreaterThan(0.945);
    expect(c.volume / exact).toBeLessThan(0.955);
    // Between the caps, vertices and chords are off by the same 7 % of the radius, on either side (and by a few nm
    // of float32 rounding this far from the centre).
    const open = mesh({ points, s0: 1, s1: L - 1, capStart: false, capEnd: false, type: 2 }, 0.05);
    const d = deviation(points, open.positions, open.indices);
    expect(d.vertex).toBeCloseTo(r * (ringScale(6) - 1), 5);
    expect(d.triangle).toBeLessThanOrEqual(r * (ringScale(6) - 1) + 5e-6);
    expect(deviation(points, m.positions, m.indices).triangle).toBeLessThanOrEqual(0.05);
  });

  it('gives unit normals that point away from the axis', () => {
    const points = helix();
    const path = new SectionPath(points);
    const m = mesh({ points, s0: 0, s1: path.length, capStart: true, capEnd: true, type: 3 }, 0.05);
    const last = path.count - 2;
    for (let v = 0; v < m.positions.length; v += 3) {
      const nx = m.normals[v],
        ny = m.normals[v + 1],
        nz = m.normals[v + 2];
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 5);
      // A small step along the normal leaves the surface.
      const x = m.positions[v] + CENTER[0],
        y = m.positions[v + 1] + CENTER[1],
        z = m.positions[v + 2] + CENTER[2];
      expect(path.distance(x + 0.01 * nx, y + 0.01 * ny, z + 0.01 * nz, 0, last)).toBeGreaterThan(
        0.005
      );
    }
  });

  it('shades a ring at a skeleton point the same all the way round, and as the rings next to it', () => {
    // A straight, oblique cone of slope −0.02 with a skeleton point every 5 µm: gentle enough for a tube to pass them.
    const dir = [0.62, 0.71, 0.33].map((d) => d / Math.hypot(0.62, 0.71, 0.33));
    const pts: number[] = [];
    for (let i = 0; i <= 6; i++) pts.push(...dir.map((d) => 5 * i * d), 1 - 0.1 * i);
    const points = Float64Array.from(pts);
    const m = mesh({ points, s0: 2, s1: 28, capStart: false, capEnd: false, type: 3 }, 0.05, 2);
    const path = new SectionPath(points);
    const last = path.count - 2;
    // The hull's side leans towards the thin end by asin τ, the same at every vertex of the tube.
    let lowest = Infinity,
      highest = -Infinity,
      atPoints = 0;
    let fieldLowest = Infinity,
      fieldHighest = -Infinity;
    for (let v = 0; v < m.positions.length; v += 3) {
      const lean = m.normals[v] * dir[0] + m.normals[v + 1] * dir[1] + m.normals[v + 2] * dir[2];
      lowest = Math.min(lowest, lean);
      highest = Math.max(highest, lean);
      const p = [
        m.positions[v] + CENTER[0],
        m.positions[v + 1] + CENTER[1],
        m.positions[v + 2] + CENTER[2],
      ];
      const s = p[0] * dir[0] + p[1] * dir[1] + p[2] * dir[2];
      if (Math.abs(s / 5 - Math.round(s / 5)) > 1e-6) continue;
      atPoints++;
      // What `distance` leaves on the surface below such a vertex: the cone's normal or the sphere's, as rounding has it.
      const off = p.map((c, k) => c - s * dir[k]);
      const scale = (1 - 0.02 * s) / Math.hypot(off[0], off[1], off[2]);
      path.distance(
        s * dir[0] + scale * off[0],
        s * dir[1] + scale * off[1],
        s * dir[2] + scale * off[2],
        0,
        last
      );
      const fieldLean =
        (path.gx * dir[0] + path.gy * dir[1] + path.gz * dir[2]) /
        Math.hypot(path.gx, path.gy, path.gz);
      fieldLowest = Math.min(fieldLowest, fieldLean);
      fieldHighest = Math.max(fieldHighest, fieldLean);
    }
    expect(atPoints).toBeGreaterThan(4 * 6 - 1);
    expect(lowest).toBeCloseTo(0.02, 6);
    expect(highest).toBeCloseTo(0.02, 6);
    // `distance` has some vertices of such a ring lean with the cone and others not at all.
    expect(fieldHighest - fieldLowest).toBeGreaterThan(0.015);
  });

  it('leaves open rings at the ends of a stretch inside the path', () => {
    const points = helix();
    const path = new SectionPath(points);
    const m = mesh(
      {
        points,
        s0: 0.3 * path.length,
        s1: 0.7 * path.length,
        capStart: false,
        capEnd: false,
        type: 2,
      },
      0.05
    );
    const c = checkMesh(m.positions, m.indices);
    expect(m.ends.start).not.toBeNull();
    expect(m.ends.end).not.toBeNull();
    expect(c.boundaryEdges).toBe(m.ends.start!.count + m.ends.end!.count);
    expect(c.flippedEdges).toBe(0);
    expect(c.nonManifoldEdges).toBe(0);
    const d = deviation(points, m.positions, m.indices);
    expect(d.triangle).toBeLessThanOrEqual(0.05);
  });

  it('bounds the aspect ratio of the strips', () => {
    const r = 0.5,
      L = 100;
    const points = Float64Array.from([0, 0, 0, r, L, 0, 0, r]);
    const few = mesh({ points, s0: 0, s1: L, capStart: true, capEnd: true, type: 3 }, 0.05, 1000);
    const many = mesh({ points, s0: 0, s1: L, capStart: true, capEnd: true, type: 3 }, 0.05, 2);
    expect(many.indices.length).toBeGreaterThan(5 * few.indices.length);
    const n = aroundFor(r, 0.05);
    const edge = 2 * r * Math.sin(Math.PI / n);
    // Rings no farther apart than twice the edge around them.
    const rings = many.positions.length / 3 / n;
    expect(L / rings).toBeLessThanOrEqual(2 * edge * 1.05);
  });
});

describe('bridgeLoops', () => {
  it('joins loops of different sizes into a closed strip', () => {
    const positions: number[] = [];
    const loop = (n: number, z: number, phase: number) => {
      const first = positions.length / 3;
      const vertices: number[] = [],
        angles: number[] = [];
      for (let k = 0; k < n; k++) {
        const a = phase + (2 * Math.PI * k) / n;
        positions.push(Math.cos(a), Math.sin(a), z);
        vertices.push(first + k);
        angles.push(a);
      }
      return { vertices, angles };
    };
    for (const [m, n, phase] of [
      [6, 6, 0],
      [6, 11, 0.4],
      [17, 5, 2.9],
      [8, 8, 0.2],
    ]) {
      positions.length = 0;
      const a = loop(m, 0, 0.1),
        b = loop(n, 1, phase);
      const indices: number[] = [];
      bridgeLoops(a, b, indices);
      expect(indices.length / 3).toBe(m + n);
      const c = checkMesh(Float32Array.from(positions), Uint32Array.from(indices));
      expect(c.boundaryEdges).toBe(m + n);
      expect(c.flippedEdges).toBe(0);
      expect(c.nonManifoldEdges).toBe(0);
      // Facing outwards: every triangle's normal points away from the z axis.
      for (let t = 0; t < indices.length; t += 3) {
        const [i, j, k] = [3 * indices[t], 3 * indices[t + 1], 3 * indices[t + 2]];
        const ux = positions[j] - positions[i],
          uy = positions[j + 1] - positions[i + 1],
          uz = positions[j + 2] - positions[i + 2];
        const vx = positions[k] - positions[i],
          vy = positions[k + 1] - positions[i + 1],
          vz = positions[k + 2] - positions[i + 2];
        const nx = uy * vz - uz * vy,
          ny = uz * vx - ux * vz;
        const cx = (positions[i] + positions[j] + positions[k]) / 3,
          cy = (positions[i + 1] + positions[j + 1] + positions[k + 1]) / 3;
        expect(nx * cx + ny * cy).toBeGreaterThan(0);
      }
    }
  });
});

describe('TubeMesher radii', () => {
  it("gives every vertex the section's radius at its station, the caps' included", () => {
    const points = Float64Array.from([0, 0, 0, 0.8, 10, 0, 0, 0.8, 20, 0, 0, 0.4]);
    const tubes = new TubeMesher(CENTER, { tolerance: 0.02, maxAspect: 8 });
    tubes.add({ points, s0: 0, s1: 20, capStart: true, capEnd: true, type: 3 });
    const { positions, radii } = tubes.mesh();
    expect(radii).toHaveLength(tubes.vertexCount);
    for (let v = 0; v < tubes.vertexCount; v++) {
      const x = positions[3 * v] + CENTER[0];
      // The radius the polyline has at the vertex's arc length, which is x here: within a strip's length of the
      // station's, and the end's for a cap's vertices.
      const r = x <= 10 ? 0.8 : 0.8 - (0.4 * (x - 10)) / 10;
      expect(Math.abs(radii[v] - r)).toBeLessThan(0.12);
    }
  });
});
