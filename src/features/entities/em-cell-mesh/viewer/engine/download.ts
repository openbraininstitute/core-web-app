/**
 * The GLB's bytes, from the cache or downloaded into it, as `fetchToFS` does for HDF5 files: the body is teed, one
 * branch filling a buffer of the asset's size, with progress, and the other going to Cache Storage. Keyed by the
 * entitycore download URL, which holds the asset's id and doesn't change, unlike the presigned S3 URL behind it.
 *
 * The header is checked as soon as its JSON chunk has arrived, which is the GLB's first few kilobytes: a mesh too
 * large for the browser stops the download there.
 */
import { type CacheBounds, deleteEntry, readEntry, writeEntry } from './asset-cache';
import { type MeshHeader, meshHeader, readGlbJson } from './glb';

export interface DownloadRequest {
  url: string;
  headers: Record<string, string>;
  /** The asset's size, from entitycore. */
  size: number;
}

export interface DownloadHooks {
  onProgress?(received: number, total: number): void;
  /** Called once with the header; false stops the download. */
  onHeader(header: MeshHeader): boolean | Promise<boolean>;
}

export type Download =
  | { kind: 'done'; bytes: Uint8Array; fromCache: boolean; header: MeshHeader }
  | { kind: 'stopped'; header: MeshHeader };

/** Progress at most this often, ms: a message to the page per network chunk would be thousands. */
const PROGRESS_MS = 100;

export async function downloadGlb(
  request: DownloadRequest,
  cache: CacheBounds | null,
  hooks: DownloadHooks
): Promise<Download> {
  const cached = cache && (await readEntry(cache, request.url, request.size));
  if (cached) {
    const bytes = new Uint8Array(cached);
    const header = headerOf(bytes, bytes.byteLength);
    if (!header) throw new Error('not a GLB file');
    hooks.onProgress?.(bytes.byteLength, bytes.byteLength);
    if (!(await hooks.onHeader(header))) return { kind: 'stopped', header };
    return { kind: 'done', bytes, fromCache: true, header };
  }

  const abort = new AbortController();
  const response = await fetch(request.url, { headers: request.headers, signal: abort.signal });
  if (!response.ok || !response.body) throw new Error(`Download failed (HTTP ${response.status})`);
  const total = Number(response.headers.get('Content-Length')) || request.size;
  let body = response.body;
  let stored: Promise<boolean> | null = null;
  if (cache && total === request.size) {
    const [mine, theirs] = body.tee();
    stored = writeEntry(cache, request.url, theirs, total, 'model/gltf-binary');
    body = mine;
  }

  /** Stop the download and the write into the cache, which leaves no entry. */
  const drop = async () => {
    abort.abort();
    if (stored && cache && (await stored)) await deleteEntry(cache, request.url);
  };

  let bytes = new Uint8Array(total);
  let received = 0;
  let header: MeshHeader | null = null;
  let reported = 0;
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (received + value.byteLength > bytes.byteLength) {
        // Longer than announced: grow rather than fail, as a server without a length may be right.
        const grown = new Uint8Array(Math.max(2 * bytes.byteLength, received + value.byteLength));
        grown.set(bytes.subarray(0, received));
        bytes = grown;
      }
      bytes.set(value, received);
      received += value.byteLength;
      if (!header) {
        header = headerOf(bytes, received);
        if (header && !(await hooks.onHeader(header))) {
          await drop();
          return { kind: 'stopped', header };
        }
      }
      const now = performance.now();
      if (now - reported >= PROGRESS_MS) {
        reported = now;
        hooks.onProgress?.(received, total);
      }
    }
  } catch (e) {
    await drop();
    throw e;
  }
  if (received < total) {
    await drop();
    throw new Error(`Download ended early: ${received} of ${total} bytes`);
  }
  hooks.onProgress?.(received, total);
  if (!header) {
    await drop();
    throw new Error('not a GLB file');
  }
  // Awaited, so that a second viewer of the same mesh finds the entry.
  await stored;
  return { kind: 'done', bytes: bytes.subarray(0, received), fromCache: false, header };
}

function headerOf(bytes: Uint8Array, received: number): MeshHeader | null {
  const json = readGlbJson(bytes, received);
  return json && meshHeader(json);
}
