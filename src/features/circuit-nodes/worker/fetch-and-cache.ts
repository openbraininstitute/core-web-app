import { ready } from 'h5wasm';

import { CIRCUIT_H5_CACHE } from '@/features/circuit-nodes/types';

import type { DownloadProgress } from '@/features/circuit-nodes/types';

class AssetFetchError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AssetFetchError';
    this.status = status;
  }
}

/**
 * Streams the asset response body straight into the Emscripten FS, using `CacheStorage` to avoid
 * re-downloading the file across sessions. Returns the filename usable by `new h5wasm.File(...)`.
 *
 * Memory profile: peak ~chunk size + final file size in the worker; the main thread never sees
 * the bytes.
 */
export async function fetchToFS({
  url,
  headers,
  fileKey,
  onProgress,
}: {
  url: string;
  headers: Record<string, string>;
  fileKey: string;
  onProgress?: (progress: DownloadProgress) => void;
}): Promise<{ filename: string }> {
  const { FS } = await ready;
  if (!FS) throw new Error('h5wasm FS not initialized');

  const filename = `${fileKey}.h5`;
  try {
    FS.stat(filename);
    return { filename };
  } catch {
    /* not in FS yet */
  }

  const cache = await caches.open(CIRCUIT_H5_CACHE);
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
  // Only surface progress for genuine network downloads. A cache hit reads from disk fast enough that
  // the bar would just flicker, so we leave `progress` null and the UI shows the quick spinner.
  const reportProgress = cached ? undefined : onProgress;
  // Throttle progress emits so a 1 GB file doesn't flood the Comlink channel: when the total is
  // known, emit on each whole-percent change; otherwise emit roughly every 2 MB.
  let lastPercent = -1;
  let lastEmittedBytes = 0;
  const PROGRESS_BYTE_STEP = 2 * 1024 * 1024;
  try {
    let offset = 0;
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

  // Ensure the cross-session cache entry is fully written before returning.
  if (cachePut) await cachePut;

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
