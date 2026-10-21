/**
 * The pack's bytes as they come in: from OBI-One, which builds it while the request waits, or why it would not (a
 * circuit too large to build on request, one with no morphologies, or another build in the way); or a pack stored as
 * the circuit's asset, from entitycore, which sends the request on to S3.
 */
import { Arriving } from './arriving';

export interface PackRequest {
  url: string;
  headers: Record<string, string>;
  /** A pack stored as the circuit's asset: its size and digest, as entitycore has them. */
  stored?: { size: number; sha256: string | null };
}

export interface Refused {
  kind: 'refused';
  /** OBI-One's word for it, such as `too_many_neurons` or `busy`. */
  reason: string;
  /** The same in a sentence, with the numbers. */
  detail: string;
}

/**
 * The pack coming in, and the whole of it once it has, every byte the size said; a download cut short rejects, after
 * what came in is told it is all.
 */
export type Download = { kind: 'started'; file: Arriving; whole: Promise<Uint8Array> } | Refused;

/** `total` is 0 where the server does not say. */
export type OnProgress = (received: number, total: number) => void;

/** Progress at most this often, ms: a message to the page per network chunk would be hundreds. */
const PROGRESS_MS = 100;

/** Answers once the response has come, with the body still coming. */
export async function downloadPack(
  request: PackRequest,
  onProgress?: OnProgress
): Promise<Download> {
  const response = await fetch(request.url, { headers: request.headers });
  if (!response.ok || !response.body) {
    const refusal = (await response.json().catch(() => null))?.detail;
    if (typeof refusal?.reason === 'string') {
      return { kind: 'refused', reason: refusal.reason, detail: String(refusal.detail ?? '') };
    }
    throw new Error(`Download failed (HTTP ${response.status})`);
  }
  const size = request.stored?.size ?? null;
  const total = size ?? (Number(response.headers.get('Content-Length')) || 0);
  const file = new Arriving(total);
  const whole = fill(file, response, size, progressOf(total, onProgress));
  // A cut short or failed download is told the page's reads through `file`; `whole` may then go unheard.
  whole.catch(() => {});
  return { kind: 'started', file, whole };
}

function progressOf(total: number, onProgress?: OnProgress) {
  let reportedAt = 0;
  let reported = 0;
  return {
    report(received: number) {
      const now = performance.now();
      if (now - reportedAt < PROGRESS_MS) return;
      reportedAt = now;
      reported = received;
      onProgress?.(received, total);
    },
    last(received: number) {
      if (reported !== received) onProgress?.(received, total);
    },
  };
}

type Progress = ReturnType<typeof progressOf>;

/**
 * The body into `file`. A stored pack of `size` cut short is asked once more from where it stopped, of the URL the
 * request was sent on to, the presigned one; which is sent nothing but the range, as S3 refuses a presigned request that
 * also carries a token.
 */
async function fill(
  file: Arriving,
  response: Response,
  size: number | null,
  progress: Progress
): Promise<Uint8Array> {
  let cause = await readInto(file, response.body as ReadableStream<Uint8Array>, progress);
  if (size !== null && file.in < size) cause = await resume(file, response.url, size, progress);
  progress.last(file.in);
  file.end();
  if (size !== null && file.in !== size) {
    throw new Error(`Download of ${file.in} bytes, not the asset's ${size}`, { cause });
  }
  // Every byte of an asset's size in is the whole of it, whatever broke the stream after.
  if (cause !== null && size === null) throw cause;
  return file.all;
}

/** The rest of a file of `size` at `url` read into `file`; what broke it, or null. */
async function resume(
  file: Arriving,
  url: string,
  size: number,
  progress: Progress
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
  progress: Progress
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
