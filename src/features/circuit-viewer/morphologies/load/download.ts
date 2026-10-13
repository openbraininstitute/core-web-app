/**
 * The pack's bytes from OBI-One, which builds it while the request waits, or why it would not: a circuit too large to
 * build on request, one with no morphologies, or another build in the way.
 */

export interface PackRequest {
  url: string;
  headers: Record<string, string>;
}

export interface Refused {
  kind: 'refused';
  /** OBI-One's word for it, such as `too_many_neurons` or `busy`. */
  reason: string;
  /** The same in a sentence, with the numbers. */
  detail: string;
}

type Download = { kind: 'done'; bytes: Uint8Array } | Refused;

/** `total` is 0 where the server does not say. */
export type OnProgress = (received: number, total: number) => void;

/** Progress at most this often, ms: a message to the page per network chunk would be hundreds. */
const PROGRESS_MS = 100;

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
  const total = Number(response.headers.get('Content-Length')) || 0;
  const chunks: Uint8Array[] = [];
  let received = 0;
  let reportedAt = 0;
  let reported = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    const now = performance.now();
    if (now - reportedAt >= PROGRESS_MS) {
      reportedAt = now;
      reported = received;
      onProgress?.(received, total);
    }
  }
  if (reported !== received) onProgress?.(received, total);

  const bytes = new Uint8Array(received);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return { kind: 'done', bytes };
}
