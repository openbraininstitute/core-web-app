/**
 * What the pack worker exposes over Comlink: a circuit's pack, stored as its asset, opened, from the cache a visit
 * before left it in, or as it comes in; opened once its somas are in, and put in the cache once the whole of it is
 * (`whole`). Then its boxes read as the view asks for them, each once its bytes are
 * in, with the cells numbered as the page numbers them, each box in Morton order (`mortonOrder`).
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
import { downloadPack, type OnProgress, type PackRequest } from './download';
import { mortonOrder } from './morton';
import { openPack, type Pack, PackError } from './pack';

import type {
  BoxRead,
  CircuitMorphologyData,
  MorphologySegments,
  PackBoxes,
  Population,
} from '../types';

/** A stored pack, an asset, whose content cannot change under its URL. */
export const STORED_PACK_CACHE = bucket('circuit-morphology-mpack');

/**
 * The pack opened: its somas and frame, with no segments, where its segments lie, and how much of the file each box
 * needs in to be read at each level (`Pack.readableAt`).
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

/** The pack once the whole of it is in, checked against its asset's digest, put in the cache. */
async function keep(whole: Promise<Uint8Array>, request: PackRequest, cache: CacheBounds) {
  const bytes = await whole;
  // Too large for the cache, it is not kept, nor checked: it is drawn already.
  if (bytes.byteLength > cache.maxBytes) return;
  const { sha256 } = request.stored;
  if (sha256) {
    const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
    if (hex(digest) !== sha256.toLowerCase()) {
      throw new PackError("morphology pack whose digest is not its asset's");
    }
  }
  await writeEntry(cache, request.url, bytes.buffer as ArrayBuffer, bytes.byteLength);
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
      onProgress: OnProgress
    ): Promise<Opened> {
      let pack = await openCached(cache, request.url, request.stored.size);
      const fromCache = pack !== null;
      let whole = Promise.resolve();
      if (!pack) {
        const download = await downloadPack(request, onProgress);
        pack = await openPack(download.file);
        whole = keep(download.whole, request, cache);
        whole.catch(() => {});
      }
      const numbers = pageCells(pack.data.populations, populations);
      opened = { readBox: pack.readBox, numbers, whole };
      const data = renumberSomas(pack.data, numbers, populations);
      // The boxes and the levels are copied, not handed over: the pack reads by them.
      const { boxes, levels, readableAt } = pack;
      return Comlink.transfer({ data, boxes, levels, readableAt, fromCache }, [
        data.somas.buffer as ArrayBuffer,
      ]);
    },

    /** Once the whole pack is in, checked and in the cache; it fails where the download did, or the check. */
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
