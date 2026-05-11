import { ready } from 'h5wasm';

import { CIRCUIT_H5_CACHE } from '@/features/circuit-nodes/types';

export class AssetFetchError extends Error {
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
}: {
  url: string;
  headers: Record<string, string>;
  fileKey: string;
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
  let response = await cache.match(url);

  if (!response) {
    const fresh = await fetch(url, { headers });
    if (!fresh.ok) {
      throw new AssetFetchError(fresh.status, `Asset fetch failed (${fresh.status})`);
    }
    await cache.put(url, fresh);
    response = await cache.match(url);
    if (!response) {
      throw new AssetFetchError(0, 'CacheStorage match failed immediately after put');
    }
  }

  if (!response.body) {
    throw new AssetFetchError(0, 'Asset response has no body stream');
  }

  const reader = response.body.getReader();
  const stream = FS.open(filename, 'w+');
  try {
    let offset = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      FS.write(stream, value, 0, value.byteLength, offset);
      offset += value.byteLength;
    }
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
