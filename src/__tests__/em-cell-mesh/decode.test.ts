// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';

import { decodeGlb, EM_UNIT_UM } from '@/features/entities/em-cell-mesh/viewer/engine/decode';
import {
  meshHeader,
  parseGlb,
  readGlbJson,
} from '@/features/entities/em-cell-mesh/viewer/engine/glb';

import { dracoDecoder, encodeGlb, octreeBlock, torus } from './mesh-fixtures';

import type { DracoModule } from '@/features/entities/em-cell-mesh/viewer/engine/decode';

const MESH = torus(60, 24);
let draco: DracoModule;

beforeAll(async () => {
  draco = await dracoDecoder();
});

/** Draco's own decode, dequantised, in the file's units: what the grid is checked against. */
function dracoFloats(glb: Uint8Array): Float32Array {
  const { json, bin } = parseGlb(glb);
  const ext = json.meshes?.[0].primitives[0].extensions?.KHR_draco_mesh_compression;
  const view = json.bufferViews?.[ext?.bufferView ?? -1];
  if (!ext || !view) throw new Error('not Draco');
  const data = new Int8Array(bin.buffer, bin.byteOffset + (view.byteOffset ?? 0), view.byteLength);
  const decoder = new draco.Decoder();
  const mesh = new draco.Mesh();
  decoder.DecodeArrayToMesh(data, data.byteLength, mesh);
  const attribute = decoder.GetAttributeByUniqueId(mesh, ext.attributes.POSITION);
  const values = new draco.DracoFloat32Array();
  decoder.GetAttributeFloatForAllPoints(mesh, attribute, values);
  const out = new Float32Array(values.size());
  for (let i = 0; i < out.length; i++) out[i] = values.GetValue(i);
  for (const o of [values, mesh, decoder]) draco.destroy(o);
  return out;
}

function centreOf(positions: Float32Array): number[] {
  return [0, 1, 2].map((k) => {
    let lo = Infinity,
      hi = -Infinity;
    for (let i = k; i < positions.length; i += 3) {
      lo = Math.min(lo, positions[i]);
      hi = Math.max(hi, positions[i]);
    }
    return (lo + hi) / 2;
  });
}

describe('GLB header', () => {
  it('counts the triangles and vertices from the JSON chunk alone, before the rest has arrived', async () => {
    const glb = await encodeGlb(MESH, 14);
    const jsonEnd = 20 + new DataView(glb.buffer, glb.byteOffset).getUint32(12, true);
    expect(readGlbJson(glb, jsonEnd - 1)).toBeNull();
    const json = readGlbJson(glb, jsonEnd);
    expect(json).not.toBeNull();
    const header = meshHeader(json ?? {});
    expect(header).toMatchObject({
      triangles: MESH.indices.length / 3,
      vertices: 60 * 24,
      draco: true,
    });
    expect(header.bounds?.min[2]).toBeCloseTo(81_000 - 9_000, 0);
  });

  it('refuses what is not a GLB', () => {
    expect(() => readGlbJson(new TextEncoder().encode('solid stl file, not a GLB'))).toThrow(
      'not a GLB'
    );
  });
});

describe('decodeGlb', () => {
  it("keeps Draco's grid where it fits 16 bits, matching Draco's own floats within a step", async () => {
    const glb = await encodeGlb(MESH, 14);
    const { mesh, dracoHeapBytes } = decodeGlb(glb, draco);
    expect(mesh.positions).toBeInstanceOf(Uint16Array);
    expect(mesh.dracoBits).toBe(14);
    expect(dracoHeapBytes).toBeGreaterThan(0);
    const grid = mesh.grid;
    if (!grid) throw new Error('no grid');
    const floats = dracoFloats(glb);
    const centre = centreOf(MESH.positions);
    let worst = 0;
    for (let i = 0; i < floats.length; i++) {
      const um = grid.origin[i % 3] + grid.step * mesh.positions[i];
      worst = Math.max(worst, Math.abs(um - (floats[i] - centre[i % 3]) * EM_UNIT_UM));
    }
    expect(worst).toBeLessThan(grid.step);
    // 14 bits across the torus's 98 µm.
    expect(grid.step).toBeCloseTo((98_000 * EM_UNIT_UM) / (2 ** 14 - 1), 4);
    expect(mesh.indices.length).toBe(MESH.indices.length);
  });

  it('recentres on the bounding box, in µm', async () => {
    const { mesh } = decodeGlb(await encodeGlb(MESH, 14), draco);
    for (let k = 0; k < 3; k++) {
      expect(mesh.bounds.min[k] + mesh.bounds.max[k]).toBeCloseTo(0, 6);
    }
    expect(mesh.bounds.max[0] - mesh.bounds.min[0]).toBeCloseTo(98, 2);
  });

  it('reads floats where the grid is finer than 16 bits', async () => {
    const { mesh } = decodeGlb(await encodeGlb(MESH, 20), draco);
    expect(mesh.positions).toBeInstanceOf(Float32Array);
    expect(mesh.grid).toBeNull();
    expect(mesh.dracoBits).toBe(20);
    expect(mesh.bounds.max[2]).toBeCloseTo(9, 2);
  });

  it('reads a plain GLB as it is, recentred in µm', async () => {
    const { mesh, dracoHeapBytes } = decodeGlb(await encodeGlb(MESH), null);
    expect(dracoHeapBytes).toBeNull();
    expect(mesh.dracoBits).toBeNull();
    expect(Array.from(mesh.indices)).toEqual(Array.from(MESH.indices));
    const centre = centreOf(MESH.positions);
    for (let i = 0; i < MESH.positions.length; i += 97) {
      expect(mesh.positions[i]).toBeCloseTo((MESH.positions[i] - centre[i % 3]) * EM_UNIT_UM, 4);
    }
  });

  it("reads the octree blocks, real files, on Draco's 14-bit grid", () => {
    for (const name of ['a', 'b'] as const) {
      const glb = octreeBlock(name);
      const { mesh } = decodeGlb(glb, draco);
      const header = meshHeader(readGlbJson(glb) ?? {});
      expect(mesh.positions).toBeInstanceOf(Uint16Array);
      expect(mesh.dracoBits).toBe(14);
      expect(mesh.indices.length / 3).toBe(header.triangles);
      expect(mesh.positions.length / 3).toBe(header.vertices);
    }
  });
});
