/**
 * The full mesh kept between visits, as it was packed, its chunks compressed with meshoptimizer's codecs: a quarter of
 * the size, and decoded in a fifth of a second on the largest mesh. With it, a visit, or a lost context, loads the mesh
 * again with no download, no Draco and no build. An entry is a JSON header, then each chunk's encoded arrays, each on
 * a 4-byte boundary.
 */
import { packEntry, unpackEntry, versionedKey } from './asset-cache';

import type { MeshoptDecoder } from 'meshoptimizer/decoder';
import type { MeshoptEncoder } from 'meshoptimizer/encoder';
import type { PackedChunk, PackedMesh } from './types';

/** Changes whenever the full mesh would come out differently: the packing, or the codecs. */
export const FULL_VERSION = 'pack-2-meshopt-1.2';

/** The full mesh's entry for the GLB at `downloadUrl`. */
export function fullKey(downloadUrl: string): string {
  return versionedKey(downloadUrl, 'full', FULL_VERSION);
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

export function encodeFull(mesh: Omit<PackedMesh, 'chunks'>, chunks: EncodedChunk[]): Blob {
  const header: Header = {
    grid: mesh.grid,
    triangles: mesh.triangles,
    vertices: mesh.vertices,
    distinctVertices: mesh.distinctVertices,
    version: FULL_VERSION,
    chunks: chunks.map(({ parts, ...c }) => ({ ...c, sizes: parts.map((p) => p.byteLength) })),
  };
  return packEntry(
    header,
    chunks.flatMap((c) => c.parts)
  );
}

/** The full mesh an entry holds; null where it was made by another version of the pipeline. */
export function decodeFull(decoder: typeof MeshoptDecoder, buffer: ArrayBuffer): PackedMesh | null {
  const entry = unpackEntry<Header>(buffer, FULL_VERSION);
  if (!entry) return null;
  const take = (size: number) => new Uint8Array(buffer, entry.next(size), size);
  const { chunks, version: _, ...rest } = entry.header;
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
