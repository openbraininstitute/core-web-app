/** Meshes and GLBs for the EM mesh pipeline's tests, and Draco's modules in Node. */
import { readFileSync } from 'node:fs';

import { Document, WebIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

import type { DracoModule } from '@/features/entities/em-cell-mesh/viewer/engine/decode';

/**
 * A torus in nanometres, like an EM mesh: `rings` around the tube's axis and `sides` around the tube, every vertex
 * shared by six triangles, and twice as many triangles as vertices.
 */
export function torus(
  rings: number,
  sides: number,
  { radius = 40_000, tube = 9_000, centre = [512_000, 300_000, 81_000] } = {}
): { positions: Float32Array; indices: Uint32Array } {
  const positions = new Float32Array(3 * rings * sides);
  for (let i = 0; i < rings; i++) {
    const u = (2 * Math.PI * i) / rings;
    for (let j = 0; j < sides; j++) {
      const v = (2 * Math.PI * j) / sides;
      const r = radius + tube * Math.cos(v);
      const at = 3 * (i * sides + j);
      positions[at] = centre[0] + r * Math.cos(u);
      positions[at + 1] = centre[1] + r * Math.sin(u);
      positions[at + 2] = centre[2] + tube * Math.sin(v);
    }
  }
  const indices = new Uint32Array(6 * rings * sides);
  for (let i = 0, t = 0; i < rings; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * sides + j,
        b = ((i + 1) % rings) * sides + j,
        c = ((i + 1) % rings) * sides + ((j + 1) % sides),
        d = i * sides + ((j + 1) % sides);
      indices.set([a, b, c, a, c, d], t);
      t += 6;
    }
  }
  return { positions, indices };
}

let encoder: Promise<unknown> | null = null;
let decoder: Promise<DracoModule> | null = null;

export const dracoDecoder = (): Promise<DracoModule> => {
  decoder ??= draco3d.createDecoderModule();
  return decoder;
};

/** A GLB with positions only, as the EM meshes are: plain, or Draco-compressed at `bits` per position. */
export async function encodeGlb(
  { positions, indices }: { positions: Float32Array; indices: Uint32Array },
  bits?: number
): Promise<Uint8Array> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const primitive = doc
    .createPrimitive()
    .setAttribute(
      'POSITION',
      doc.createAccessor().setType('VEC3').setArray(positions.slice()).setBuffer(buffer)
    )
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(indices.slice()).setBuffer(buffer));
  doc
    .createScene()
    .addChild(doc.createNode('cell').setMesh(doc.createMesh().addPrimitive(primitive)));
  if (bits === undefined) return new WebIO().writeBinary(doc);
  encoder ??= draco3d.createEncoderModule();
  doc
    .createExtension(KHRDracoMeshCompression)
    .setRequired(true)
    .setEncoderOptions({ quantizationBits: { POSITION: bits }, quantizationVolume: 'mesh' });
  return new WebIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({ 'draco3d.encoder': await encoder })
    .writeBinary(doc);
}

/** Octree blocks of a cell's LOD set: Draco at 14 bits a position, with normals, few vertices shared. */
export function octreeBlock(name: 'a' | 'b'): Uint8Array {
  return new Uint8Array(
    readFileSync(new URL(`./fixtures/octree-block-${name}.glb`, import.meta.url))
  );
}
