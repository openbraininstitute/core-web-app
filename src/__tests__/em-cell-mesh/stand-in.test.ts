// @vitest-environment node
import { MeshoptSimplifier } from 'meshoptimizer';
import { beforeAll, describe, expect, it } from 'vitest';

import { packMesh, unpackMesh } from '@/features/entities/em-cell-mesh/viewer/engine/chunks';
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
  it('clusters a mesh on a grid on cubes as fine as its target allows, its error the farthest a vertex moved', () => {
    const mesh = decoded(true);
    const { standIn } = makeStandIn(mesh, MeshoptSimplifier, 30_000);
    expect(standIn.triangles).toBeLessThanOrEqual(30_000);
    expect(standIn.triangles).toBeGreaterThan(20_000);
    expect(standIn.grid).toBe(mesh.grid);
    const used = standIn.chunks.reduce((n, c) => n + c.indices.length / 3, 0);
    expect(used).toBe(standIn.triangles);
    // Vertices 0.4 to 0.8 µm apart, a third of them left: about as far as moves them.
    expect(standIn.errorUm).toBeGreaterThan(0.2);
    expect(standIn.errorUm).toBeLessThan(2);
  });

  it('makes about the same stand-in from the full mesh, chunked as its cache gives it back', () => {
    const mesh = decoded(true);
    const fromDecoded = makeStandIn(mesh, MeshoptSimplifier, 30_000).standIn;
    const full = packMesh(mesh.positions, mesh.grid, mesh.indices, {
      triangles: 4000,
      vertices: 2500,
    }).mesh;
    expect(full.chunks.length).toBeGreaterThan(10);
    const fromFull = makeStandIn(unpackMesh(full), MeshoptSimplifier, 30_000).standIn;
    expect(fromFull.grid).toBe(mesh.grid);
    expect(fromFull.triangles).toBeLessThanOrEqual(30_000);
    // The vertices on chunk borders, once in each chunk, weigh a little more in their cubes' means.
    expect(Math.abs(fromFull.triangles / fromDecoded.triangles - 1)).toBeLessThan(0.05);
    expect(Math.abs(fromFull.errorUm / fromDecoded.errorUm - 1)).toBeLessThan(0.1);
  });

  it('clusters a smaller stand-in on larger cubes', () => {
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
