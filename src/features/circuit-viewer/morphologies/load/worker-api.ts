/**
 * What the pack worker exposes over Comlink. It opens a circuit's pack, either from the cache where an earlier visit
 * left it or as it comes in from Bluenaas. A downloaded pack opens once its somas are in, and goes into the cache once
 * all of it is in (`whole`). The worker then reads the pack's boxes as the view asks for them, each once its bytes are
 * in, with the cells numbered as the page numbers them and each box in Morton order (`mortonOrder`).
 *
 * The worker holds the pack's bytes only while they come in. A pack in the cache is read from its entry a block at a
 * time (`blobEntry`), and a downloaded one likewise once it is kept there; one that is not kept stays in memory.
 */
import * as Comlink from 'comlink';

import { blobEntry, bucket, type CacheBounds, deleteEntry, writeEntry } from '@/utils/asset-cache';

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
import { blobSource, type PackSource, Unreadable } from './pack-source';

import type {
  BoxRead,
  CircuitMorphologyData,
  MorphologySegments,
  PackBoxes,
  Population,
} from '../types';
import type { Arriving } from './arriving';

/** Packs by their digest: Bluenaas serves a circuit's pack under one URL and rebuilds it when its cache is cleared. */
export const PACK_CACHE = { ...bucket('circuit-morphology-mpack'), maxBytes: 2 ** 30 };

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
  const blob = await blobEntry(cache, key, size);
  if (!blob) return null;
  try {
    return await openPack(blobSource(blob));
  } catch (e) {
    // Not a sound pack, or an entry the browser cannot read: either way it is downloaded again.
    if (!(e instanceof PackError || e instanceof Unreadable)) throw e;
    await deleteEntry(cache, key);
    return null;
  }
}

const hex = (digest: ArrayBuffer) =>
  Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');

/**
 * Checks the whole pack against its digest once it is in, and puts it in the cache if it fits. Resolves whether it
 * was put there.
 */
async function keep(
  whole: Promise<Uint8Array>,
  request: PackRequest,
  cache: CacheBounds
): Promise<boolean> {
  const bytes = await whole;
  const { sha256 } = request.pack;
  const digest = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  if (hex(digest) !== sha256.toLowerCase()) {
    throw new PackChanged('morphology pack whose digest is not the one Bluenaas gave');
  }
  return writeEntry(cache, packCacheKey(sha256), bytes.buffer as ArrayBuffer, bytes.byteLength);
}

/**
 * A pack's bytes, which can come to be held somewhere else while the pack is open. A read of the pack may hold a part
 * of them until it is over, so what held them is let go of only once `moveTo` resolves.
 */
class Held implements PackSource {
  private reads = new Set<Promise<unknown>>();

  constructor(private from: PackSource) {}

  read(start: number, end: number): Promise<Uint8Array | null> {
    return this.from.read(start, end);
  }

  /** `pack`, opened on these bytes, with each of its reads known to be under way until it is over. */
  watching({ readBox, ...pack }: Pack): Pack {
    return {
      ...pack,
      readBox: (level, box) => {
        const read = readBox(level, box);
        const over = () => this.reads.delete(read);
        this.reads.add(read);
        read.then(over, over);
        return read;
      },
    };
  }

  /** Reads from `source` from now on; resolves once the reads begun before are over. */
  async moveTo(source: PackSource): Promise<void> {
    this.from = source;
    await Promise.allSettled([...this.reads]);
  }
}

/**
 * Has the pack that was downloaded and kept read from its entry in the cache, and lets go of the download. Where the
 * entry cannot be opened, or the browser cannot read a byte of it, the download stays.
 */
async function readStored(
  held: Held,
  download: Arriving,
  { pack }: PackRequest,
  cache: CacheBounds
): Promise<void> {
  const blob = await blobEntry(cache, packCacheKey(pack.sha256), pack.size);
  if (!blob) return;
  const stored = blobSource(blob);
  try {
    await stored.read(0, 1);
  } catch (e) {
    if (!(e instanceof Unreadable)) throw e;
    return;
  }
  await held.moveTo(stored);
  download.release();
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
        const held = new Held(download.file);
        pack = held.watching(await openPack(held));
        whole = keep(download.whole, request, cache).then((kept) =>
          kept ? readStored(held, download.file, request, cache) : undefined
        );
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

    /**
     * Resolves once the whole pack is in, checked, in the cache and read from there; rejects where the download or the
     * check failed.
     */
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
