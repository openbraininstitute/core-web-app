/**
 * What the pack worker exposes over Comlink: a circuit's morphologies from the pack a visit before left in the cache,
 * or from the one OBI-One builds, which goes into the cache once it has been read.
 */
import * as Comlink from 'comlink';

import {
  bucket,
  type CacheBounds,
  deleteEntry,
  readEntry,
  writeEntry,
} from '@/features/viewer-3d/load/asset-cache';

import { renumberCells } from './cells';
import { downloadPack, type OnProgress, type PackRequest, type Refused } from './download';
import { PackError, readPack } from './pack';

import type { CircuitMorphologyData, Population } from '../types';

/** Kept a day, not an asset's 30: OBI-One builds the pack on request, so what is behind its URL can change. */
export const PACK_CACHE = bucket('circuit-morphology-pack', 1);

export type Loaded = { kind: 'loaded'; data: CircuitMorphologyData; fromCache: boolean } | Refused;

async function readCached(cache: CacheBounds, key: string): Promise<CircuitMorphologyData | null> {
  const bytes = await readEntry(cache, key);
  if (!bytes) return null;
  try {
    return await readPack(new Uint8Array(bytes));
  } catch (e) {
    if (!(e instanceof PackError)) throw e;
    await deleteEntry(cache, key);
    return null;
  }
}

export function createPackApi(cache: CacheBounds) {
  return {
    async load(
      request: PackRequest,
      populations: Population[],
      onProgress: OnProgress
    ): Promise<Loaded> {
      let data = await readCached(cache, request.url);
      const fromCache = data !== null;
      if (!data) {
        const download = await downloadPack(request, onProgress);
        if (download.kind === 'refused') return download;
        const { bytes } = download;
        data = await readPack(bytes);
        // Awaited: the worker is terminated once it has answered.
        await writeEntry(cache, request.url, bytes.buffer as ArrayBuffer, bytes.byteLength);
      }
      data = renumberCells(data, populations);
      return Comlink.transfer({ kind: 'loaded', data, fromCache }, [
        data.segments.buffer,
        data.segmentCells.buffer,
        data.segmentTypes.buffer,
        data.somas.buffer,
      ] as ArrayBuffer[]);
    },
  };
}

export type PackApi = ReturnType<typeof createPackApi>;
