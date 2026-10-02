// @vitest-environment node
import { MeshoptSimplifier } from 'meshoptimizer';
import { beforeAll, describe, expect, it } from 'vitest';

import { makeStandIn } from '@/features/entities/em-cell-mesh/viewer/engine/stand-in';

import { torus } from './mesh-fixtures';

import type { DecodedMesh } from '@/features/entities/em-cell-mesh/viewer/engine/types';

beforeAll(async () => {
  await MeshoptSimplifier.ready;
});

function decoded(onGrid: boolean): DecodedMesh {
  const { positions, indices } = torus(300, 150, { centre: [0, 0, 0] });
  const microns = positions.map((v) => v / 1000);
  const bounds = {
    min: [-49, -49, -9] as [number, number, number],
    max: [49, 49, 9] as [number, number, number],
  };
  if (!onGrid) return { positions: microns, grid: null, indices, bounds, dracoBits: null };
  const grid = { origin: bounds.min, step: 98 / 65535 };
  const values = new Uint16Array(microns.length);
  for (let i = 0; i < values.length; i++) {
    values[i] = Math.round((microns[i] - grid.origin[i % 3]) / grid.step);
  }
  return { positions: values, grid, indices, bounds, dracoBits: 16 };
}

describe('makeStandIn', () => {
  it('clusters a mesh on a grid on cubes of about half a micron, its error the farthest a vertex moved', () => {
    const mesh = decoded(true);
    const { standIn } = makeStandIn(mesh, MeshoptSimplifier, 50_000);
    expect(standIn.triangles).toBeLessThanOrEqual(50_000);
    expect(standIn.triangles).toBeGreaterThan(5_000);
    expect(standIn.grid).toBe(mesh.grid);
    const used = standIn.chunks.reduce((n, c) => n + c.indices.length / 3, 0);
    expect(used).toBe(standIn.triangles);
    // Cubes of 2^8 steps of 1.5 nm, 0.38 µm: no vertex moves past a cube's diagonal.
    expect(standIn.errorUm).toBeGreaterThan(0.05);
    expect(standIn.errorUm).toBeLessThan(Math.sqrt(3) * 0.4);
  });

  it('clusters on larger cubes until the stand-in is under its target', () => {
    const fine = makeStandIn(decoded(true), MeshoptSimplifier, 50_000).standIn;
    const coarse = makeStandIn(decoded(true), MeshoptSimplifier, 5_000).standIn;
    expect(coarse.triangles).toBeLessThanOrEqual(5_000);
    expect(coarse.errorUm).toBeGreaterThan(fine.errorUm);
  });

  it('simplifies float positions with meshoptimizer, under its target, with its error in µm', () => {
    const { standIn } = makeStandIn(decoded(false), MeshoptSimplifier, 10_000);
    expect(standIn.triangles).toBeLessThanOrEqual(10_000);
    expect(standIn.triangles).toBeGreaterThan(5_000);
    // A torus 18 µm thick, at a tenth of its triangles: a fraction of a micron.
    expect(standIn.errorUm).toBeGreaterThan(0.01);
    expect(standIn.errorUm).toBeLessThan(2);
  });

  it("keeps the grid's step, and no error, for a mesh already under the target", () => {
    const mesh = decoded(true);
    const { standIn } = makeStandIn(mesh, MeshoptSimplifier, 1_000_000);
    expect(standIn.errorUm).toBe(0);
    expect(standIn.triangles).toBe(mesh.indices.length / 3);
    expect(standIn.grid).toBe(mesh.grid);
    // The decoded mesh is left as it was.
    expect(mesh.indices[0]).toBe(0);
  });
});
