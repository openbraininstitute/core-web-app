/** Helpers to check mesh topology and geometry in tests, the cells and parameters they share, and to write small cells. */

import { readFileSync } from 'node:fs';

import * as THREE from 'three';
import { expect } from 'vitest';

import { SWC_BASAL } from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';

import type { HybridParams } from '@/features/entities/cell-morphology/morpho-viewer/engine/hybrid';
import type { MeshResult } from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher';
import type { ExportMesh } from '@/features/entities/cell-morphology/morpho-viewer/export/glb';

/** The bundled sample cell, as SWC text. */
export function sampleSwc(): string {
  return readFileSync(new URL('../fixtures/18864_05088.swc', import.meta.url), 'utf8');
}

/**
 * For a file of tests that mesh, set with `vi.setConfig`. CI runs the suite under coverage on a small runner, where a
 * mesh takes four to fifteen times as long as it does alone.
 */
export const MESH_TIMEOUT = 60_000;

/** For what meshes the sample cell: seconds alone, near a minute under coverage on CI. */
export const SAMPLE_CELL_TIMEOUT = 180_000;

/** Parameters for the small cells of the tests: the skeleton as it is, a voxel of 0.25 µm, blend 0.5, no mesh simplification. */
export const params = (over: Partial<HybridParams> = {}): HybridParams => ({
  smoothing: 0,
  axonRadius: 'same',
  simplify: 0,
  voxel: 0.25,
  blend: 0.5,
  somaBlend: 1,
  minRadius: 0,
  includeTypes: null,
  simplifyMesh: 0,
  ...over,
});

/** A tetrahedron to export: a soma vertex and three axon vertices, and made-up colours for every type. */
export const TETRAHEDRON: ExportMesh = {
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]),
  normals: new Float32Array([-1, -1, -1, 1, 0, 0, 0, 1, 0, 0, 0, 1]),
  indices: new Uint32Array([0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]),
  types: new Uint8Array([1, 2, 2, 2]),
  palette: Float32Array.from({ length: 256 * 3 }, (_, i) => ((i * 37) % 256) / 255),
  voxel: 0.1,
};

/** Soma with a forked dendrite and an axon. */
export const BRANCHED = `
  1 1 0 0 0 4 -1
  2 3 0 0 0 1 1
  3 3 10 0 0 1 2
  4 3 20 5 0 0.6 3
  5 3 20 -5 0 0.6 3
  6 3 30 8 0 0.4 4
  7 2 0 0 0 0.3 1
  8 2 -15 0 3 0.3 7
`;

/** The angle, in degrees, whose cosine this is. */
export const degrees = (cosine: number): number =>
  (Math.acos(Math.max(-1, Math.min(1, cosine))) * 180) / Math.PI;

export interface MeshCheck {
  /** No boundary edges and consistent winding: the surface is watertight. */
  closed: boolean;
  /** Every edge is shared by exactly two triangles. */
  manifold: boolean;
  /** Edges used by a single triangle (holes). */
  boundaryEdges: number;
  /** Edges used by exactly two triangles in the same direction (a winding flip). */
  flippedEdges: number;
  /** Edges shared by more than two triangles (pinches). */
  nonManifoldEdges: number;
  volume: number;
  area: number;
}

export function checkMesh(positions: Float32Array, indices: Uint32Array): MeshCheck {
  // Per undirected edge: [forward uses, backward uses].
  const edges = new Map<string, [number, number]>();
  let volume = 0;
  let area = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const tri = [indices[t], indices[t + 1], indices[t + 2]];
    for (let e = 0; e < 3; e++) {
      const a = tri[e],
        b = tri[(e + 1) % 3];
      const key = a < b ? `${a},${b}` : `${b},${a}`;
      let rec = edges.get(key);
      if (!rec) {
        rec = [0, 0];
        edges.set(key, rec);
      }
      rec[a < b ? 0 : 1]++;
    }
    const [a, b, c] = tri;
    const ax = positions[3 * a],
      ay = positions[3 * a + 1],
      az = positions[3 * a + 2];
    const bx = positions[3 * b],
      by = positions[3 * b + 1],
      bz = positions[3 * b + 2];
    const cx = positions[3 * c],
      cy = positions[3 * c + 1],
      cz = positions[3 * c + 2];
    // Signed volume of the tetrahedron with the origin.
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    const ux = bx - ax,
      uy = by - ay,
      uz = bz - az;
    const vx = cx - ax,
      vy = cy - ay,
      vz = cz - az;
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    area += Math.sqrt(nx * nx + ny * ny + nz * nz) / 2;
  }
  let boundaryEdges = 0,
    flippedEdges = 0,
    nonManifoldEdges = 0;
  for (const [f, b] of edges.values()) {
    const n = f + b;
    if (n === 1) boundaryEdges++;
    else if (n === 2 && f !== 1) flippedEdges++;
    else if (n > 2) nonManifoldEdges++;
  }
  return {
    closed: boundaryEdges === 0 && flippedEdges === 0,
    manifold: nonManifoldEdges === 0,
    boundaryEdges,
    flippedEdges,
    nonManifoldEdges,
    volume,
    area,
  };
}

/** Triangles without area: their three corners lie on a line. */
export function flatTriangles(positions: Float32Array, indices: Uint32Array): number {
  let flat = 0;
  for (let t = 0; t < indices.length; t += 3) {
    const a = 3 * indices[t],
      b = 3 * indices[t + 1],
      c = 3 * indices[t + 2];
    const ux = positions[b] - positions[a],
      uy = positions[b + 1] - positions[a + 1],
      uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a],
      vy = positions[c + 1] - positions[a + 1],
      vz = positions[c + 2] - positions[a + 2];
    if (uy * vz - uz * vy === 0 && uz * vx - ux * vz === 0 && ux * vy - uy * vx === 0) flat++;
  }
  return flat;
}

export function radialStats(
  positions: Float32Array,
  axis: [number, number, number],
  origin: [number, number, number]
) {
  // Distance of each vertex from an infinite line (for capsule/cylinder checks).
  const [ux, uy, uz] = axis;
  let min = Infinity,
    max = -Infinity,
    sum = 0;
  const n = positions.length / 3;
  for (let i = 0; i < n; i++) {
    const px = positions[3 * i] - origin[0],
      py = positions[3 * i + 1] - origin[1],
      pz = positions[3 * i + 2] - origin[2];
    const t = px * ux + py * uy + pz * uz;
    const dx = px - ux * t,
      dy = py - uy * t,
      dz = pz - uz * t;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < min) min = d;
    if (d > max) max = d;
    sum += d;
  }
  return { min, max, mean: sum / n };
}

/**
 * Triangles as position/type tuples, each rotated to start at its smallest
 * vertex (keeping the winding) and sorted, so two meshes compare equal
 * regardless of vertex and triangle order.
 */
export function canonicalTriangles(
  positions: Float32Array,
  indices: Uint32Array,
  types: Uint8Array
): string[] {
  const keys: string[] = [];
  for (let v = 0; v < types.length; v++) {
    keys.push(`${positions[3 * v]},${positions[3 * v + 1]},${positions[3 * v + 2]},${types[v]}`);
  }
  const out: string[] = [];
  for (let t = 0; t < indices.length; t += 3) {
    const k = [keys[indices[t]], keys[indices[t + 1]], keys[indices[t + 2]]];
    let r = 0;
    if (k[1] < k[r]) r = 1;
    if (k[2] < k[r]) r = 2;
    out.push(`${k[r]}|${k[(r + 1) % 3]}|${k[(r + 2) % 3]}`);
  }
  return out.sort();
}

/** Number of connected components of the triangle mesh (by shared vertex indices). */
export function connectedComponents(vertexCount: number, indices: Uint32Array): number {
  const parent = new Int32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) parent[i] = i;
  const find = (a: number): number => {
    let root = a;
    while (parent[root] !== root) {
      parent[root] = parent[parent[root]];
      root = parent[root];
    }
    return root;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let t = 0; t < indices.length; t += 3) {
    union(indices[t], indices[t + 1]);
    union(indices[t], indices[t + 2]);
  }
  let n = 0;
  for (let i = 0; i < vertexCount; i++) if (find(i) === i) n++;
  return n;
}

/** One closed, 2-manifold, connected surface, without open quads. */
export function expectWatertight(mesh: MeshResult): void {
  const c = checkMesh(mesh.positions, mesh.indices);
  expect(c.closed).toBe(true);
  expect(c.manifold).toBe(true);
  expect(connectedComponents(mesh.positions.length / 3, mesh.indices)).toBe(1);
  expect(mesh.stats.defects).toBe(0);
  expect(mesh.stats.nonManifoldEdges).toBe(0);
}

/**
 * An SWC with a single-point soma, of radius 6 at the origin unless `soma` says otherwise, and a stem along each axis
 * in turn: its first sample `d` µm out, of radius `r`, then `n` more samples every `step` µm along the same line.
 */
export function cell(
  stems: {
    d: number;
    r?: number;
    type?: number;
    dir?: [number, number, number];
    n?: number;
    step?: number;
  }[],
  soma = '1 1 0 0 0 6 -1'
): string {
  const lines = [soma];
  let id = 2;
  stems.forEach((s, k) => {
    const dir =
      s.dir ??
      ([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [-1, 0, 0],
        [0, -1, 0],
        [0, 0, -1],
      ][k % 6] as [number, number, number]);
    const r = s.r ?? 1,
      type = s.type ?? SWC_BASAL,
      n = s.n ?? 1,
      step = s.step ?? 20;
    const at = (t: number) => `${dir[0] * t} ${dir[1] * t} ${dir[2] * t}`;
    lines.push(`${id} ${type} ${at(s.d)} ${r} 1`);
    for (let i = 1; i <= n; i++)
      lines.push(`${id + i} ${type} ${at(s.d + i * step)} ${r} ${id + i - 1}`);
    id += n + 1;
  });
  return lines.join('\n');
}

export const screenUp = (orientation: THREE.Quaternion): THREE.Vector3 =>
  new THREE.Vector3(0, 1, 0).applyQuaternion(orientation);

export function expectClose(a: THREE.Vector3, b: THREE.Vector3): void {
  expect(a.distanceTo(b)).toBeLessThan(1e-6);
}
