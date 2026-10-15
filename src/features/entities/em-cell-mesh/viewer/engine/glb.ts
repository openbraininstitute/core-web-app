/**
 * The GLB container: the JSON chunk, which comes first and says how large the mesh is before the rest has arrived,
 * and the plain (not Draco-compressed) accessors that contributors' GLBs may have.
 */
import type { Vec3 } from './types';

const MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const TRIANGLES = 4;
const FLOAT = 5126;
const INDEX_ARRAYS = {
  5121: Uint8Array,
  5123: Uint16Array,
  5125: Uint32Array,
} as const;

interface Accessor {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
  min?: number[];
  max?: number[];
  sparse?: unknown;
}

export interface Primitive {
  attributes: Record<string, number>;
  indices?: number;
  mode?: number;
  extensions?: {
    KHR_draco_mesh_compression?: { bufferView: number; attributes: Record<string, number> };
  };
}

export interface GltfJson {
  accessors?: Accessor[];
  bufferViews?: { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number }[];
  meshes?: { primitives: Primitive[] }[];
}

/** How large a mesh is, from the JSON alone. */
export interface MeshHeader {
  triangles: number;
  vertices: number;
  /** Whether any primitive is Draco-compressed. */
  draco: boolean;
  /** The positions' extent in the file's units, from the accessors; null where one has none. */
  bounds: { min: Vec3; max: Vec3 } | null;
}

/** The JSON chunk, once the first `received` bytes hold it; null before, and an error if this isn't a GLB. */
export function readGlbJson(bytes: Uint8Array, received = bytes.byteLength): GltfJson | null {
  if (received < 20) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, received);
  if (view.getUint32(0, true) !== MAGIC) throw new Error('not a GLB file');
  if (view.getUint32(4, true) !== 2) throw new Error(`GLB version ${view.getUint32(4, true)}`);
  const length = view.getUint32(12, true);
  if (view.getUint32(16, true) !== JSON_CHUNK) throw new Error('GLB without a JSON chunk first');
  if (received < 20 + length) return null;
  return JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + length)));
}

/** The whole GLB's JSON and binary chunk. */
export function parseGlb(bytes: Uint8Array): { json: GltfJson; bin: Uint8Array } {
  const json = readGlbJson(bytes);
  if (!json) throw new Error('GLB ends inside its JSON chunk');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 20 + view.getUint32(12, true);
  while (offset + 8 <= bytes.byteLength) {
    const length = view.getUint32(offset, true);
    if (view.getUint32(offset + 4, true) === BIN_CHUNK) {
      if (offset + 8 + length > bytes.byteLength)
        throw new Error('GLB ends inside its binary chunk');
      return { json, bin: bytes.subarray(offset + 8, offset + 8 + length) };
    }
    offset += 8 + length;
  }
  throw new Error('GLB without a binary chunk');
}

export function primitives(json: GltfJson): Primitive[] {
  const all = json.meshes?.flatMap((m) => m.primitives) ?? [];
  if (all.length === 0) throw new Error('GLB without a mesh');
  for (const p of all) {
    if ((p.mode ?? TRIANGLES) !== TRIANGLES) throw new Error('GLB mesh that is not triangles');
    if (p.attributes.POSITION === undefined) throw new Error('GLB mesh without positions');
  }
  return all;
}

function accessor(json: GltfJson, index: number): Accessor {
  const a = json.accessors?.[index];
  if (!a) throw new Error(`GLB without accessor ${index}`);
  return a;
}

export function meshHeader(json: GltfJson): MeshHeader {
  let triangles = 0,
    vertices = 0,
    draco = false;
  let bounds: MeshHeader['bounds'] = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  for (const p of primitives(json)) {
    const position = accessor(json, p.attributes.POSITION);
    vertices += position.count;
    triangles += (p.indices === undefined ? position.count : accessor(json, p.indices).count) / 3;
    draco ||= p.extensions?.KHR_draco_mesh_compression !== undefined;
    const { min, max } = position;
    if (!bounds || !min || !max) bounds = null;
    else {
      for (let k = 0; k < 3; k++) {
        bounds.min[k] = Math.min(bounds.min[k], min[k]);
        bounds.max[k] = Math.max(bounds.max[k], max[k]);
      }
    }
  }
  return { triangles: Math.floor(triangles), vertices, draco, bounds };
}

/** A primitive without Draco: its float positions, in the file's units, and its indices. */
export function readPlainPrimitive(
  json: GltfJson,
  bin: Uint8Array,
  p: Primitive
): { positions: Float32Array; indices: Uint32Array } {
  const position = accessor(json, p.attributes.POSITION);
  if (position.componentType !== FLOAT || position.type !== 'VEC3') {
    throw new Error('GLB positions that are not three floats');
  }
  const positions = read(json, bin, position, Float32Array, 3);
  if (p.indices === undefined) {
    const indices = new Uint32Array(position.count);
    for (let i = 0; i < indices.length; i++) indices[i] = i;
    return { positions, indices };
  }
  const index = accessor(json, p.indices);
  const IndexArray = INDEX_ARRAYS[index.componentType as keyof typeof INDEX_ARRAYS];
  if (!IndexArray || index.type !== 'SCALAR') throw new Error('GLB indices of an unknown type');
  const indices = read(json, bin, index, IndexArray, 1);
  return {
    positions,
    indices: indices instanceof Uint32Array ? indices : Uint32Array.from(indices),
  };
}

type Typed = typeof Float32Array | (typeof INDEX_ARRAYS)[keyof typeof INDEX_ARRAYS];

/** An accessor's values, copied out of the binary chunk whatever their stride. */
function read<T extends Typed>(
  json: GltfJson,
  bin: Uint8Array,
  a: Accessor,
  Type: T,
  components: number
): InstanceType<T> {
  if (a.sparse || a.bufferView === undefined) throw new Error('GLB accessor without data');
  const bv = json.bufferViews?.[a.bufferView];
  if (!bv) throw new Error(`GLB without buffer view ${a.bufferView}`);
  const size = Type.BYTES_PER_ELEMENT;
  const element = size * components;
  const stride = bv.byteStride ?? element;
  const start = bin.byteOffset + (bv.byteOffset ?? 0) + (a.byteOffset ?? 0);
  if (a.count > 0 && start - bin.byteOffset + (a.count - 1) * stride + element > bin.byteLength) {
    throw new Error('GLB accessor beyond its buffer');
  }
  const out = new Type(a.count * components) as InstanceType<T>;
  if (stride === element && start % size === 0) {
    out.set(new Type(bin.buffer as ArrayBuffer, start, a.count * components) as InstanceType<T>);
    return out;
  }
  const view = new DataView(bin.buffer);
  for (let i = 0; i < a.count; i++) {
    for (let k = 0; k < components; k++) {
      const at = start + i * stride + k * size;
      out[i * components + k] =
        Type === Float32Array
          ? view.getFloat32(at, true)
          : Type === Uint32Array
            ? view.getUint32(at, true)
            : Type === Uint16Array
              ? view.getUint16(at, true)
              : view.getUint8(at);
    }
  }
  return out;
}
