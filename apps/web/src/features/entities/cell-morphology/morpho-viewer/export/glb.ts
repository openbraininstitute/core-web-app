/**
 * GLB export: one node, "morphology", with normals, vertex colours and a rough non-metallic material; plain, or
 * Draco-compressed.
 *
 * Draco-compressed GLB export (KHR_draco_mesh_compression) at Draco's highest
 * compression level: edgebreaker connectivity with encode and decode speed 0.
 * The quantization is the lossy part. Draco snaps the positions to a grid of
 * 2^bits steps across the longest side of the mesh, and at glTF-Transform's
 * default of 14 bits that grid is 70 nm on the sample cell and 520 nm on a
 * projection neuron: thin axons collapse onto it, and on the projection neuron
 * the file even comes out larger than at 18 bits, as the degenerate triangles
 * spoil the prediction. So the bits follow the mesh instead, for a step of no
 * more than 1/32 of the voxel it was built with. At 0.1 µm that is 19 bits on
 * the sample cell (14.9 MB → 1.0 MB) and 22 on the projection neuron
 * (116 MB → 4.9 MB); the decoded meshes are closed, with no triangle made
 * degenerate and 54 and 48 facing against their vertex normals where 40 and 41
 * did. Keying the step to the finest patch voxel instead, a quarter of that,
 * would cost two more bits and a fifth more file for the last dozen of those.
 */
import { Document, WebIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression } from '@gltf-transform/extensions';

/** Largest step of the position grid, in voxels. */
export const POSITION_STEP_VOXELS = 1 / 32;
/** Octahedral normals at 10 bits are within 0.25° of the shading normals; 8 bits would save 10 % for 1°. */
const NORMAL_BITS = 10;
/** The type colours are 8-bit sRGB to begin with. */
const COLOR_BITS = 8;
/** Draco quantizes to at most 30 bits. */
const MAX_BITS = 30;

export interface ExportMesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  /** SWC type of each vertex. */
  types: Uint8Array;
  /** Linear RGB of each SWC type, three floats per type, indexed by type. */
  palette: Float32Array;
  /** The voxel the mesh was built with (`MeshStats.voxel`), µm. */
  voxel: number;
}

/** Longest side of the bounding box of the positions. */
export function meshExtent(positions: Float32Array): number {
  const lo = [Infinity, Infinity, Infinity],
    hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = positions[i + k];
      if (v < lo[k]) lo[k] = v;
      if (v > hi[k]) hi[k] = v;
    }
  }
  return positions.length > 0 ? Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) : 0;
}

/** Fewest position bits whose grid step, extent / (2^bits − 1), is within `POSITION_STEP_VOXELS × voxel`. */
export function positionBits(extent: number, voxel: number): number {
  const steps = extent / (POSITION_STEP_VOXELS * voxel);
  return Math.min(MAX_BITS, Math.max(1, Math.ceil(Math.log2(steps + 1))));
}

/**
 * The mesh as a GLB. Given `draco`, the Draco encoder module for glTF (draco3dgltf, which works in the browser and in
 * Node), its one primitive is Draco-compressed.
 */
export async function encodeGlb(
  mesh: ExportMesh,
  draco?: unknown
): Promise<Uint8Array<ArrayBuffer>> {
  const { positions, normals, indices, types, palette } = mesh;
  const colors = new Float32Array(positions.length);
  for (let i = 0; i < types.length; i++) {
    const t = 3 * types[i];
    colors[3 * i] = palette[t];
    colors[3 * i + 1] = palette[t + 1];
    colors[3 * i + 2] = palette[t + 2];
  }
  const doc = new Document();
  const buffer = doc.createBuffer();
  // glTF-Transform takes arrays over an ArrayBuffer, which these are: none is shared.
  const accessor = (type: 'VEC3' | 'SCALAR', array: Float32Array | Uint32Array) =>
    doc
      .createAccessor()
      .setType(type)
      .setArray(array as Float32Array<ArrayBuffer> | Uint32Array<ArrayBuffer>)
      .setBuffer(buffer);
  const primitive = doc
    .createPrimitive()
    .setAttribute('POSITION', accessor('VEC3', positions))
    .setAttribute('NORMAL', accessor('VEC3', normals))
    .setAttribute('COLOR_0', accessor('VEC3', colors))
    .setIndices(accessor('SCALAR', indices))
    .setMaterial(doc.createMaterial().setMetallicFactor(0).setRoughnessFactor(0.6));
  doc
    .createScene()
    .addChild(doc.createNode('morphology').setMesh(doc.createMesh().addPrimitive(primitive)));
  if (!draco) return new WebIO().writeBinary(doc);

  doc
    .createExtension(KHRDracoMeshCompression)
    .setRequired(true)
    .setEncoderOptions({
      method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
      encodeSpeed: 0,
      decodeSpeed: 0,
      quantizationBits: {
        POSITION: positionBits(meshExtent(positions), mesh.voxel),
        NORMAL: NORMAL_BITS,
        COLOR: COLOR_BITS,
      },
      quantizationVolume: 'mesh',
    });
  const glb = await new WebIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({ 'draco3d.encoder': draco })
    .writeBinary(doc);
  // When the encoder fails, glTF-Transform logs it and writes the primitive uncompressed, still requiring Draco.
  if (!glbJson(glb).meshes?.[0]?.primitives?.[0]?.extensions?.KHR_draco_mesh_compression) {
    throw new Error('the Draco encoder failed; see the console');
  }
  return glb;
}

/** The parts of a glTF's JSON that are checked here and in the tests. */
interface GltfJson {
  extensionsRequired?: string[];
  nodes?: { name?: string; mesh?: number }[];
  meshes?: { primitives?: { extensions?: Record<string, unknown> }[] }[];
  materials?: { pbrMetallicRoughness?: Record<string, unknown> }[];
}

/** The JSON chunk of a GLB, which comes first after the 12-byte header and its own 8-byte header. */
export function glbJson(glb: Uint8Array): GltfJson {
  const length = new DataView(glb.buffer, glb.byteOffset, glb.byteLength).getUint32(12, true);
  return JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + length)));
}
