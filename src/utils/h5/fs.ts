import { ready } from 'h5wasm';

/**
 * Download progress reported from a worker's fetch loop. `total` is null when the response
 * carries no Content-Length.
 */
export type DownloadProgress = {
  received: number;
  total: number | null;
};

class AssetFetchError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AssetFetchError';
    this.status = status;
  }
}

/** Throttle progress emits so a 1 GB file doesn't flood the Comlink channel. */
const PROGRESS_BYTE_STEP = 2 * 1024 * 1024;

/** The eight bytes every HDF5 file begins with. */
const HDF5_SIGNATURE = [0x89, 0x48, 0x44, 0x46, 0x0d, 0x0a, 0x1a, 0x0a];

type EmscriptenFS = Awaited<typeof ready>['FS'];
type FSStream = ReturnType<EmscriptenFS['open']>;

/** The body length a response promises, or null where it doesn't say. */
function contentLength(response: Response): number | null {
  return Number(response.headers.get('content-length')) || null;
}

/**
 * Whether the file behind an open stream starts with HDF5's signature.
 *
 * A download of the right length need not be the right bytes — an error page served with a
 * matching `Content-Length`, or a cache entry holding something else entirely. Eight bytes here
 * name the problem, in place of a wall of `HDF5-DIAG` frames from inside `H5Fopen`.
 */
function readsAsHDF5(FS: EmscriptenFS, stream: FSStream): boolean {
  const head = new Uint8Array(HDF5_SIGNATURE.length);
  // Positional, so the write position the stream is left at doesn't come into it.
  const read = FS.read(stream, head, 0, head.length, 0);

  return read === head.length && HDF5_SIGNATURE.every((byte, index) => head[index] === byte);
}

/**
 * Write a file under a staging name, publishing it as `filename` once `write` returns.
 *
 * A file under `filename` is then always a complete one — which is what lets callers take finding
 * one as enough. In MEMFS a rename is a relink of the node, so this costs nothing. Should `write`
 * throw, nothing is left behind under either name.
 *
 * (Two writers of one `fileKey` in the same worker would collide on the staging name, as they
 * already would on the final one; there is one download per worker.)
 */
async function publishToFS(
  FS: EmscriptenFS,
  filename: string,
  write: (partial: string) => void | Promise<void>
): Promise<void> {
  const partial = `${filename}.part`;

  try {
    await write(partial);
    FS.rename(partial, filename);
  } catch (err) {
    try {
      FS.unlink(partial);
    } catch {
      /* nothing staged */
    }
    throw err;
  }
}

/**
 * Stream a body into the FS, publishing it as `filename` once it holds up.
 *
 * Throws, leaving nothing behind, if the body ends short of the length it declared or what arrives
 * is not an HDF5 file.
 */
function streamToFS({
  FS,
  filename,
  body,
  total,
  onProgress,
}: {
  FS: EmscriptenFS;
  filename: string;
  body: ReadableStream<Uint8Array>;
  total: number | null;
  onProgress?: (progress: DownloadProgress) => void;
}): Promise<void> {
  return publishToFS(FS, filename, async (partial) => {
    const reader = body.getReader();
    const stream = FS.open(partial, 'w+');
    // Size the file up front where the length is known. Emscripten's MEMFS grows a backing buffer
    // by a factor of 1.125 once past a megabyte, reallocating and copying every time — over a
    // multi-hundred-megabyte download that is several times the file size in memcpy, and it needs
    // the old and new buffers side by side at each step. One allocation avoids all of it.
    if (total) FS.truncate(partial, total);
    // When the total is known, emit on each whole-percent change; otherwise roughly every 2 MB.
    let lastPercent = -1;
    let lastEmittedBytes = 0;
    let offset = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        FS.write(stream, value, 0, value.byteLength, offset);
        offset += value.byteLength;
        if (onProgress) {
          if (total) {
            const percent = Math.floor((offset / total) * 100);
            if (percent !== lastPercent) {
              lastPercent = percent;
              onProgress({ received: offset, total });
            }
          } else if (offset - lastEmittedBytes >= PROGRESS_BYTE_STEP) {
            lastEmittedBytes = offset;
            onProgress({ received: offset, total });
          }
        }
      }
      onProgress?.({ received: offset, total });

      // Content-Length is a promise the transfer either keeps or breaks. A body that ends early is
      // an interrupted download rather than a lenient server, and trimming the file to what did
      // arrive would hand HDF5 something it opens and then rejects at the superblock, several
      // layers from the cause. Only a short body is a failure: a `Content-Encoding` response counts
      // encoded bytes in the header and yields decoded ones through the stream, so a longer one is
      // legitimate.
      if (total && offset < total) {
        throw new AssetFetchError(0, `Asset download ended early: ${offset} of ${total} bytes`);
      }
      if (!readsAsHDF5(FS, stream)) {
        throw new AssetFetchError(0, 'Asset is not an HDF5 file');
      }
    } finally {
      FS.close(stream);
    }
  });
}

/**
 * Restore the file from its cache entry, reporting whether that worked.
 *
 * A cache entry is untrusted input. An interrupted `cache.put` can leave a body shorter than the
 * `Content-Length` it was stored under — Firefox does, where Chrome commits nothing — and the key
 * is a URL that does not change from one attempt to the next, so a partial entry would otherwise
 * fail every future read of the asset the same way, a reload included. So it is read back under
 * the same checks as any other download, and dropped if it doesn't hold up.
 */
async function restoreFromCache({
  FS,
  cache,
  url,
  filename,
}: {
  FS: EmscriptenFS;
  cache: Cache;
  url: string;
  filename: string;
}): Promise<boolean> {
  const cached = await cache.match(url);
  if (!cached) return false;

  try {
    if (!cached.body) throw new AssetFetchError(0, 'Cached asset has no body stream');
    // No progress reporting: a cache hit reads from disk fast enough that the bar would only
    // flicker, so the UI shows its quick spinner instead.
    await streamToFS({ FS, filename, body: cached.body, total: contentLength(cached) });

    return true;
  } catch {
    // Whatever the entry turned out to be, it can not be trusted. Drop it and let the caller
    // download afresh, rather than reporting an error whose only answer is a reload.
    await cache.delete(url);

    return false;
  }
}

/**
 * Streams the asset response body straight into the Emscripten FS, using `CacheStorage` to avoid
 * re-downloading the file across sessions. Returns the filename usable by `new h5wasm.File(...)`.
 *
 * The Emscripten FS belongs to the WASM instance of the thread that instantiated it, so this only
 * makes sense inside the worker that will go on to read the file.
 *
 * Memory profile: peak ~chunk size + final file size in the worker; the main thread never sees
 * the bytes.
 */
export async function fetchToFS({
  url,
  headers,
  fileKey,
  cacheName,
  extension = '.h5',
  onProgress,
}: {
  url: string;
  headers: Record<string, string>;
  fileKey: string;
  /** `CacheStorage` bucket to read from and write to. Keep one per asset kind. */
  cacheName: string;
  extension?: string;
  onProgress?: (progress: DownloadProgress) => void;
}): Promise<{ filename: string }> {
  // Instantiating the WASM module and opening the CacheStorage bucket are independent, and on a
  // cold worker the former is the slower of the two — running them in series would add it to the
  // front of every download.
  const [{ FS }, cache] = await Promise.all([ready, caches.open(cacheName)]);
  if (!FS) throw new Error('h5wasm FS not initialized');

  const filename = `${fileKey}${extension}`;
  // A file only ever appears under this name complete — `publishToFS` renames it into place — so
  // finding one is enough on its own.
  try {
    FS.stat(filename);
    return { filename };
  } catch {
    /* not in FS yet */
  }

  if (await restoreFromCache({ FS, cache, url, filename })) return { filename };

  const fresh = await fetch(url, { headers });
  if (!fresh.ok) {
    throw new AssetFetchError(fresh.status, `Asset fetch failed (${fresh.status})`);
  }
  if (!fresh.body) {
    throw new AssetFetchError(0, 'Asset response has no body stream');
  }
  const total = contentLength(fresh);

  // Stream the *live network response* into the FS while tee-ing a second branch into CacheStorage,
  // so progress reflects the actual download (not a fast local cache read). The network is the
  // bottleneck, so the tee's buffers stay near-empty and memory stays at ~chunk + final file size.
  //
  // Only a response that declares its length is cached at all: the entry is checked against that
  // length on the way back out, and one carrying no length could not be told apart from a
  // truncated copy of itself.
  let body = fresh.body;
  let cachePut: Promise<void> | null = null;
  if (total) {
    const [toFs, toCache] = fresh.body.tee();
    // Best-effort cross-session cache. The .catch keeps this from becoming an unhandled rejection if
    // the FS-write loop below throws and we bail before awaiting it; a failed write just re-downloads.
    cachePut = cache
      .put(url, new Response(toCache, { headers: fresh.headers, status: 200 }))
      .catch(() => {});
    body = toFs;
  }

  try {
    await streamToFS({ FS, filename, body, total, onProgress });
  } catch (err) {
    // Anything the put committed is a partial of the same download. Awaited before the delete
    // because it would otherwise be free to land after it; the tee's source has ended by here, so
    // it settles at once.
    await cachePut;
    await cache.delete(url);
    throw err;
  }

  // Deliberately not awaited. The FS copy is complete and is the only one this session reads;
  // `cache.put` is disk-bound and still draining the tee's backlog, so waiting for it would park
  // the viewer on a finished progress bar. It already has a `.catch`, and a worker torn down
  // mid-put can leave a partial entry — which is why `restoreFromCache` verifies every read.
  void cachePut;

  return { filename };
}

/**
 * Write an already-downloaded buffer to the Emscripten FS, skipping if already present.
 * Prefer `fetchToFS` where the worker can do the download itself — this keeps the whole file
 * in memory on top of the copy in the FS.
 *
 * Like `fetchToFS`, this hands back only the filename; clean up through `unlinkFromFS` so the
 * FS handle stays inside this module.
 */
export async function writeToFS(
  fileKey: string,
  buffer: ArrayBuffer,
  extension = '.h5'
): Promise<{ filename: string }> {
  const { FS } = await ready;
  if (!FS) throw new Error('h5wasm FS not initialized');
  const filename = `${fileKey}${extension}`;

  try {
    FS.stat(filename);
  } catch {
    await publishToFS(FS, filename, (partial) => FS.writeFile(partial, new Uint8Array(buffer)));
  }

  return { filename };
}

export async function unlinkFromFS(filename: string): Promise<void> {
  const { FS } = await ready;
  if (!FS) return;
  try {
    FS.unlink(filename);
  } catch {
    /* file already gone */
  }
}
