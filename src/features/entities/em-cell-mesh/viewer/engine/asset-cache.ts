/**
 * A Cache Storage bucket kept in bounds: entries expire after a while, and past a total size the least recently opened
 * go first. The browser may still drop the bucket (Safari after a week without a visit): it is only a cache.
 *
 * An entry is untrusted on the way out. An interrupted write can leave a short body under the full Content-Length
 * (Firefox does), so a body of the wrong length is deleted, and the caller downloads afresh.
 */

export interface CacheBounds {
  name: string;
  ttlMs: number;
  maxBytes: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const bucket = (name: string): CacheBounds => ({
  name,
  ttlMs: 30 * DAY_MS,
  maxBytes: 500 * 2 ** 20,
});

export const GLB_CACHE = bucket('em-cell-mesh-glb');
export const STAND_IN_CACHE = bucket('em-cell-mesh-stand-in');
export const FULL_CACHE = bucket('em-cell-mesh-full');

/** When each entry was stored, as `checkCache` in `src/api/cache-storage.ts` reads it. */
const STORED_AT = 'x-cache-timestamp';
/** An entry of its own, never fetched: when each entry was last opened, by key. */
const OPENED = 'https://opened.invalid/';

function available(): boolean {
  return typeof caches !== 'undefined';
}

const normal = (key: string) => new URL(key).href;

/** The key of what is made from the asset at `url`, `param` naming what and `version` how. */
export function versionedKey(url: string, param: string, version: string): string {
  const key = new URL(url);
  key.searchParams.set(param, version);
  return key.href;
}

const align = (n: number) => (n + 3) & ~3;
const PAD = new Uint8Array(3);

/**
 * An entry of a JSON header and arrays: the header's length in 4 bytes, the header, then each array on a 4-byte
 * boundary. A Blob, which `writeEntry` stores without another copy.
 */
export function packEntry(header: { version: string }, arrays: ArrayBufferView[]): Blob {
  const json = new TextEncoder().encode(JSON.stringify(header));
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, json.byteLength, true);
  const parts: ArrayBufferView[] = [
    length,
    json,
    PAD.subarray(0, align(json.byteLength) - json.byteLength),
  ];
  for (const a of arrays) parts.push(a, PAD.subarray(0, align(a.byteLength) - a.byteLength));
  return new Blob(parts as BlobPart[]);
}

/**
 * The header of an entry `packEntry` made, and `next`, the offset of each array in turn, given its bytes; null where
 * the entry is of another version.
 */
export function unpackEntry<H extends { version: string }>(
  buffer: ArrayBuffer,
  version: string
): { header: H; next(bytes: number): number } | null {
  const length = new DataView(buffer).getUint32(0, true);
  const header: H = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, length)));
  if (header.version !== version) return null;
  let offset = align(4 + length);
  return {
    header,
    next(bytes) {
      const at = offset;
      offset += align(bytes);
      return at;
    },
  };
}

/** The entry if it is there and fresh; an expired one is deleted. */
async function fresh(cache: Cache, bounds: CacheBounds, key: string): Promise<Response | null> {
  const hit = await cache.match(key);
  if (!hit) return null;
  if (Date.now() - Number(hit.headers.get(STORED_AT)) < bounds.ttlMs) return hit;
  await cache.delete(key);
  return null;
}

/** The entry's body if it is there, fresh and whole, which counts as opening it; null otherwise. */
export async function readEntry(
  bounds: CacheBounds,
  key: string,
  size?: number
): Promise<ArrayBuffer | null> {
  if (!available()) return null;
  try {
    const cache = await caches.open(bounds.name);
    const hit = await fresh(cache, bounds, key);
    if (!hit) return null;
    const expected = size ?? Number(hit.headers.get('Content-Length'));
    // A short entry is touched too, and forgotten by the next `prune`.
    const [body] = await Promise.all([hit.arrayBuffer(), touch(cache, normal(key))]);
    if (body.byteLength !== expected) {
      await cache.delete(key);
      return null;
    }
    return body;
  } catch {
    return null;
  }
}

/** Whether the entry is there and fresh, without reading it, which doesn't count as opening it. */
export async function hasEntry(bounds: CacheBounds, key: string): Promise<boolean> {
  if (!available()) return false;
  try {
    return (await fresh(await caches.open(bounds.name), bounds, key)) !== null;
  } catch {
    return false;
  }
}

/**
 * The entry's body as a stream, if it is there and fresh, which counts as opening it; null otherwise. The reader can
 * stop early, and must check that the body is whole, deleting it (`deleteEntry`) where it is short.
 */
export async function openEntry(
  bounds: CacheBounds,
  key: string
): Promise<ReadableStream<Uint8Array> | null> {
  if (!available()) return null;
  try {
    const cache = await caches.open(bounds.name);
    const hit = await fresh(cache, bounds, key);
    if (!hit?.body) return null;
    await touch(cache, normal(key));
    return hit.body;
  } catch {
    return null;
  }
}

/**
 * Store a body of `size` bytes: a stream (a branch of a download's tee, say) is read to its end. A write that fails,
 * the stream erroring with it, leaves no entry. Then expired entries are deleted, and the least recently opened past
 * the bucket's size. Resolves whether the entry was stored.
 */
export async function writeEntry(
  bounds: CacheBounds,
  key: string,
  body: ReadableStream<Uint8Array> | Blob | ArrayBuffer,
  size: number,
  contentType = 'application/octet-stream'
): Promise<boolean> {
  if (!available() || size > bounds.maxBytes) {
    // A branch of a tee left unread would hold the whole download in memory.
    if (body instanceof ReadableStream) await body.cancel().catch(() => {});
    return false;
  }
  let cache: Cache | null = null;
  try {
    cache = await caches.open(bounds.name);
    const headers = {
      'Content-Type': contentType,
      'Content-Length': String(size),
      [STORED_AT]: String(Date.now()),
    };
    await cache.put(key, new Response(body, { headers }));
    await prune(cache, bounds, normal(key));
    return true;
  } catch {
    // A quota error, or the download aborted: whatever was committed is a partial copy.
    await cache?.delete(key).catch(() => {});
    if (body instanceof ReadableStream) await body.cancel().catch(() => {});
    return false;
  }
}

export async function deleteEntry(bounds: CacheBounds, key: string): Promise<void> {
  if (!available()) return;
  try {
    await (await caches.open(bounds.name)).delete(key);
  } catch {
    // Nothing to do: a stale entry fails its length check on the way out.
  }
}

async function readOpened(cache: Cache): Promise<Record<string, number>> {
  const hit = await cache.match(OPENED);
  return hit ? hit.json() : {};
}

async function writeOpened(cache: Cache, index: Record<string, number>): Promise<void> {
  await cache.put(OPENED, new Response(JSON.stringify(index)));
}

/** Mark the entry as opened now. */
async function touch(cache: Cache, key: string): Promise<void> {
  const index = await readOpened(cache);
  index[key] = Date.now();
  await writeOpened(cache, index);
}

async function prune(cache: Cache, bounds: CacheBounds, written: string): Promise<void> {
  const index = await readOpened(cache);
  const now = Date.now();
  const entries: { key: string; size: number; opened: number }[] = [];
  const requests = (await cache.keys()).filter((r) => r.url !== OPENED);
  const hits = await Promise.all(requests.map((r) => cache.match(r)));
  for (const [i, request] of requests.entries()) {
    const key = request.url;
    const hit = hits[i];
    const stored = Number(hit?.headers.get(STORED_AT));
    if (!hit || !(now - stored < bounds.ttlMs)) {
      await cache.delete(request);
      continue;
    }
    const size = Number(hit.headers.get('Content-Length')) || 0;
    entries.push({ key, size, opened: key === written ? now : (index[key] ?? stored) });
  }
  entries.sort((a, b) => a.opened - b.opened);
  let total = entries.reduce((sum, e) => sum + e.size, 0);
  // Made afresh from the entries left, so that it forgets those deleted anywhere else too: short, expired, aborted.
  const opened: Record<string, number> = {};
  for (const e of entries) {
    if (total > bounds.maxBytes && e.key !== written) {
      await cache.delete(e.key);
      total -= e.size;
    } else opened[e.key] = e.opened;
  }
  await writeOpened(cache, opened);
}
