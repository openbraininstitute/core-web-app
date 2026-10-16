/**
 * What the pack worker exposes over Comlink: a circuit's pack opened, from the cache a visit before left it in, or from
 * OBI-One, which builds it and whose pack goes into the cache once it has been opened; then its boxes read as the view
 * asks for them, with the cells numbered as the page numbers them, each box in Morton order (`mortonOrder`).
 */
import * as Comlink from 'comlink';

import {
  bucket,
  type CacheBounds,
  deleteEntry,
  readEntry,
  writeEntry,
} from '@/features/viewer-3d/load/asset-cache';

import { pageCells, renumberSegments, renumberSomas } from './cells';
import { downloadPack, type OnProgress, type PackRequest, type Refused } from './download';
import { mortonOrder } from './morton';
import { openPack, type Pack, PackError } from './pack';

import type {
  BoxRead,
  CircuitMorphologyData,
  MorphologySegments,
  PackBoxes,
  Population,
} from '../types';

/** Kept a day, not an asset's 30: OBI-One builds the pack on request, so what is behind its URL can change. */
export const PACK_CACHE = bucket('circuit-morphology-pack', 1);

/** The pack opened: its somas and frame, with no segments, and where its segments lie. */
export type Opened =
  | ({ kind: 'opened'; data: CircuitMorphologyData; fromCache: boolean } & PackBoxes)
  | Refused;

async function openCached(cache: CacheBounds, key: string): Promise<Pack | null> {
  const bytes = await readEntry(cache, key);
  if (!bytes) return null;
  try {
    return await openPack(new Uint8Array(bytes));
  } catch (e) {
    if (!(e instanceof PackError)) throw e;
    await deleteEntry(cache, key);
    return null;
  }
}

const buffersOf = ({ segments, segmentCells, segmentTypes }: MorphologySegments) => [
  segments.buffer,
  segmentCells.buffer,
  segmentTypes.buffer,
];

export function createPackApi(cache: CacheBounds) {
  let opened: { readBox: Pack['readBox']; numbers: Uint32Array } | null = null;
  return {
    async open(
      request: PackRequest,
      populations: Population[],
      onProgress: OnProgress
    ): Promise<Opened> {
      let pack = await openCached(cache, request.url);
      const fromCache = pack !== null;
      if (!pack) {
        const download = await downloadPack(request, onProgress);
        if (download.kind === 'refused') return download;
        const { bytes } = download;
        pack = await openPack(bytes);
        // Before the answer: once it has the pack, the page may let go of the worker at any time.
        await writeEntry(cache, request.url, bytes.buffer as ArrayBuffer, bytes.byteLength);
      }
      const numbers = pageCells(pack.data.populations, populations);
      opened = { readBox: pack.readBox, numbers };
      const data = renumberSomas(pack.data, numbers, populations);
      // The boxes and the levels are copied, not handed over: the pack reads by them.
      return Comlink.transfer(
        { kind: 'opened', data, boxes: pack.boxes, levels: pack.levels, fromCache },
        [data.somas.buffer as ArrayBuffer]
      );
    },

    async read(wanted: BoxRead[]): Promise<MorphologySegments[]> {
      if (!opened) throw new Error('no morphology pack is open');
      const { readBox, numbers } = opened;
      const read = await Promise.all(
        wanted.map(async ({ level, box }) =>
          mortonOrder(renumberSegments(await readBox(level, box), numbers))
        )
      );
      return Comlink.transfer(read, read.flatMap(buffersOf) as ArrayBuffer[]);
    },
  };
}

export type PackApi = ReturnType<typeof createPackApi>;
