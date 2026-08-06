import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { sha256HexOfBlob } from './hash';

function nodeSha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

describe('sha256HexOfBlob', () => {
  it('hashes a small blob to the known sha256 test vector', async () => {
    // sha256("abc") — FIPS 180-2 appendix B.1
    await expect(sha256HexOfBlob(new Blob(['abc']))).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });

  it('matches node:crypto on a multi-chunk blob', async () => {
    const bytes = new Uint8Array(3 * 1024 * 1024).map((_, i) => i % 251);
    await expect(sha256HexOfBlob(new Blob([bytes]))).resolves.toBe(nodeSha256(bytes));
  });

  it('reports monotonically increasing progress up to the blob size', async () => {
    const bytes = new Uint8Array(1024 * 1024);
    const reports: number[] = [];
    await sha256HexOfBlob(new Blob([bytes]), { onProgress: (n) => reports.push(n) });

    expect(reports.length).toBeGreaterThan(0);
    expect(reports).toEqual([...reports].sort((a, b) => a - b));
    expect(reports.at(-1)).toBe(bytes.byteLength);
  });

  it('rejects when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      sha256HexOfBlob(new Blob(['abc']), { signal: controller.signal })
    ).rejects.toThrow();
  });
});
