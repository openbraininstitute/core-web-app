/**
 * The bytes of a pack stored as the circuit's asset as they come in, from entitycore, which sends the request on to S3.
 */
import {
  type OnProgress,
  type ThrottledProgress,
  throttledProgress,
} from '@/features/viewer-3d/load/progress';

import { Arriving } from './arriving';

export type { OnProgress };

export interface PackRequest {
  url: string;
  headers: Record<string, string>;
  /** The asset's size and digest, as entitycore has them. */
  stored: { size: number; sha256: string | null };
}

/**
 * The pack coming in, and the whole of it once it has, every byte the size said; a download cut short rejects, after
 * what came in is told it is all.
 */
export interface Download {
  file: Arriving;
  whole: Promise<Uint8Array>;
}

/** Answers once the response has come, with the body still coming. */
export async function downloadPack(
  request: PackRequest,
  onProgress?: OnProgress
): Promise<Download> {
  const response = await fetch(request.url, { headers: request.headers });
  if (!response.ok || !response.body) throw new Error(`Download failed (HTTP ${response.status})`);
  const { size } = request.stored;
  const file = new Arriving(size);
  const whole = fill(file, response, size, throttledProgress(size, onProgress));
  // A cut short or failed download is told the page's reads through `file`; `whole` may then go unheard.
  whole.catch(() => {});
  return { file, whole };
}

/**
 * The body into `file`. A pack of `size` cut short is asked once more from where it stopped, of the URL the request
 * was sent on to, the presigned one; which is sent nothing but the range, as S3 refuses a presigned request that also
 * carries a token. Every byte of the asset's size in is the whole of it, whatever broke the stream after.
 */
async function fill(
  file: Arriving,
  response: Response,
  size: number,
  progress: ThrottledProgress
): Promise<Uint8Array> {
  let cause = await readInto(file, response.body as ReadableStream<Uint8Array>, progress);
  if (file.in < size) cause = await resume(file, response.url, size, progress);
  progress.last(file.in);
  file.end();
  if (file.in !== size) {
    throw new Error(`Download of ${file.in} bytes, not the asset's ${size}`, { cause });
  }
  return file.all;
}

/** The rest of a file of `size` at `url` read into `file`; what broke it, or null. */
async function resume(
  file: Arriving,
  url: string,
  size: number,
  progress: ThrottledProgress
): Promise<unknown> {
  const rest = await fetch(url, { headers: { Range: `bytes=${file.in}-` } }).catch(
    (e: unknown) => e
  );
  if (!(rest instanceof Response)) return rest;
  if (
    rest.status === 206 &&
    rest.body &&
    Number(rest.headers.get('Content-Length')) === size - file.in
  ) {
    return readInto(file, rest.body, progress);
  }
  await rest.body?.cancel().catch(() => {});
  return new Error(`Download not resumed (HTTP ${rest.status})`);
}

/** A body read into `file` to its end; what broke it, or null. */
async function readInto(
  file: Arriving,
  body: ReadableStream<Uint8Array>,
  progress: ThrottledProgress
): Promise<unknown> {
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return null;
      file.add(value);
      progress.report(file.in);
    }
  } catch (e) {
    return e;
  }
}
