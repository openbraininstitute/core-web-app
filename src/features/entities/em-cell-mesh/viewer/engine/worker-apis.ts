/**
 * What each of the pipeline's workers exposes over Comlink. Each worker does one part and is terminated after, since
 * that is the only way to give its WASM memory back: Draco's in the decode worker, meshoptimizer's in the stand-in
 * worker. The arrays go from one to the next through the page, transferred, never copied.
 */
import * as Comlink from 'comlink';

import { packedBuffers, packMesh } from './chunks';
import { type DracoModule, decodeGlb } from './decode';
import { type DownloadHooks, type DownloadRequest, downloadGlb } from './download';
import { makeStandIn, STAND_IN_TRIANGLES } from './stand-in';

import type { MeshoptSimplifier } from 'meshoptimizer';
import type { CacheBounds } from './asset-cache';
import type { MeshHeader } from './glb';
import type { DecodedMesh, PackedMesh, StandIn, Timing } from './types';

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
    ): Promise<{ kind: 'done' | 'stopped'; fromCache: boolean; header: MeshHeader }> {
      const result = await downloadGlb(request, cache, hooks);
      header = result.header;
      if (result.kind === 'stopped') return { kind: 'stopped', fromCache: false, header };
      bytes = result.bytes;
      return { kind: 'done', fromCache: result.fromCache, header };
    },

    async decode(): Promise<{ mesh: DecodedMesh; dracoHeapBytes: number | null }> {
      if (!bytes || !header) throw new Error('nothing downloaded to decode');
      const result = decodeGlb(bytes, header.draco ? await dracoModule() : null);
      bytes = null;
      return Comlink.transfer(result, meshBuffers(result.mesh));
    },
  };
}

/** Makes the stand-in, and hands the mesh back for the full build. */
export function createStandInApi(
  loadSimplifier: () => Promise<typeof MeshoptSimplifier>,
  heapBytes: () => number | null,
  target = STAND_IN_TRIANGLES
) {
  let simplifier: Promise<typeof MeshoptSimplifier> | null = null;
  const ready = () => {
    simplifier ??= loadSimplifier();
    return simplifier;
  };
  return {
    /** Compile meshoptimizer's WASM, while the GLB downloads. */
    async warmUp(): Promise<void> {
      await ready();
    },

    async make(mesh: DecodedMesh): Promise<{
      standIn: StandIn;
      mesh: DecodedMesh;
      timings: Timing[];
      heapBytes: number | null;
    }> {
      const { standIn, timings } = makeStandIn(mesh, await ready(), target);
      return Comlink.transfer({ standIn, mesh, timings, heapBytes: heapBytes() }, [
        ...packedBuffers(standIn),
        ...meshBuffers(mesh),
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

export type DecodeApi = ReturnType<typeof createDecodeApi>;
export type StandInApi = ReturnType<typeof createStandInApi>;
export type BuildApi = typeof buildApi;
