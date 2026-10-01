/**
 * A GLB into one mesh around its centre. Draco's quantised positions are kept on Draco's own grid where it fits 16
 * bits: its integers are read with the dequantisation skipped, and the grid's origin and step go with them. Any other
 * positions are read as floats and recentred in µm.
 */
import {
  type GltfJson,
  meshHeader,
  type Primitive,
  parseGlb,
  primitives,
  readPlainPrimitive,
} from './glb';

import type { DecodedMesh, Grid, Vec3 } from './types';

/** µm per unit of the file: EM meshes are in nanometres. */
export const EM_UNIT_UM = 1e-3;

// biome-ignore lint/suspicious/noExplicitAny: Draco's Emscripten module is untyped
export type DracoModule = any;

interface Quantized {
  values: Uint16Array | Uint32Array;
  bits: number;
  min: Vec3;
  range: number;
}

interface Part {
  quantized: Quantized | null;
  /** File units, where not quantized. */
  positions: Float32Array | null;
  indices: Uint32Array;
}

export interface DecodeResult {
  mesh: DecodedMesh;
  /** Draco's WASM memory after the decode, which is its peak: it never shrinks. */
  dracoHeapBytes: number | null;
}

export function decodeGlb(
  bytes: Uint8Array,
  draco: DracoModule | null,
  unitUm = EM_UNIT_UM
): DecodeResult {
  const { json, bin } = parseGlb(bytes);
  const header = meshHeader(json);
  if (header.draco && !draco) throw new Error('Draco-compressed GLB without a decoder');
  const parts = primitives(json).map((p) =>
    p.extensions?.KHR_draco_mesh_compression
      ? decodeDracoPrimitive(draco, json, bin, p)
      : { quantized: null, ...readPlainPrimitive(json, bin, p) }
  );
  const dracoHeapBytes = header.draco ? draco.HEAP8.buffer.byteLength : null;
  const fileBounds = header.bounds ?? partsBounds(parts);
  const centre = fileBounds.min.map((v, k) => (v + fileBounds.max[k]) / 2) as Vec3;
  const bounds = {
    min: fileBounds.min.map((v, k) => (v - centre[k]) * unitUm) as Vec3,
    max: fileBounds.max.map((v, k) => (v - centre[k]) * unitUm) as Vec3,
  };

  const only = parts.length === 1 ? parts[0].quantized : null;
  if (only && only.values instanceof Uint16Array) {
    const grid: Grid = {
      origin: only.min.map((v, k) => (v - centre[k]) * unitUm) as Vec3,
      step: (only.range / (2 ** only.bits - 1)) * unitUm,
    };
    return {
      mesh: {
        positions: only.values,
        grid,
        indices: parts[0].indices,
        bounds,
        dracoBits: only.bits,
      },
      dracoHeapBytes,
    };
  }

  const positions =
    parts.length === 1 && parts[0].positions
      ? parts[0].positions
      : new Float32Array(3 * parts.reduce((n, p) => n + count(p), 0));
  const indices =
    parts.length === 1
      ? parts[0].indices
      : new Uint32Array(parts.reduce((n, p) => n + p.indices.length, 0));
  let vertex = 0,
    index = 0;
  for (const p of parts) {
    const n = count(p);
    const q = p.quantized;
    const scale = q ? q.range / (2 ** q.bits - 1) : 0;
    for (let i = 3 * vertex, end = 3 * (vertex + n), j = 0; i < end; i += 3, j += 3) {
      for (let k = 0; k < 3; k++) {
        const v = q ? q.min[k] + q.values[j + k] * scale : (p.positions as Float32Array)[j + k];
        positions[i + k] = (v - centre[k]) * unitUm;
      }
    }
    if (indices !== p.indices) {
      for (let i = 0; i < p.indices.length; i++) indices[index + i] = p.indices[i] + vertex;
    }
    vertex += n;
    index += p.indices.length;
  }
  return {
    mesh: { positions, grid: null, indices, bounds, dracoBits: only?.bits ?? null },
    dracoHeapBytes,
  };
}

function count(p: Part): number {
  return (p.quantized?.values.length ?? p.positions?.length ?? 0) / 3;
}

/** The i-th position value of a part, axis k, in the file's units. */
function fileValue(p: Part, i: number, k: number): number {
  const q = p.quantized;
  if (!q) return (p.positions as Float32Array)[i];
  return q.min[k] + (q.values[i] * q.range) / (2 ** q.bits - 1);
}

function partsBounds(parts: Part[]): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    for (let i = 0; i < 3 * count(p); i++) {
      const k = i % 3,
        v = fileValue(p, i, k);
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  return { min, max };
}

function decodeDracoPrimitive(d: DracoModule, json: GltfJson, bin: Uint8Array, p: Primitive): Part {
  const ext = p.extensions?.KHR_draco_mesh_compression;
  const view = ext && json.bufferViews?.[ext.bufferView];
  if (!ext || !view) throw new Error('Draco primitive without its buffer view');
  const data = new Int8Array(bin.buffer, bin.byteOffset + (view.byteOffset ?? 0), view.byteLength);
  const decoder = new d.Decoder();
  const mesh = new d.Mesh();
  const transform = new d.AttributeQuantizationTransform();
  try {
    // Keep the integers: dequantised, they would be floats twice the size, and off the grid.
    decoder.SkipAttributeTransform(d.POSITION);
    const status = decoder.DecodeArrayToMesh(data, data.byteLength, mesh);
    if (!status.ok() || mesh.ptr === 0) throw new Error(`Draco: ${status.error_msg()}`);
    const attribute = decoder.GetAttributeByUniqueId(mesh, ext.attributes.POSITION);
    const n = mesh.num_points();
    const indices = copyOut(d, Uint32Array, mesh.num_faces() * 3, (size, ptr) =>
      decoder.GetTrianglesUInt32Array(mesh, size, ptr)
    );
    if (!transform.InitFromAttribute(attribute)) {
      const positions = copyOut(d, Float32Array, n * 3, (size, ptr) =>
        decoder.GetAttributeDataArrayForAllPoints(mesh, attribute, d.DT_FLOAT32, size, ptr)
      );
      return { quantized: null, positions, indices };
    }
    const bits: number = transform.quantization_bits();
    const fill = (type: number) => (size: number, ptr: number) =>
      decoder.GetAttributeDataArrayForAllPoints(mesh, attribute, type, size, ptr);
    const values =
      bits <= 16
        ? copyOut(d, Uint16Array, n * 3, fill(d.DT_UINT16))
        : copyOut(d, Uint32Array, n * 3, fill(d.DT_UINT32));
    const min: Vec3 = [transform.min_value(0), transform.min_value(1), transform.min_value(2)];
    return { quantized: { values, bits, min, range: transform.range() }, positions: null, indices };
  } finally {
    d.destroy(transform);
    d.destroy(mesh);
    d.destroy(decoder);
  }
}

/** `length` values that `fill` writes into Draco's heap, copied out and freed. */
function copyOut<T extends Uint16Array | Uint32Array | Float32Array>(
  d: DracoModule,
  Type: { new (buffer: ArrayBuffer, offset: number, length: number): T },
  length: number,
  fill: (size: number, ptr: number) => boolean
): T {
  const size = length * (Type as unknown as { BYTES_PER_ELEMENT: number }).BYTES_PER_ELEMENT;
  const ptr = d._malloc(size);
  try {
    if (!fill(size, ptr)) throw new Error('Draco could not read the mesh out');
    // The heap may have grown, and moved, since the malloc.
    return new Type(d.HEAP8.buffer, ptr, length).slice() as T;
  } finally {
    d._free(ptr);
  }
}
