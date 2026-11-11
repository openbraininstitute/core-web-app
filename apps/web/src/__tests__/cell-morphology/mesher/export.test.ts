// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { encodeGlb, glbJson } from '@/features/entities/cell-morphology/morpho-viewer/export/glb';
import { encodeStl } from '@/features/entities/cell-morphology/morpho-viewer/export/stl';

import { TETRAHEDRON } from './mesh-utils';

describe('encodeGlb', () => {
  it('writes one node with normals, colours and a plain material, without Draco', async () => {
    const glb = await encodeGlb(TETRAHEDRON);
    expect(new TextDecoder().decode(glb.subarray(0, 4))).toBe('glTF');
    const json = glbJson(glb) as ReturnType<typeof glbJson> & {
      meshes: { primitives: { attributes: Record<string, number> }[] }[];
    };
    expect(json.extensionsRequired).toBeUndefined();
    expect(json.nodes).toEqual([expect.objectContaining({ name: 'morphology', mesh: 0 })]);
    expect(Object.keys(json.meshes[0].primitives[0].attributes).sort()).toEqual([
      'COLOR_0',
      'NORMAL',
      'POSITION',
    ]);
    expect(json.materials?.[0].pbrMetallicRoughness).toMatchObject({
      metallicFactor: 0,
      roughnessFactor: 0.6,
    });
  });
});

describe('encodeStl', () => {
  it('writes the triangles with their unit normals', () => {
    const stl = encodeStl(TETRAHEDRON.positions, TETRAHEDRON.indices);
    // An 80-byte header, the count, and 50 bytes a triangle.
    expect(stl.byteLength).toBe(84 + 50 * 4);
    const view = new DataView(stl.buffer);
    expect(view.getUint32(80, true)).toBe(4);
    // The first triangle, 0 2 1, lies in z = 0 and faces down.
    expect([0, 4, 8].map((o) => view.getFloat32(84 + o, true))).toEqual([0, 0, -1]);
    // Its second corner is vertex 2, at (0, 1, 0).
    expect([24, 28, 32].map((o) => view.getFloat32(84 + o, true))).toEqual([0, 1, 0]);
  });
});
