/**
 * The GLB's bytes, from the cache or downloaded into it, as `fetchToFS` does for HDF5 files: the body is teed, one
 * branch filling a buffer of the asset's size, with progress, and the other going to Cache Storage. Keyed by the
 * entitycore download URL, which holds the asset's id and doesn't change, unlike the presigned S3 URL behind it.
 *
 * The header is checked as soon as its JSON chunk has arrived, which is the GLB's first few kilobytes: a mesh too
 * large for the browser stops the download there. A GLB in the cache is read the same way, so that one refused is not
 * read whole either.
 */
import { type CacheBounds, deleteEntry, openEntry, writeEntry } from './asset-cache';
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

type Read =
  | { kind: 'stopped'; header: MeshHeader }
  | { kind: 'read'; bytes: Uint8Array; header: MeshHeader | null };

/** Progress at most this often, ms: a message to the page per network chunk would be thousands. */
const PROGRESS_MS = 100;

export async function downloadGlb(
  request: DownloadRequest,
  cache: CacheBounds | null,
  hooks: DownloadHooks
): Promise<Download> {
  // Asked once: a short entry in the cache sends the read on to the network after its header.
  let verdict: Promise<boolean> | null = null;
  const check = (header: MeshHeader) => {
    verdict ??= Promise.resolve(hooks.onHeader(header));
    return verdict;
  };

  const entry = cache && (await openEntry(cache, request.url));
  if (entry) {
    const read = await readBody(entry, request.size, hooks, check).catch(() => null);
    if (read?.kind === 'stopped') return read;
    if (read?.header && read.bytes.byteLength === request.size) {
      return { kind: 'done', bytes: read.bytes, fromCache: true, header: read.header };
    }
    // Short or broken, as an interrupted write leaves it: downloaded afresh.
    await deleteEntry(cache, request.url);
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

  let read: Read;
  try {
    read = await readBody(body, total, hooks, check);
  } catch (e) {
    await drop();
    throw e;
  }
  if (read.kind === 'stopped') {
    await drop();
    return read;
  }
  const received = read.bytes.byteLength;
  if (received < total) {
    await drop();
    throw new Error(`Download ended early: ${received} of ${total} bytes`);
  }
  if (!read.header) {
    await drop();
    throw new Error('not a GLB file');
  }
  // Awaited, so that a second viewer of the same mesh finds the entry.
  await stored;
  return { kind: 'done', bytes: read.bytes, fromCache: false, header: read.header };
}

/**
 * A body read into a buffer of `total` bytes, grown where it is longer, with progress. The header is checked as soon
 * as its JSON chunk has arrived, and the read stops there if it is refused.
 */
async function readBody(
  body: ReadableStream<Uint8Array>,
  total: number,
  hooks: DownloadHooks,
  check: (header: MeshHeader) => Promise<boolean>
): Promise<Read> {
  let bytes = new Uint8Array(total);
  let received = 0;
  let header: MeshHeader | null = null;
  let reportedAt = 0;
  let reported = 0;
  const reader = body.getReader();
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
      if (header && !(await check(header))) {
        // Not awaited: a branch of a tee is only done cancelling once the other branch is.
        reader.cancel().catch(() => {});
        return { kind: 'stopped', header };
      }
    }
    const now = performance.now();
    if (now - reportedAt >= PROGRESS_MS) {
      reportedAt = now;
      reported = received;
      hooks.onProgress?.(received, total);
    }
  }
  if (reported !== received) hooks.onProgress?.(received, total);
  return { kind: 'read', bytes: bytes.subarray(0, received), header };
}

function headerOf(bytes: Uint8Array, received: number): MeshHeader | null {
  const json = readGlbJson(bytes, received);
  return json && meshHeader(json);
}
