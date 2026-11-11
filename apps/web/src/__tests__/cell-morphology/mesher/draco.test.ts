// @vitest-environment node
import { NodeIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { beforeAll, describe, expect, it } from 'vitest';

import {
  buildHybrid,
  type HybridParams,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/hybrid';
import {
  type MeshResult,
  simplifierReady,
} from '@/features/entities/cell-morphology/morpho-viewer/engine/mesher';
import { parseSwc } from '@/features/entities/cell-morphology/morpho-viewer/engine/swc';
import { UNTANGLE_VOXELS } from '@/features/entities/cell-morphology/morpho-viewer/engine/untangle';
import {
  type ExportMesh,
  encodeGlb,
  glbJson,
  meshExtent,
  POSITION_STEP_VOXELS,
  positionBits,
} from '@/features/entities/cell-morphology/morpho-viewer/export/glb';

import { checkMesh, SAMPLE_CELL_TIMEOUT, sampleSwc, TETRAHEDRON } from './mesh-utils';

describe('positionBits', () => {
  it('takes the fewest bits for a step within 1/32 voxel', () => {
    for (const [extent, voxel] of [
      [1125, 0.1],
      [8595, 0.1],
      [300, 2],
      [20, 0.056],
      [12000, 0.3],
    ]) {
      const bits = positionBits(extent, voxel);
      expect(extent / (2 ** bits - 1)).toBeLessThanOrEqual(POSITION_STEP_VOXELS * voxel);
      expect(extent / (2 ** (bits - 1) - 1)).toBeGreaterThan(POSITION_STEP_VOXELS * voxel);
    }
    // The sample cell and the projection neuron at the default voxel.
    expect(positionBits(1125, 0.1)).toBe(19);
    expect(positionBits(8595, 0.1)).toBe(22);
  });

  it('stays within what Draco takes', () => {
    expect(positionBits(0, 0.1)).toBe(1);
    expect(positionBits(1e9, 1e-6)).toBe(30);
  });
});

/** Triangles with no area, and triangles whose face normal points against the sum of their vertex normals. */
function faceStats(positions: Float32Array, normals: Float32Array, indices: Uint32Array) {
  let degenerate = 0,
    inverted = 0;
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
    const fx = uy * vz - uz * vy,
      fy = uz * vx - ux * vz,
      fz = ux * vy - uy * vx;
    if (fx === 0 && fy === 0 && fz === 0) {
      degenerate++;
      continue;
    }
    let d = 0;
    for (const v of [a, b, c]) d += fx * normals[v] + fy * normals[v + 1] + fz * normals[v + 2];
    if (d < 0) inverted++;
  }
  return { degenerate, inverted };
}

/** Nearest vertex of `positions` to a point, looked up in a hash grid of cells of edge `cell`. */
function nearestVertex(
  positions: Float32Array,
  cell: number
): (x: number, y: number, z: number) => number {
  const key = (i: number, j: number, k: number) => (i * 73856093) ^ (j * 19349663) ^ (k * 83492791);
  const grid = new Map<number, number[]>();
  for (let v = 0; v < positions.length / 3; v++) {
    const k = key(
      Math.floor(positions[3 * v] / cell),
      Math.floor(positions[3 * v + 1] / cell),
      Math.floor(positions[3 * v + 2] / cell)
    );
    const list = grid.get(k) ?? [];
    list.push(v);
    grid.set(k, list);
  }
  return (x, y, z) => {
    const i = Math.floor(x / cell),
      j = Math.floor(y / cell),
      k = Math.floor(z / cell);
    let best = -1,
      bestDistance = Infinity;
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        for (let dk = -1; dk <= 1; dk++) {
          for (const v of grid.get(key(i + di, j + dj, k + dk)) ?? []) {
            const d = Math.hypot(
              positions[3 * v] - x,
              positions[3 * v + 1] - y,
              positions[3 * v + 2] - z
            );
            if (d < bestDistance) {
              bestDistance = d;
              best = v;
            }
          }
        }
      }
    }
    return best;
  };
}

describe('encodeGlb with Draco', () => {
  it('fails rather than write the mesh uncompressed', async () => {
    type Encoder = { EncodeToDracoBuffer(...args: unknown[]): number };
    const real = (await draco3d.createEncoderModule()) as {
      ExpertEncoder: new (mesh: unknown) => Encoder;
    };
    await expect(encodeGlb(TETRAHEDRON, real)).resolves.toBeInstanceOf(Uint8Array);
    // Draco gives up on what it cannot encode (31 position bits, say), and glTF-Transform then writes the mesh as it is.
    const failing = Object.assign(Object.create(real), {
      // biome-ignore lint/complexity/useArrowFunction: glTF-Transform calls it with new, as Draco's own
      ExpertEncoder: function (mesh: unknown) {
        const encoder = new real.ExpertEncoder(mesh);
        encoder.EncodeToDracoBuffer = () => 0;
        return encoder;
      },
    });
    await expect(encodeGlb(TETRAHEDRON, failing)).rejects.toThrow(/Draco encoder failed/);
  });
});

describe('encodeGlb with Draco on the sample cell', { timeout: SAMPLE_CELL_TIMEOUT }, () => {
  // The page's defaults but for a coarser voxel, no axon step and the bench's tube aspect of 8, so that the build stays quick.
  const voxel = 0.25;
  const params: HybridParams = {
    smoothing: 1,
    axonRadius: 'heavy',
    simplify: 0.5 * voxel,
    voxel,
    blend: 0.1,
    somaBlend: 1,
    minRadius: voxel,
    includeTypes: null,
    simplifyMesh: voxel,
    tubeAspect: 8,
    untangle: UNTANGLE_VOXELS * voxel,
  };
  // Distinct made-up colours for every type.
  const palette = Float32Array.from({ length: 256 * 3 }, (_, i) => ((i * 37) % 256) / 255);
  let mesh: MeshResult;
  let glb: Uint8Array;

  beforeAll(async () => {
    await simplifierReady;
    mesh = buildHybrid(parseSwc(sampleSwc()), params);
    const input: ExportMesh = {
      positions: mesh.positions,
      normals: mesh.normals,
      indices: mesh.indices,
      types: mesh.vertexTypes,
      palette,
      voxel,
    };
    glb = await encodeGlb(input, await draco3d.createEncoderModule());
  }, SAMPLE_CELL_TIMEOUT);

  it('writes a GLB that needs Draco, with the scene of the plain export', () => {
    expect(new TextDecoder().decode(glb.subarray(0, 4))).toBe('glTF');
    const json = glbJson(glb);
    expect(json.extensionsRequired).toEqual(['KHR_draco_mesh_compression']);
    expect(json.nodes).toEqual([{ name: 'morphology', mesh: 0 }]);
    expect(json.materials?.[0].pbrMetallicRoughness).toMatchObject({
      metallicFactor: 0,
      roughnessFactor: 0.6,
    });
    const raw = mesh.positions.byteLength * 3 + mesh.indices.byteLength;
    expect(glb.byteLength).toBeLessThan(raw / 8);
  });

  it('decodes to the same closed surface, within the grid step', async () => {
    const io = new NodeIO()
      .registerExtensions([KHRDracoMeshCompression])
      .registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
    const primitive = (await io.readBinary(glb)).getRoot().listMeshes()[0].listPrimitives()[0];
    const positions = primitive.getAttribute('POSITION')!.getArray() as Float32Array;
    const normals = primitive.getAttribute('NORMAL')!.getArray() as Float32Array;
    const colors = primitive.getAttribute('COLOR_0')!.getArray() as Float32Array;
    const indices = Uint32Array.from(primitive.getIndices()!.getArray()!);

    expect(positions.length).toBe(mesh.positions.length);
    expect(indices.length).toBe(mesh.indices.length);
    const before = checkMesh(mesh.positions, mesh.indices),
      after = checkMesh(positions, indices);
    expect(before.closed && before.manifold).toBe(true);
    expect(after.closed).toBe(true);
    expect(after.manifold).toBe(true);
    expect(Math.abs(after.area / before.area - 1)).toBeLessThan(1e-4);
    expect(Math.abs(after.volume / before.volume - 1)).toBeLessThan(1e-4);

    // Draco reorders the vertices; match each to the nearest original one.
    const extent = meshExtent(mesh.positions);
    const step = extent / (2 ** positionBits(extent, voxel) - 1);
    const nearest = nearestVertex(mesh.positions, step);
    let maxError = 0,
      maxAngle = 0,
      maxColor = 0;
    for (let v = 0; v < positions.length / 3; v++) {
      const x = positions[3 * v],
        y = positions[3 * v + 1],
        z = positions[3 * v + 2];
      const o = nearest(x, y, z);
      expect(o).toBeGreaterThanOrEqual(0);
      maxError = Math.max(
        maxError,
        Math.hypot(
          mesh.positions[3 * o] - x,
          mesh.positions[3 * o + 1] - y,
          mesh.positions[3 * o + 2] - z
        )
      );
      let dot = 0;
      for (let k = 0; k < 3; k++) dot += normals[3 * v + k] * mesh.normals[3 * o + k];
      maxAngle = Math.max(maxAngle, Math.acos(Math.min(1, dot)));
      for (let k = 0; k < 3; k++)
        maxColor = Math.max(
          maxColor,
          Math.abs(colors[3 * v + k] - palette[3 * mesh.vertexTypes[o] + k])
        );
    }
    // Half a step on each axis, and a little for float32.
    expect(maxError).toBeLessThanOrEqual((Math.sqrt(3) / 2) * step * 1.01);
    expect((maxAngle * 180) / Math.PI).toBeLessThan(0.5);
    expect(maxColor).toBeLessThanOrEqual(1 / 255);

    // No triangle collapses, and hardly any more turn against their shading normals, which would show as pinholes.
    const was = faceStats(mesh.positions, mesh.normals, mesh.indices),
      is = faceStats(positions, normals, indices);
    expect(is.degenerate).toBe(was.degenerate);
    expect(is.inverted).toBeLessThanOrEqual(was.inverted + 1e-4 * (indices.length / 3));
  });
});
