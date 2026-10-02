/**
 * The full mesh kept between visits, as it was packed, its chunks compressed with meshoptimizer's codecs: a quarter of
 * the size, and decoded in a fifth of a second on the largest mesh. With it, a visit, or a lost context, loads the mesh
 * again with no download, no Draco and no build. An entry is a JSON header, then each chunk's encoded arrays, each on
 * a 4-byte boundary.
 */
import type { MeshoptDecoder } from 'meshoptimizer/decoder';
import type { MeshoptEncoder } from 'meshoptimizer/encoder';
import type { CacheBounds } from './asset-cache';
import type { PackedChunk, PackedMesh } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export const FULL_CACHE: CacheBounds = {
  name: 'em-cell-mesh-full',
  ttlMs: 30 * DAY_MS,
  maxBytes: 500 * 2 ** 20,
};

/** Changes whenever the full mesh would come out differently: the packing, or the codecs. */
export const FULL_VERSION = 'pack-2-meshopt-1.2';

/** The full mesh's entry for the GLB at `downloadUrl`. */
export function fullKey(downloadUrl: string): string {
  const url = new URL(downloadUrl);
  url.searchParams.set('full', FULL_VERSION);
  return url.href;
}

/** A chunk with its positions, normals and indices encoded. */
export interface EncodedChunk extends Pick<PackedChunk, 'origin' | 'bounds'> {
  vertices: number;
  indices: number;
  parts: [Uint8Array, Uint8Array, Uint8Array];
}

interface Header extends Omit<PackedMesh, 'chunks'> {
  version: string;
  chunks: (Omit<EncodedChunk, 'parts'> & { sizes: number[] })[];
}

const align = (n: number) => (n + 3) & ~3;
const bytes = (a: ArrayBufferView) => new Uint8Array(a.buffer, a.byteOffset, a.byteLength);

export function encodeChunk(encoder: typeof MeshoptEncoder, chunk: PackedChunk): EncodedChunk {
  const vertices = chunk.positions.length / 4;
  return {
    origin: chunk.origin,
    bounds: chunk.bounds,
    vertices,
    indices: chunk.indices.length,
    parts: [
      encoder.encodeVertexBuffer(bytes(chunk.positions), vertices, 8),
      encoder.encodeVertexBuffer(bytes(chunk.normals), vertices, 4),
      encoder.encodeIndexBuffer(bytes(chunk.indices), chunk.indices.length, 2),
    ],
  };
}

export function encodeFull(mesh: Omit<PackedMesh, 'chunks'>, chunks: EncodedChunk[]): ArrayBuffer {
  const header: Header = {
    grid: mesh.grid,
    triangles: mesh.triangles,
    vertices: mesh.vertices,
    distinctVertices: mesh.distinctVertices,
    version: FULL_VERSION,
    chunks: chunks.map(({ parts, ...c }) => ({ ...c, sizes: parts.map((p) => p.byteLength) })),
  };
  const json = new TextEncoder().encode(JSON.stringify(header));
  const parts = chunks.flatMap((c) => c.parts);
  const size = parts.reduce((n, p) => n + align(p.byteLength), align(4 + json.byteLength));
  const out = new Uint8Array(size);
  new DataView(out.buffer).setUint32(0, json.byteLength, true);
  out.set(json, 4);
  let offset = align(4 + json.byteLength);
  for (const p of parts) {
    out.set(p, offset);
    offset += align(p.byteLength);
  }
  return out.buffer;
}

/** The full mesh an entry holds; null where it was made by another version of the pipeline. */
export function decodeFull(decoder: typeof MeshoptDecoder, buffer: ArrayBuffer): PackedMesh | null {
  const length = new DataView(buffer).getUint32(0, true);
  const header: Header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, length)));
  if (header.version !== FULL_VERSION) return null;
  let offset = align(4 + length);
  const take = (size: number) => {
    const part = new Uint8Array(buffer, offset, size);
    offset += align(size);
    return part;
  };
  const { chunks, version: _, ...rest } = header;
  return {
    ...rest,
    chunks: chunks.map((c) => {
      const positions = new Uint16Array(4 * c.vertices);
      const normals = new Int8Array(4 * c.vertices);
      const indices = new Uint16Array(c.indices);
      decoder.decodeVertexBuffer(bytes(positions), c.vertices, 8, take(c.sizes[0]));
      decoder.decodeVertexBuffer(bytes(normals), c.vertices, 4, take(c.sizes[1]));
      decoder.decodeIndexBuffer(bytes(indices), c.indices, 2, take(c.sizes[2]));
      return { origin: c.origin, bounds: c.bounds, positions, normals, indices };
    }),
  };
}
