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
  it('simplifies to under its triangle target, with its error in µm, the same on the grid or in floats', () => {
    const errors = [true, false].map((onGrid) => {
      const { standIn } = makeStandIn(decoded(onGrid), MeshoptSimplifier, 10_000);
      expect(standIn.triangles).toBeLessThanOrEqual(10_000);
      expect(standIn.triangles).toBeGreaterThan(5_000);
      const used = standIn.chunks.reduce((n, c) => n + c.indices.length / 3, 0);
      expect(used).toBe(standIn.triangles);
      return standIn.errorUm;
    });
    // A torus 18 µm thick, at a tenth of its triangles: a fraction of a micron.
    for (const e of errors) {
      expect(e).toBeGreaterThan(0.01);
      expect(e).toBeLessThan(2);
    }
    // The grid's rounding moves the simplifier's cells a little, not the scale of its error.
    expect(errors[0] / errors[1]).toBeGreaterThan(0.8);
    expect(errors[0] / errors[1]).toBeLessThan(1.25);
  });

  it("keeps the grid's step, and no error, for a mesh already under the target", () => {
    const mesh = decoded(true);
    const { standIn } = makeStandIn(mesh, MeshoptSimplifier, 1_000_000);
    expect(standIn.errorUm).toBe(0);
    expect(standIn.triangles).toBe(mesh.indices.length / 3);
    expect(standIn.grid).toBe(mesh.grid);
    // The decoded mesh is left as it was: the stand-in's indices are its own.
    expect(mesh.indices[0]).toBe(0);
  });
});
