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

export const GLB_CACHE: CacheBounds = {
  name: 'em-cell-mesh-glb',
  ttlMs: 30 * DAY_MS,
  maxBytes: 500 * 2 ** 20,
};

export const STAND_IN_CACHE: CacheBounds = {
  name: 'em-cell-mesh-stand-in',
  ttlMs: 30 * DAY_MS,
  maxBytes: 500 * 2 ** 20,
};

/** When each entry was stored, as `checkCache` in `src/api/cache-storage.ts` reads it. */
const STORED_AT = 'x-cache-timestamp';
/** An entry of its own, never fetched: when each entry was last opened, by key. */
const OPENED = 'https://opened.invalid/';

function available(): boolean {
  return typeof caches !== 'undefined';
}

const normal = (key: string) => new URL(key).href;

/** The entry's body if it is there, fresh and whole, which counts as opening it; null otherwise. */
export async function readEntry(
  bounds: CacheBounds,
  key: string,
  size?: number
): Promise<ArrayBuffer | null> {
  if (!available()) return null;
  try {
    const cache = await caches.open(bounds.name);
    const hit = await cache.match(key);
    if (!hit) return null;
    const stored = Number(hit.headers.get(STORED_AT));
    const expected = size ?? Number(hit.headers.get('Content-Length'));
    const body = Date.now() - stored < bounds.ttlMs ? await hit.arrayBuffer() : null;
    if (!body || body.byteLength !== expected) {
      await cache.delete(key);
      return null;
    }
    await touch(cache, [normal(key)], []);
    return body;
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

/** Mark the `opened` keys as opened now, and forget the `gone` ones. */
async function touch(
  cache: Cache,
  opened: string[],
  gone: string[],
  read?: Record<string, number>
): Promise<void> {
  const index = read ?? (await readOpened(cache));
  const now = Date.now();
  for (const key of opened) index[key] = now;
  for (const key of gone) delete index[key];
  await cache.put(OPENED, new Response(JSON.stringify(index)));
}

async function prune(cache: Cache, bounds: CacheBounds, written: string): Promise<void> {
  const index = await readOpened(cache);
  const now = Date.now();
  const entries: { key: string; size: number; opened: number }[] = [];
  const gone: string[] = [];
  const requests = (await cache.keys()).filter((r) => r.url !== OPENED);
  const hits = await Promise.all(requests.map((r) => cache.match(r)));
  for (const [i, request] of requests.entries()) {
    const key = request.url;
    const hit = hits[i];
    const stored = Number(hit?.headers.get(STORED_AT));
    if (!hit || !(now - stored < bounds.ttlMs)) {
      await cache.delete(request);
      gone.push(key);
      continue;
    }
    const size = Number(hit.headers.get('Content-Length')) || 0;
    entries.push({ key, size, opened: key === written ? now : (index[key] ?? stored) });
  }
  entries.sort((a, b) => a.opened - b.opened);
  let total = entries.reduce((sum, e) => sum + e.size, 0);
  for (const e of entries) {
    if (total <= bounds.maxBytes || e.key === written) break;
    await cache.delete(e.key);
    gone.push(e.key);
    total -= e.size;
  }
  await touch(cache, [written], gone, index);
}
