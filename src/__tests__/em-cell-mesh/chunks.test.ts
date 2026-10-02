// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  MAX_CHUNK_VERTICES,
  packMesh,
  splitChunks,
  unpackMesh,
} from '@/features/entities/em-cell-mesh/viewer/engine/chunks';
import { vertexNormals } from '@/features/viewer-3d/engine/normals';

import { torus } from './mesh-fixtures';

import type { Grid, PackedMesh } from '@/features/entities/em-cell-mesh/viewer/engine/types';

/** A torus as the decode worker hands it over: µm around its centre. */
function microns(rings: number, sides: number) {
  const { positions, indices } = torus(rings, sides, { centre: [0, 0, 0] });
  return { positions: positions.map((v) => v / 1000), indices };
}

/** The same torus on a 16-bit grid, as from Draco. */
function onGrid(rings: number, sides: number) {
  const { positions, indices } = microns(rings, sides);
  const grid: Grid = { origin: [-49, -49, -9], step: 98 / 65535 };
  const values = new Uint16Array(positions.length);
  for (let i = 0; i < values.length; i++) {
    values[i] = Math.round((positions[i] - grid.origin[i % 3]) / grid.step);
  }
  return { positions: values, indices, grid };
}

/** Each chunk vertex's grid value from the grid's origin, as a key. */
const keyOf = (mesh: PackedMesh, c: number, v: number) => {
  const { positions, origin } = mesh.chunks[c];
  return [0, 1, 2].map((k) => origin[k] + positions[4 * v + k]).join(',');
};

/** The triangles as sorted triples of their vertices' keys. */
function triangleKeys(keys: (t: number, k: number) => string, count: number): string[] {
  const out: string[] = [];
  for (let t = 0; t < count; t++)
    out.push(
      [0, 1, 2]
        .map((k) => keys(t, k))
        .sort()
        .join('|')
    );
  return out.sort();
}

function packedTriangles(mesh: PackedMesh): string[] {
  const all: string[] = [];
  mesh.chunks.forEach((chunk, c) => {
    const n = chunk.indices.length / 3;
    all.push(...triangleKeys((t, k) => keyOf(mesh, c, chunk.indices[3 * t + k]), n));
  });
  return all.sort();
}

describe('splitChunks', () => {
  it('puts every triangle in exactly one chunk, within both caps, leaving out those marked flat', () => {
    const { positions, indices } = microns(120, 60);
    const flat = new Uint8Array(indices.length / 3);
    flat[7] = flat[100] = 1;
    const { order, starts } = splitChunks(positions, indices, flat, 2000, 1200);
    expect(starts.length).toBeGreaterThan(8);
    expect(Array.from(order).sort((a, b) => a - b)).toEqual(
      Array.from({ length: indices.length / 3 }, (_, i) => i).filter((t) => !flat[t])
    );
    for (let c = 0; c + 1 < starts.length; c++) {
      expect(starts[c + 1] - starts[c]).toBeLessThanOrEqual(2000);
      const vertices = new Set<number>();
      for (let i = starts[c]; i < starts[c + 1]; i++) {
        for (let k = 0; k < 3; k++) vertices.add(indices[3 * order[i] + k]);
      }
      expect(vertices.size).toBeLessThanOrEqual(1200);
    }
  });
});

describe('packMesh', () => {
  const big = onGrid(400, 200);
  const packed = packMesh(big.positions, big.grid, big.indices).mesh;

  it('keeps every chunk under 65,535 vertices, so no index is the primitive restart', () => {
    expect(big.positions.length / 3).toBeGreaterThan(MAX_CHUNK_VERTICES);
    expect(packed.chunks.length).toBeGreaterThan(1);
    for (const chunk of packed.chunks) {
      expect(chunk.positions.length / 4).toBeLessThanOrEqual(MAX_CHUNK_VERTICES);
      expect(chunk.indices.reduce((a, b) => Math.max(a, b), 0)).toBeLessThan(65535);
    }
    expect(packed.triangles).toBe(big.indices.length / 3);
  });

  it("gives back the mesh's triangles, through each chunk's own vertices, on Draco's grid", () => {
    expect(packed.grid).toBe(big.grid);
    for (const chunk of packed.chunks) expect(chunk.origin).toEqual([0, 0, 0]);
    const original = triangleKeys((t, k) => {
      const v = 3 * big.indices[3 * t + k];
      return [0, 1, 2].map((a) => big.positions[v + a]).join(',');
    }, big.indices.length / 3);
    expect(packedTriangles(packed)).toEqual(original);
  });

  it('bounds each chunk, and duplicates only a few vertices on the borders', () => {
    for (const chunk of packed.chunks) {
      for (let i = 0; i < chunk.positions.length; i += 4) {
        for (let k = 0; k < 3; k++) {
          expect(chunk.positions[i + k]).toBeGreaterThanOrEqual(chunk.bounds[k]);
          expect(chunk.positions[i + k]).toBeLessThanOrEqual(chunk.bounds[k + 3]);
        }
      }
    }
    const ratio = packed.vertices / (big.positions.length / 3);
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(1.05);
    expect(packed.distinctVertices).toBe(big.positions.length / 3);
  });

  it('packs the area-weighted normals to within half a degree, the same in every chunk', () => {
    const exact = vertexNormals(big.positions, big.indices);
    const byKey = new Map<string, number>();
    for (let v = 0; v < big.positions.length / 3; v++) {
      byKey.set([0, 1, 2].map((k) => big.positions[3 * v + k]).join(','), v);
    }
    const seen = new Map<string, string>();
    let worst = 0;
    packed.chunks.forEach((chunk, c) => {
      for (let i = 0; i < chunk.positions.length / 4; i++) {
        const key = keyOf(packed, c, i);
        const v = byKey.get(key) as number;
        const n = [0, 1, 2].map((k) => chunk.normals[4 * i + k] / 127);
        const e = [0, 1, 2].map((k) => exact[3 * v + k]);
        const cos =
          (n[0] * e[0] + n[1] * e[1] + n[2] * e[2]) / (Math.hypot(...n) * Math.hypot(...e));
        worst = Math.max(worst, Math.acos(Math.min(1, cos)));
        const bytes = n.join(',');
        expect(seen.get(key) ?? bytes).toBe(bytes);
        seen.set(key, bytes);
      }
    });
    expect((worst * 180) / Math.PI).toBeLessThan(0.5);
  });

  it('puts float positions on one grid, with chunk origins on it, within half a step', () => {
    const small = microns(120, 60);
    const { mesh } = packMesh(small.positions, null, small.indices, {
      triangles: 4000,
      vertices: 2500,
    });
    const { origin, step } = mesh.grid;
    // Finer than 16 bits across the whole torus: the chunks have origins of their own.
    expect(98 / step).toBeGreaterThan(65535);
    expect(mesh.chunks.some((c) => c.origin.some((o) => o > 0))).toBe(true);
    const expected = (v: number) =>
      [0, 1, 2].map((k) => Math.round((small.positions[3 * v + k] - origin[k]) / step)).join(',');
    const original = triangleKeys(
      (t, k) => expected(small.indices[3 * t + k]),
      small.indices.length / 3
    );
    // Every copy of a vertex has the same value on the grid, so every triangle comes back.
    expect(packedTriangles(mesh)).toEqual(original);
    for (let v = 0; v < small.positions.length / 3; v++) {
      const q = expected(v).split(',').map(Number);
      for (let k = 0; k < 3; k++) {
        expect(Math.abs(origin[k] + step * q[k] - small.positions[3 * v + k])).toBeLessThanOrEqual(
          step / 2 + 1e-6
        );
      }
    }
  });

  it('drops the triangles without an area, which draw nothing, and their vertices with them', () => {
    const mesh = onGrid(120, 60);
    const n = mesh.positions.length / 3;
    const [x, y, z] = mesh.positions.subarray(0, 3);
    // A vertex on the same grid point as another, as Draco's rounding leaves them, and two in a line with it.
    const positions = new Uint16Array([...mesh.positions, x, y, z, x + 1, y, z, x + 2, y, z]);
    const flat = [0, n, 1, 0, 1, 1, 0, n + 1, n + 2];
    const indices = new Uint32Array([...mesh.indices, ...flat]);
    const packed = packMesh(positions, mesh.grid, indices).mesh;
    const clean = packMesh(mesh.positions, mesh.grid, mesh.indices.slice()).mesh;
    expect(packed.triangles).toBe(mesh.indices.length / 3);
    expect(packed.vertices).toBe(clean.vertices);
    // The vertices only flat triangles used are not counted.
    expect(packed.distinctVertices).toBe(n);
    expect(packedTriangles(packed)).toEqual(packedTriangles(clean));
  });
});

describe('unpackMesh', () => {
  /** The triangles as sorted triples of their corners' positions, rounded onto `grid`. */
  const onto = (grid: Grid, positions: ArrayLike<number>, indices: ArrayLike<number>) =>
    triangleKeys(
      (t, k) =>
        [0, 1, 2]
          .map((a) =>
            Math.round((positions[3 * indices[3 * t + k] + a] - grid.origin[a]) / grid.step)
          )
          .join(','),
      indices.length / 3
    );

  it("gives the chunks back as one mesh, on Draco's grid, with every triangle and the bounds in µm", () => {
    const big = onGrid(400, 200);
    const packed = packMesh(big.positions, big.grid, big.indices).mesh;
    expect(packed.chunks.length).toBeGreaterThan(1);
    const mesh = unpackMesh(packed);
    expect(mesh.grid).toBe(big.grid);
    expect(mesh.positions).toBeInstanceOf(Uint16Array);
    expect(mesh.positions.length / 3).toBe(packed.vertices);
    const zero: Grid = { origin: [0, 0, 0], step: 1 };
    expect(onto(zero, mesh.positions, mesh.indices)).toEqual(
      onto(zero, big.positions, big.indices)
    );
    for (let k = 0; k < 3; k++) {
      const values = big.positions.filter((_, i) => i % 3 === k);
      const um = (v: number) => big.grid.origin[k] + big.grid.step * v;
      expect(mesh.bounds.min[k]).toBeCloseTo(um(Math.min(...values)), 6);
      expect(mesh.bounds.max[k]).toBeCloseTo(um(Math.max(...values)), 6);
    }
  });

  it('gives them back in µm where the chunks have origins of their own', () => {
    const small = microns(120, 60);
    const packed = packMesh(small.positions, null, small.indices, {
      triangles: 4000,
      vertices: 2500,
    }).mesh;
    expect(packed.chunks.some((c) => c.origin.some((o) => o > 0))).toBe(true);
    const mesh = unpackMesh(packed);
    expect(mesh.grid).toBeNull();
    expect(mesh.positions).toBeInstanceOf(Float32Array);
    expect(onto(packed.grid, mesh.positions, mesh.indices)).toEqual(
      onto(packed.grid, small.positions, small.indices)
    );
  });
});
