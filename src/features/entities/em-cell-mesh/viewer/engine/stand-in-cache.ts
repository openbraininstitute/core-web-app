/**
 * Stand-ins kept between visits, so that a mesh seen before shows in well under a second while its full detail loads.
 * An entry is the packed stand-in: a JSON header, then each chunk's arrays, each on a 4-byte boundary.
 */
import {
  packEntry,
  readEntry,
  STAND_IN_CACHE,
  unpackEntry,
  versionedKey,
  writeEntry,
} from './asset-cache';
import { chunkArrays } from './chunks';
import { TRIANGLES_PER_FACE } from './cluster';

import type { PackedChunk, StandIn } from './types';

/** Changes whenever a stand-in would come out differently: the simplifier, its settings, or the packing. */
export const STAND_IN_VERSION = `cubes-within-${TRIANGLES_PER_FACE}-sloppy-meshopt-1.2-pack-2`;

interface Header extends Omit<StandIn, 'chunks'> {
  version: string;
  chunks: (Pick<PackedChunk, 'origin' | 'bounds'> & { vertices: number; indices: number })[];
}

/** The entry for the stand-in of at most `triangles` triangles of the GLB at `downloadUrl`. */
export function standInKey(downloadUrl: string, triangles: number): string {
  return versionedKey(downloadUrl, 'stand-in', `${STAND_IN_VERSION}-${triangles}`);
}

export function encodeStandIn(standIn: StandIn): Blob {
  const { chunks, ...rest } = standIn;
  const header: Header = {
    ...rest,
    version: STAND_IN_VERSION,
    chunks: chunks.map((c) => ({
      origin: c.origin,
      bounds: c.bounds,
      vertices: c.positions.length / 4,
      indices: c.indices.length,
    })),
  };
  return packEntry(header, chunks.flatMap(chunkArrays));
}

/** The stand-in an entry holds; null where it was made by another version of the pipeline. */
export function decodeStandIn(buffer: ArrayBuffer): StandIn | null {
  const entry = unpackEntry<Header>(buffer, STAND_IN_VERSION);
  if (!entry) return null;
  const { chunks, version: _, ...rest } = entry.header;
  const { next } = entry;
  return {
    ...rest,
    chunks: chunks.map((c) => ({
      origin: c.origin,
      bounds: c.bounds,
      positions: new Uint16Array(buffer, next(8 * c.vertices), 4 * c.vertices),
      normals: new Int8Array(buffer, next(4 * c.vertices), 4 * c.vertices),
      indices: new Uint16Array(buffer, next(2 * c.indices), c.indices),
    })),
  };
}

export async function readStandIn(downloadUrl: string, triangles: number): Promise<StandIn | null> {
  const buffer = await readEntry(STAND_IN_CACHE, standInKey(downloadUrl, triangles));
  try {
    return buffer && decodeStandIn(buffer);
  } catch {
    return null;
  }
}

/** Store a stand-in as `encodeStandIn` made it. */
export function storeStandIn(
  downloadUrl: string,
  triangles: number,
  encoded: Blob
): Promise<boolean> {
  return writeEntry(STAND_IN_CACHE, standInKey(downloadUrl, triangles), encoded, encoded.size);
}
