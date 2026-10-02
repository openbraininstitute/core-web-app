/**
 * Stand-ins kept between visits, so that a mesh seen before shows in well under a second while its full detail loads.
 * An entry is the packed stand-in: a JSON header, then each chunk's arrays, each on a 4-byte boundary.
 */
import { readEntry, STAND_IN_CACHE, writeEntry } from './asset-cache';
import { STAND_IN_CUBE_UM, STAND_IN_TRIANGLES } from './stand-in';

import type { PackedChunk, StandIn } from './types';

/** Changes whenever a stand-in would come out differently: the simplifier, its settings, or the packing. */
export const STAND_IN_VERSION = `cubes-${STAND_IN_CUBE_UM}-${STAND_IN_TRIANGLES}-sloppy-meshopt-1.2-pack-2`;

interface Header extends Omit<StandIn, 'chunks'> {
  version: string;
  chunks: (Pick<PackedChunk, 'origin' | 'bounds'> & { vertices: number; indices: number })[];
}

const align = (n: number) => (n + 3) & ~3;

/** The stand-in's entry for the GLB at `downloadUrl`. */
export function standInKey(downloadUrl: string): string {
  const url = new URL(downloadUrl);
  url.searchParams.set('stand-in', STAND_IN_VERSION);
  return url.href;
}

export function encodeStandIn(standIn: StandIn): ArrayBuffer {
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
  const json = new TextEncoder().encode(JSON.stringify(header));
  const arrays = chunks.flatMap((c) => [c.positions, c.normals, c.indices]);
  const size = arrays.reduce((n, a) => n + align(a.byteLength), align(4 + json.byteLength));
  const out = new Uint8Array(size);
  new DataView(out.buffer).setUint32(0, json.byteLength, true);
  out.set(json, 4);
  let offset = align(4 + json.byteLength);
  for (const a of arrays) {
    out.set(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), offset);
    offset += align(a.byteLength);
  }
  return out.buffer;
}

/** The stand-in an entry holds; null where it was made by another version of the pipeline. */
export function decodeStandIn(buffer: ArrayBuffer): StandIn | null {
  const length = new DataView(buffer).getUint32(0, true);
  const header: Header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, length)));
  if (header.version !== STAND_IN_VERSION) return null;
  let offset = align(4 + length);
  const take = <T>(make: (offset: number) => T, bytes: number): T => {
    const array = make(offset);
    offset += align(bytes);
    return array;
  };
  const { chunks, version: _, ...rest } = header;
  return {
    ...rest,
    chunks: chunks.map((c) => ({
      origin: c.origin,
      bounds: c.bounds,
      positions: take((at) => new Uint16Array(buffer, at, 4 * c.vertices), 8 * c.vertices),
      normals: take((at) => new Int8Array(buffer, at, 4 * c.vertices), 4 * c.vertices),
      indices: take((at) => new Uint16Array(buffer, at, c.indices), 2 * c.indices),
    })),
  };
}

export async function readStandIn(downloadUrl: string): Promise<StandIn | null> {
  const buffer = await readEntry(STAND_IN_CACHE, standInKey(downloadUrl));
  try {
    return buffer && decodeStandIn(buffer);
  } catch {
    return null;
  }
}

/** Store a stand-in as `encodeStandIn` made it. */
export function storeStandIn(downloadUrl: string, encoded: ArrayBuffer): Promise<boolean> {
  return writeEntry(STAND_IN_CACHE, standInKey(downloadUrl), encoded, encoded.byteLength);
}
