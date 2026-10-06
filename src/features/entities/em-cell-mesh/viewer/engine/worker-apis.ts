/**
 * What each of the pipeline's workers exposes over Comlink. Each worker does one part and is terminated after, since
 * that is the only way to give its WASM memory back: Draco's in the decode worker, meshoptimizer's in the stand-in
 * worker. The arrays go from one to the next through the page, transferred, never copied.
 */
import * as Comlink from 'comlink';

import { type CacheBounds, hasEntry, readEntry, writeEntry } from './asset-cache';
import { packedBuffers, packMesh, unpackMesh } from './chunks';
import { type DecodeResult, type DracoModule, decodeGlb } from './decode';
import { type DownloadHooks, type DownloadRequest, downloadGlb } from './download';
import { decodeFull, type EncodedChunk, encodeChunk, encodeFull, fullKey } from './full-cache';
import { makeStandIn } from './stand-in';
import { encodeStandIn } from './stand-in-cache';

import type { MeshoptDecoder } from 'meshoptimizer/decoder';
import type { MeshoptEncoder } from 'meshoptimizer/encoder';
import type { MeshoptSimplifier } from 'meshoptimizer/simplifier';
import type { MeshHeader } from './glb';
import type { DecodedMesh, PackedChunk, PackedMesh, StandIn, Timing } from './types';

export function meshBuffers(mesh: DecodedMesh): ArrayBuffer[] {
  return [mesh.positions.buffer, mesh.indices.buffer] as ArrayBuffer[];
}

/** Downloads the GLB, and keeps it, until it decodes it. */
export function createDecodeApi(loadDraco: () => Promise<DracoModule>, cache: CacheBounds | null) {
  let bytes: Uint8Array | null = null;
  let header: MeshHeader | null = null;
  let draco: Promise<DracoModule> | null = null;
  const dracoModule = () => {
    draco ??= loadDraco();
    return draco;
  };
  return {
    /** Fetch and compile Draco's WASM, while the GLB downloads. */
    async warmUp(): Promise<void> {
      await dracoModule();
    },

    async download(
      request: DownloadRequest,
      hooks: DownloadHooks
    ): Promise<{ kind: 'done' | 'stopped'; fromCache: boolean }> {
      const result = await downloadGlb(request, cache, hooks);
      header = result.header;
      if (result.kind === 'stopped') return { kind: 'stopped', fromCache: false };
      bytes = result.bytes;
      return { kind: 'done', fromCache: result.fromCache };
    },

    async decode(): Promise<DecodeResult> {
      if (!bytes || !header) throw new Error('nothing downloaded to decode');
      const result = decodeGlb(bytes, header.draco ? await dracoModule() : null);
      bytes = null;
      return Comlink.transfer(result, meshBuffers(result.mesh));
    },
  };
}

/** What the stand-in worker hands back: the stand-in, its copy for the cache, and how it was made. */
export interface MadeStandIn {
  standIn: StandIn;
  /** The stand-in as the cache keeps it (`encodeStandIn`), made here rather than on the page; null once stored. */
  encoded: Blob | null;
  timings: Timing[];
  heapBytes: number | null;
}

/**
 * Makes the stand-in, and its copy for the cache, from the decoded mesh, which it hands back for the full build; or from
 * the full mesh its cache gave back, which it hands back to be drawn. meshoptimizer's simplifier loads only for a mesh
 * that takes it (`makeStandIn`).
 */
export function createStandInApi(
  loadSimplifier: () => Promise<typeof MeshoptSimplifier>,
  heapBytes: () => number | null
) {
  const makeFrom = async (mesh: DecodedMesh, triangles: number): Promise<MadeStandIn> => {
    const { standIn, timings } = await makeStandIn(mesh, loadSimplifier, triangles);
    return { standIn, encoded: encodeStandIn(standIn), timings, heapBytes: heapBytes() };
  };
  return {
    /** The stand-in of at most `triangles` triangles. */
    async make(mesh: DecodedMesh, triangles: number): Promise<MadeStandIn & { mesh: DecodedMesh }> {
      const made = await makeFrom(mesh, triangles);
      return Comlink.transfer({ ...made, mesh }, [
        ...packedBuffers(made.standIn),
        ...meshBuffers(mesh),
      ]);
    },

    /** The stand-in of at most `triangles` triangles, from the full mesh as its cache gave it back. */
    async fromFull(
      full: PackedMesh,
      triangles: number
    ): Promise<MadeStandIn & { full: PackedMesh }> {
      const made = await makeFrom(unpackMesh(full), triangles);
      return Comlink.transfer({ ...made, full }, [
        ...packedBuffers(made.standIn),
        ...packedBuffers(full),
      ]);
    },
  };
}

/** Splits and packs the full mesh. */
export const buildApi = {
  build(mesh: DecodedMesh): { mesh: PackedMesh; timings: Timing[] } {
    const result = packMesh(mesh.positions, mesh.grid, mesh.indices);
    return Comlink.transfer(result, packedBuffers(result.mesh));
  },
};

/**
 * Keeps the full mesh in its cache, and reads it back. The chunks come one by one as they go up to the GPU, each
 * encoded as it comes, so that the entry is stored soon after the last; then the worker is terminated.
 */
export function createFullCacheApi(
  loadEncoder: () => Promise<typeof MeshoptEncoder>,
  loadDecoder: () => Promise<typeof MeshoptDecoder>,
  cache: CacheBounds | null
) {
  const encoded: EncodedChunk[] = [];
  /** The chunks added, encoded in turn: `store` waits for the last. */
  let encoding = Promise.resolve();
  return {
    async has(downloadUrl: string): Promise<boolean> {
      return cache !== null && hasEntry(cache, fullKey(downloadUrl));
    },

    async restore(downloadUrl: string): Promise<PackedMesh | null> {
      if (!cache) return null;
      const [buffer, decoder] = await Promise.all([
        readEntry(cache, fullKey(downloadUrl)),
        loadDecoder(),
      ]);
      const mesh = buffer && decodeFull(decoder, buffer);
      return mesh && Comlink.transfer(mesh, packedBuffers(mesh));
    },

    add(index: number, chunk: PackedChunk): Promise<void> {
      encoding = encoding.then(async () => {
        encoded[index] = encodeChunk(await loadEncoder(), chunk);
      });
      return encoding;
    },

    /** Store the chunks added, `mesh` saying what else the mesh is; resolves whether it was stored. */
    async store(downloadUrl: string, mesh: Omit<PackedMesh, 'chunks'>): Promise<boolean> {
      if (!cache) return false;
      await encoding;
      const entry = encodeFull(mesh, encoded);
      encoded.length = 0;
      return writeEntry(cache, fullKey(downloadUrl), entry, entry.size);
    },
  };
}

export type DecodeApi = ReturnType<typeof createDecodeApi>;
export type StandInApi = ReturnType<typeof createStandInApi>;
export type BuildApi = typeof buildApi;
export type FullCacheApi = ReturnType<typeof createFullCacheApi>;
