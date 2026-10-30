/**
 * What the pack worker exposes over Comlink. It opens a circuit's pack, either from the cache where an earlier visit
 * left it or as it comes in from Bluenaas. A downloaded pack opens once its somas are in, and goes into the cache once
 * all of it is in (`whole`). The worker then reads the pack's boxes as the view asks for them, each once its bytes are
 * in, with the cells numbered as the page numbers them and each box in Morton order (`mortonOrder`).
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
import {
  downloadPack,
  type FreshHeaders,
  type OnProgress,
  PackChanged,
  type PackRequest,
} from './download';
import { mortonOrder } from './morton';
import { openPack, type Pack, PackError } from './pack';

import type {
  BoxRead,
  CircuitMorphologyData,
  MorphologySegments,
  PackBoxes,
  Population,
} from '../types';

/** Packs by their digest: Bluenaas serves a circuit's pack under one URL and rebuilds it when its cache is cleared. */
export const PACK_CACHE = bucket('circuit-morphology-mpack');

/** A pack's key in the cache, which must be a URL. */
export const packCacheKey = (sha256: string) =>
  `https://circuit-morphology-pack.invalid/${sha256.toLowerCase()}`;

/**
 * The opened pack: its somas and frame, with no segments; where its segments lie; and how many bytes of the file must
 * be in before each box can be read at each level (`Pack.readableAt`).
 */
export type Opened = {
  data: CircuitMorphologyData;
  fromCache: boolean;
  readableAt: Float64Array[];
} & PackBoxes;

async function openCached(cache: CacheBounds, key: string, size: number): Promise<Pack | null> {
  const bytes = await readEntry(cache, key, size);
  if (!bytes) return null;
  try {
    return await openPack(new Uint8Array(bytes));
  } catch (e) {
    if (!(e instanceof PackError)) throw e;
    await deleteEntry(cache, key);
    return null;
  }
}

const hex = (digest: ArrayBuffer) =>
  Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');

/** Checks the whole pack against its digest once it is in, and puts it in the cache if it fits. */
async function keep(whole: Promise<Uint8Array>, request: PackRequest, cache: CacheBounds) {
  const bytes = await whole;
  const { sha256 } = request.pack;
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  if (hex(digest) !== sha256.toLowerCase()) {
    throw new PackChanged('morphology pack whose digest is not the one Bluenaas gave');
  }
  if (bytes.byteLength > cache.maxBytes) return;
  await writeEntry(cache, packCacheKey(sha256), bytes.buffer as ArrayBuffer, bytes.byteLength);
}

const buffersOf = ({ segments, segmentCells, segmentTypes }: MorphologySegments) => [
  segments.buffer,
  segmentCells.buffer,
  segmentTypes.buffer,
];

export function createPackApi(cache: CacheBounds) {
  let opened: { readBox: Pack['readBox']; numbers: Uint32Array; whole: Promise<void> } | null =
    null;
  return {
    async open(
      request: PackRequest,
      populations: Population[],
      onProgress: OnProgress,
      freshHeaders?: FreshHeaders
    ): Promise<Opened> {
      let pack = await openCached(cache, packCacheKey(request.pack.sha256), request.pack.size);
      const fromCache = pack !== null;
      let whole = Promise.resolve();
      if (!pack) {
        const download = await downloadPack(request, onProgress, freshHeaders);
        pack = await openPack(download.file);
        whole = keep(download.whole, request, cache);
        whole.catch(() => {});
      }
      const numbers = pageCells(pack.data.populations, populations);
      opened = { readBox: pack.readBox, numbers, whole };
      const data = renumberSomas(pack.data, numbers, populations);
      // The boxes and the levels are copied, not handed over: the pack still reads by them.
      const { boxes, levels, readableAt } = pack;
      return Comlink.transfer({ data, boxes, levels, readableAt, fromCache }, [
        data.somas.buffer as ArrayBuffer,
      ]);
    },

    /** Resolves once the whole pack is in, checked and in the cache; rejects where the download or the check failed. */
    async whole(): Promise<void> {
      if (!opened) throw new Error('no morphology pack is open');
      await opened.whole;
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
