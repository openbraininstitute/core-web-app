// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  clusterOnGrid,
  clusterWithin,
} from '@/features/entities/em-cell-mesh/viewer/engine/cluster';

import { torus } from './mesh-fixtures';

/** A torus about the origin on a 16-bit grid of `step` µm. */
function onGrid(rings: number, sides: number, step: number) {
  const { positions, indices } = torus(rings, sides, { centre: [0, 0, 0] });
  const values = new Uint16Array(positions.length);
  for (let i = 0; i < values.length; i++) values[i] = Math.round((positions[i] / 1000 + 50) / step);
  return { positions: values, indices };
}

/** A triangle's normal, unnormalised. */
function normal(p: Uint16Array, a: number, b: number, c: number): number[] {
  const u = [0, 1, 2].map((k) => p[3 * b + k] - p[3 * a + k]);
  const v = [0, 1, 2].map((k) => p[3 * c + k] - p[3 * a + k]);
  return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
}

const mesh = onGrid(300, 150, 0.01);

describe('clusterOnGrid', () => {
  // Cubes of 0.64 µm, over vertices about 0.4 µm apart round the tube.
  const cube = 64;
  const clustered = clusterOnGrid(mesh.positions, mesh.indices, cube);
  const { positions, indices } = clustered;

  it('moves no vertex past its cube, and keeps fewer triangles', () => {
    expect(clustered.moved).toBeGreaterThan(0);
    expect(clustered.moved).toBeLessThanOrEqual(Math.sqrt(3) * cube);
    expect(indices.length).toBeLessThan(mesh.indices.length * 0.8);
    expect(indices.length).toBeGreaterThan(0);
    for (const i of indices) expect(i).toBeLessThan(positions.length / 3);
  });

  it('keeps each triangle once, with its three corners in three cubes', () => {
    const seen = new Set<string>();
    for (let t = 0; t < indices.length; t += 3) {
      const [a, b, c] = indices.subarray(t, t + 3);
      expect(a !== b && b !== c && a !== c).toBe(true);
      // Whichever corner it starts at.
      const k = [a, b, c].indexOf(Math.min(a, b, c));
      seen.add([0, 1, 2].map((i) => [a, b, c][(k + i) % 3]).join(','));
    }
    expect(seen.size).toBe(indices.length / 3);
  });

  it('keeps the winding: the triangles face the way they faced', () => {
    // The share of triangles facing away from the ring the torus is swept along, 40 µm round the grid's middle.
    const outward = (p: Uint16Array, tris: Uint32Array) => {
      const centre = 50 / 0.01;
      let out = 0;
      for (let t = 0; t < tris.length; t += 3) {
        const [a, b, c] = tris.subarray(t, t + 3);
        const n = normal(p, a, b, c);
        const m = [0, 1, 2].map((k) => (p[3 * a + k] + p[3 * b + k] + p[3 * c + k]) / 3 - centre);
        const r = Math.hypot(m[0], m[1]);
        const d = [m[0] - (m[0] / r) * 4000, m[1] - (m[1] / r) * 4000, m[2]];
        if (n[0] * d[0] + n[1] * d[1] + n[2] * d[2] > 0) out++;
      }
      return out / (tris.length / 3);
    };
    const before = outward(mesh.positions, mesh.indices);
    expect(Math.abs(before - 0.5)).toBeGreaterThan(0.49);
    expect(Math.abs(outward(positions, indices) - before)).toBeLessThan(0.01);
  });

  it('merges nothing on cubes of one step where no two vertices share a grid point', () => {
    const same = clusterOnGrid(mesh.positions, mesh.indices, 1);
    expect(same.moved).toBe(0);
    expect(same.indices.length).toBe(mesh.indices.length);
  });

  it('takes cubes of any size, leaving fewer triangles on larger ones', () => {
    const [finer, coarser] = [48, 80].map((c) => clusterOnGrid(mesh.positions, mesh.indices, c));
    expect(finer.indices.length).toBeGreaterThan(indices.length);
    expect(coarser.indices.length).toBeLessThan(indices.length);
    expect(coarser.moved).toBeLessThanOrEqual(Math.sqrt(3) * 80);
  });
});

describe('clusterWithin', () => {
  // From 3,000 down, the cubes sized by the area leave too many, and are made larger: each is a fair share of the tube.
  it.each([
    20_000, 3_000, 1_000,
  ])('clusters on cubes about as fine as keep within %i triangles', (target) => {
    const triangles = clusterWithin(mesh.positions, mesh.indices, target).indices.length / 3;
    expect(triangles).toBeLessThanOrEqual(target);
    // Cubes a fifth larger would leave about 0.7 of them.
    expect(triangles).toBeGreaterThan(0.7 * target);
  });
});
