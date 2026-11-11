/**
 * The bytes of a circuit's pack as they come in, from Bluenaas, which serves it from its cache.
 */
import {
  type OnProgress,
  type ThrottledProgress,
  throttledProgress,
} from '@/features/viewer-3d/load/progress';

import { Arriving } from './arriving';

export type { OnProgress };

/** The largest pack downloaded, more than the browser could draw. */
export const MOST_PACK_BYTES = 2 ** 31;

/** The bytes are not the pack Bluenaas said it had: it was built again since. */
export class PackChanged extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PackChanged';
  }
}

/** The request's headers as they are now, with a token that has not run out. */
export type FreshHeaders = () => Promise<Record<string, string>>;

export interface PackRequest {
  url: string;
  headers: Record<string, string>;
  /** The pack's size and digest, as Bluenaas has them. */
  pack: { size: number; sha256: string };
}

/**
 * The pack as it comes in, and the whole pack once every byte of its size is in. A download cut short rejects `whole`
 * after ending `file`, so the reads waiting on it learn that nothing more is coming.
 */
export interface Download {
  file: Arriving;
  whole: Promise<Uint8Array>;
}

/** Resolves once the response arrives, while the body is still coming in. */
export async function downloadPack(
  request: PackRequest,
  onProgress?: OnProgress,
  freshHeaders?: FreshHeaders
): Promise<Download> {
  const { size } = request.pack;
  if (!Number.isSafeInteger(size) || size <= 0 || size > MOST_PACK_BYTES) {
    throw new Error(`Morphology pack of ${size} bytes`);
  }
  const response = await fetch(request.url, { headers: request.headers });
  if (!response.ok || !response.body) throw new Error(`Download failed (HTTP ${response.status})`);
  const file = new Arriving(size);
  const headers = freshHeaders ?? (() => Promise.resolve(request.headers));
  const whole = fill(file, request, headers, response, throttledProgress(size, onProgress));
  // The page's reads through `file` learn of a download cut short or failed, so nothing may listen to `whole`.
  whole.catch(() => {});
  return { file, whole };
}

/**
 * Reads the body into `file`. If it stops short of the pack's size, the rest is asked for once, with fresh headers,
 * since the token may have run out. Once every byte of the size is in, the pack is whole, whatever broke the stream
 * after. A body longer than the size is another pack.
 */
async function fill(
  file: Arriving,
  request: PackRequest,
  headers: FreshHeaders,
  response: Response,
  progress: ThrottledProgress
): Promise<Uint8Array> {
  const { size } = request.pack;
  let cause = await readInto(file, response.body as ReadableStream<Uint8Array>, size, progress);
  if (file.in < size) cause = await resume(file, request, headers, progress);
  progress.last(file.in);
  file.end();
  if (cause instanceof PackChanged) throw cause;
  if (file.in !== size) {
    throw new Error(`Download of ${file.in} bytes, not the pack's ${size}`, { cause });
  }
  return file.all;
}

/** Reads the rest of the pack into `file`. Returns what broke it, or null. */
async function resume(
  file: Arriving,
  { url, pack: { size } }: PackRequest,
  headers: FreshHeaders,
  progress: ThrottledProgress
): Promise<unknown> {
  const rest = await headers()
    .then((now) => fetch(url, { headers: { ...now, Range: `bytes=${file.in}-` } }))
    .catch((e: unknown) => e);
  if (!(rest instanceof Response)) return rest;
  if (
    rest.status === 206 &&
    rest.body &&
    Number(rest.headers.get('Content-Length')) === size - file.in
  ) {
    return readInto(file, rest.body, size, progress);
  }
  await rest.body?.cancel().catch(() => {});
  return new Error(`Download not resumed (HTTP ${rest.status})`);
}

/** Reads a body into `file` to its end, or up to `size` where it runs past. Returns what broke it, or null. */
async function readInto(
  file: Arriving,
  body: ReadableStream<Uint8Array>,
  size: number,
  progress: ThrottledProgress
): Promise<unknown> {
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return null;
      if (file.in + value.byteLength > size) {
        file.add(value.subarray(0, size - file.in));
        await reader.cancel().catch(() => {});
        return new PackChanged(`Download longer than the pack's ${size} bytes`);
      }
      file.add(value);
      progress.report(file.in);
    }
  } catch (e) {
    return e;
  }
}
