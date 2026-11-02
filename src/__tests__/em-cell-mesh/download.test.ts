// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadGlb } from '@/features/entities/em-cell-mesh/viewer/engine/download';
import { type CacheBounds, writeEntry } from '@/features/viewer-3d/load/asset-cache';

import { FakeCacheStorage, fakeServer } from '../viewer-3d/fake-caches';
import { encodeGlb, torus } from './mesh-fixtures';

const URL_A = 'https://entitycore.test/em-cell-mesh/1/assets/a/download';
const BOUNDS: CacheBounds = { name: 'test-glb', ttlMs: 1000, maxBytes: 10_000 };

let storage: FakeCacheStorage;
const now = 1_000_000;

beforeEach(() => {
  storage = new FakeCacheStorage();
  vi.stubGlobal('caches', storage);
  vi.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('downloadGlb', () => {
  const always = { onHeader: () => true };

  it('tees the download into the cache, keyed by the download URL, with progress to the end', async () => {
    const glb = await encodeGlb(torus(60, 24), 14);
    const { fetch, served } = fakeServer({ [URL_A]: glb });
    vi.stubGlobal('fetch', fetch);
    const progress: number[] = [];
    const result = await downloadGlb(
      { url: URL_A, headers: {}, size: glb.byteLength },
      { ...BOUNDS, maxBytes: 1e9 },
      { ...always, onProgress: (received) => progress.push(received) }
    );
    expect(result).toMatchObject({
      kind: 'done',
      fromCache: false,
      header: { triangles: 60 * 24 * 2 },
    });
    expect(result.kind === 'done' && result.bytes).toEqual(glb);
    expect(progress.at(-1)).toBe(glb.byteLength);
    // Handed on before the cache has it, which it does once `stored` settles.
    expect(result.kind === 'done' && (await result.stored)).toBe(true);
    expect(storage.bucket(BOUNDS.name).entries.get(URL_A)?.body).toEqual(glb);

    // The second time, from the cache, which the fake gives back in one chunk: in one step to the end.
    progress.length = 0;
    const again = await downloadGlb(
      { url: URL_A, headers: {}, size: glb.byteLength },
      { ...BOUNDS, maxBytes: 1e9 },
      { ...always, onProgress: (received) => progress.push(received) }
    );
    expect(again).toMatchObject({ kind: 'done', fromCache: true });
    expect(served.requests).toBe(1);
    expect(progress).toEqual([glb.byteLength]);
  });

  it('downloads again over a short cache entry, and replaces it, asking about the header once', async () => {
    const glb = await encodeGlb(torus(60, 24), 14);
    const { fetch, served } = fakeServer({ [URL_A]: glb });
    vi.stubGlobal('fetch', fetch);
    const bounds = { ...BOUNDS, maxBytes: 1e9 };
    // Past the header, which the short entry holds.
    const short = glb.slice(0, glb.byteLength >> 1);
    await writeEntry(bounds, URL_A, short.buffer, glb.byteLength);
    const onHeader = vi.fn(() => true);
    const result = await downloadGlb({ url: URL_A, headers: {}, size: glb.byteLength }, bounds, {
      onHeader,
    });
    expect(result).toMatchObject({ kind: 'done', fromCache: false });
    expect(served.requests).toBe(1);
    expect(onHeader).toHaveBeenCalledTimes(1);
    if (result.kind === 'done') await result.stored;
    expect(storage.bucket(BOUNDS.name).entries.get(URL_A)?.body).toEqual(glb);
  });

  it('reads no more of a cached GLB than its header where the header is refused, and keeps the entry', async () => {
    const glb = await encodeGlb(torus(200, 100), 14);
    const { fetch, served } = fakeServer({ [URL_A]: glb });
    vi.stubGlobal('fetch', fetch);
    const request = { url: URL_A, headers: {}, size: glb.byteLength };
    const bounds = { ...BOUNDS, maxBytes: 1e9 };
    const first = await downloadGlb(request, bounds, always);
    if (first.kind === 'done') await first.stored;
    const cache = storage.bucket(BOUNDS.name);
    cache.chunk = 512;
    const result = await downloadGlb(request, bounds, {
      onHeader: (header) => header.triangles < 1000,
    });
    expect(result).toMatchObject({ kind: 'stopped', header: { triangles: 200 * 100 * 2 } });
    expect(served.requests).toBe(1);
    expect(cache.chunksRead).toBeLessThan(glb.byteLength / 512 / 2);
    // There for a "Load anyway".
    expect(cache.entries.get(URL_A)?.body).toEqual(glb);
  });

  it('stops as soon as the header is refused, and caches nothing', async () => {
    const glb = await encodeGlb(torus(200, 100), 14);
    const { fetch, served } = fakeServer({ [URL_A]: glb }, { chunk: 512 });
    vi.stubGlobal('fetch', fetch);
    const result = await downloadGlb(
      { url: URL_A, headers: {}, size: glb.byteLength },
      { ...BOUNDS, maxBytes: 1e9 },
      { onHeader: (header) => header.triangles < 1000 }
    );
    expect(result).toMatchObject({ kind: 'stopped', header: { triangles: 200 * 100 * 2 } });
    expect(served.aborted).toBe(1);
    expect(served.chunks).toBeLessThan(glb.byteLength / 512 / 2);
    expect(storage.bucket(BOUNDS.name).entries.has(URL_A)).toBe(false);
  });

  it('fails a download that ends early, leaving no entry', async () => {
    const glb = await encodeGlb(torus(60, 24), 14);
    const { fetch } = fakeServer({ [URL_A]: glb.slice(0, glb.byteLength - 10) }, { length: false });
    vi.stubGlobal('fetch', fetch);
    await expect(
      downloadGlb(
        { url: URL_A, headers: {}, size: glb.byteLength },
        { ...BOUNDS, maxBytes: 1e9 },
        always
      )
    ).rejects.toThrow('ended early');
    expect(storage.bucket(BOUNDS.name).entries.has(URL_A)).toBe(false);
  });
});
