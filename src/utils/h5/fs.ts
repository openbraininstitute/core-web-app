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
  try {
    FS.stat(filename);
    return { filename };
  } catch {
    /* not in FS yet */
  }

  const cached = await cache.match(url);

  // Stream the *live network response* into the FS while tee-ing a second branch into CacheStorage,
  // so progress reflects the actual download (not a fast local cache read). The network is the
  // bottleneck, so the tee's buffers stay near-empty and memory stays at ~chunk + final file size.
  let body: ReadableStream<Uint8Array> | null;
  let total: number | null;
  let cachePut: Promise<void> | null = null;

  if (cached) {
    if (!cached.body) {
      throw new AssetFetchError(0, 'Asset response has no body stream');
    }
    body = cached.body;
    total = Number(cached.headers.get('content-length')) || null;
  } else {
    const fresh = await fetch(url, { headers });
    if (!fresh.ok) {
      throw new AssetFetchError(fresh.status, `Asset fetch failed (${fresh.status})`);
    }
    if (!fresh.body) {
      throw new AssetFetchError(0, 'Asset response has no body stream');
    }
    total = Number(fresh.headers.get('content-length')) || null;
    const [toFs, toCache] = fresh.body.tee();
    // Best-effort cross-session cache. The .catch keeps this from becoming an unhandled rejection if
    // the FS-write loop below throws and we bail before awaiting it; a failed write just re-downloads.
    cachePut = cache
      .put(url, new Response(toCache, { headers: fresh.headers, status: 200 }))
      .catch(() => {});
    body = toFs;
  }

  const reader = body.getReader();
  const stream = FS.open(filename, 'w+');
  // Size the file up front where the length is known. Emscripten's MEMFS grows a backing buffer
  // by a factor of 1.125 once past a megabyte, reallocating and copying every time — over a
  // multi-hundred-megabyte download that is several times the file size in memcpy, and it needs
  // the old and new buffers side by side at each step. One allocation avoids all of it.
  if (total) FS.truncate(filename, total);
  // Only surface progress for genuine network downloads. A cache hit reads from disk fast enough that
  // the bar would just flicker, so we leave `progress` null and the UI shows the quick spinner.
  const reportProgress = cached ? undefined : onProgress;
  // When the total is known, emit on each whole-percent change; otherwise emit roughly every 2 MB.
  let lastPercent = -1;
  let lastEmittedBytes = 0;
  let offset = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      FS.write(stream, value, 0, value.byteLength, offset);
      offset += value.byteLength;
      if (reportProgress) {
        if (total) {
          const percent = Math.floor((offset / total) * 100);
          if (percent !== lastPercent) {
            lastPercent = percent;
            reportProgress({ received: offset, total });
          }
        } else if (offset - lastEmittedBytes >= PROGRESS_BYTE_STEP) {
          lastEmittedBytes = offset;
          reportProgress({ received: offset, total });
        }
      }
    }
    reportProgress?.({ received: offset, total });
  } catch (err) {
    try {
      FS.unlink(filename);
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    FS.close(stream);
  }

  // Content-Length is a promise, not a guarantee. Give back whatever the pre-sizing over-allocated
  // rather than leaving the file padded with zeros.
  if (total && offset < total) FS.truncate(filename, offset);

  // Deliberately not awaited. The FS copy is complete and is the only one this session reads;
  // `cache.put` is disk-bound and still draining the tee's backlog, so waiting for it would park
  // the viewer on a finished progress bar. It already has a `.catch`, and `put` is atomic — a
  // worker torn down mid-write leaves no entry rather than a partial one, costing a re-download.
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
    FS.writeFile(filename, new Uint8Array(buffer));
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
