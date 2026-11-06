import { deflateSync } from 'node:zlib';

import { readRanges } from './summary';

import type { LfpSummaryRequest, ReadRange } from './summary';

/** Each range read with a request of its own. */
export const rangeReader =
  (request: LfpSummaryRequest): ReadRange =>
  async (range) =>
    (await readRanges(request, [range]))[0];

/** A row as HDF5's shuffle and deflate filters leave it. */
export function deflated(values: readonly number[]): ArrayBuffer {
  const bytes = new Uint8Array(Int16Array.from(values).buffer);
  const shuffled = new Uint8Array(bytes.length);
  values.forEach((_, i) => {
    shuffled[i] = bytes[i * 2];
    shuffled[values.length + i] = bytes[i * 2 + 1];
  });
  const stream = deflateSync(shuffled);
  return stream.buffer.slice(
    stream.byteOffset,
    stream.byteOffset + stream.byteLength
  ) as ArrayBuffer;
}

/** Range reads answered as Starlette does: sorted, merged where they touch, several as multipart. */
export function answeringRanges(file: Uint8Array<ArrayBuffer>) {
  return async (_url: string, init: RequestInit) => {
    const asked = (init.headers as Record<string, string>).Range.slice('bytes='.length)
      .split(',')
      .map((part) => part.split('-').map(Number))
      .map(([start, last]) => [start, last + 1])
      .sort((a, b) => a[0] - b[0]);
    if (asked.length > 100) return new Response(file, { status: 200 });
    const merged: number[][] = [];
    for (const [start, end] of asked) {
      const previous = merged[merged.length - 1];
      if (previous && start <= previous[1]) previous[1] = Math.max(previous[1], end);
      else merged.push([start, end]);
    }
    const range = ([start, end]: number[]) => `bytes ${start}-${end - 1}/${file.length}`;
    if (merged.length === 1) {
      return new Response(file.slice(merged[0][0], merged[0][1]), {
        status: 206,
        headers: { 'Content-Range': range(merged[0]) },
      });
    }
    const encoder = new TextEncoder();
    const parts: Uint8Array[] = [];
    for (const part of merged) {
      parts.push(
        encoder.encode(`--b0undary\r\nContent-Type: x\r\nContent-Range: ${range(part)}\r\n\r\n`)
      );
      parts.push(file.slice(part[0], part[1]), encoder.encode('\r\n'));
    }
    parts.push(encoder.encode('--b0undary--'));
    const body = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
    parts.reduce((at, p) => {
      body.set(p, at);
      return at + p.length;
    }, 0);
    return new Response(body, {
      status: 206,
      headers: { 'Content-Type': 'multipart/byteranges; boundary=b0undary' },
    });
  };
}
