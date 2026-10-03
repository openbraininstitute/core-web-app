// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type CacheBounds,
  readEntry,
  writeEntry,
} from '@/features/entities/em-cell-mesh/viewer/engine/asset-cache';
import { downloadGlb } from '@/features/entities/em-cell-mesh/viewer/engine/download';

import { FakeCacheStorage, fakeServer } from './fake-caches';
import { encodeGlb, torus } from './mesh-fixtures';

const URL_A = 'https://entitycore.test/em-cell-mesh/1/assets/a/download';
const BOUNDS: CacheBounds = { name: 'test-glb', ttlMs: 1000, maxBytes: 10_000 };

let storage: FakeCacheStorage;
let now = 1_000_000;

beforeEach(() => {
  storage = new FakeCacheStorage();
  vi.stubGlobal('caches', storage);
  vi.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const bytes = (n: number, fill = 7) => new Uint8Array(n).fill(fill);
const key = (name: string) => `https://entitycore.test/${name}`;

describe('the bounded cache', () => {
  it('gives back what it stored, whole', async () => {
    expect(await writeEntry(BOUNDS, key('a'), bytes(100).buffer, 100)).toBe(true);
    const read = await readEntry(BOUNDS, key('a'), 100);
    expect(new Uint8Array(read as ArrayBuffer)).toEqual(bytes(100));
  });

  it('deletes a short entry, left by an interrupted write, when it is read', async () => {
    await writeEntry(BOUNDS, key('a'), bytes(100).buffer, 100);
    const cache = storage.bucket(BOUNDS.name);
    const entry = cache.entries.get(key('a'));
    if (entry) entry.body = entry.body.slice(0, 60);
    expect(await readEntry(BOUNDS, key('a'), 100)).toBeNull();
    expect(cache.entries.has(key('a'))).toBe(false);
  });

  it('leaves no entry where the write fails partway, even where the browser commits what arrived', async () => {
    await writeEntry(BOUNDS, key('a'), bytes(10).buffer, 10);
    const cache = storage.bucket(BOUNDS.name);
    cache.quotaBytes = 50;
    cache.onFailure = 'partial';
    expect(await writeEntry(BOUNDS, key('b'), bytes(100).buffer, 100)).toBe(false);
    expect(cache.entries.has(key('b'))).toBe(false);
  });

  it('deletes expired entries on the next write', async () => {
    await writeEntry(BOUNDS, key('a'), bytes(10).buffer, 10);
    now += BOUNDS.ttlMs + 1;
    await writeEntry(BOUNDS, key('b'), bytes(10).buffer, 10);
    expect([...storage.bucket(BOUNDS.name).entries.keys()]).not.toContain(key('a'));
    expect(await readEntry(BOUNDS, key('b'))).not.toBeNull();
  });

  it('evicts the least recently opened past its size, keeping what was just read', async () => {
    await writeEntry(BOUNDS, key('a'), bytes(4000).buffer, 4000);
    now += 10;
    await writeEntry(BOUNDS, key('b'), bytes(4000).buffer, 4000);
    now += 10;
    expect(await readEntry(BOUNDS, key('a'))).not.toBeNull();
    now += 10;
    await writeEntry(BOUNDS, key('c'), bytes(4000).buffer, 4000);
    const kept = [...storage.bucket(BOUNDS.name).entries.keys()];
    expect(kept).toContain(key('a'));
    expect(kept).toContain(key('c'));
    expect(kept).not.toContain(key('b'));
  });

  it('forgets in its index the entries deleted outside its pruning', async () => {
    await writeEntry(BOUNDS, key('a'), bytes(100).buffer, 100);
    const cache = storage.bucket(BOUNDS.name);
    const entry = cache.entries.get(key('a'));
    if (entry) entry.body = entry.body.slice(0, 60);
    expect(await readEntry(BOUNDS, key('a'), 100)).toBeNull();
    await writeEntry(BOUNDS, key('b'), bytes(10).buffer, 10);
    const index = cache.entries.get('https://opened.invalid/');
    const opened = JSON.parse(new TextDecoder().decode(index?.body));
    expect(Object.keys(opened)).toEqual([key('b')]);
  });

  it('stores nothing larger than itself, and lets go of the stream it was given', async () => {
    const stream = new Response(bytes(20_000)).body as ReadableStream<Uint8Array>;
    expect(await writeEntry(BOUNDS, key('a'), stream, 20_000)).toBe(false);
    expect(stream.locked).toBe(false);
    await expect(stream.getReader().read()).resolves.toMatchObject({ done: true });
  });
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
    expect(storage.bucket(BOUNDS.name).entries.get(URL_A)?.body).toEqual(glb);
  });

  it('reads no more of a cached GLB than its header where the header is refused, and keeps the entry', async () => {
    const glb = await encodeGlb(torus(200, 100), 14);
    const { fetch, served } = fakeServer({ [URL_A]: glb });
    vi.stubGlobal('fetch', fetch);
    const request = { url: URL_A, headers: {}, size: glb.byteLength };
    const bounds = { ...BOUNDS, maxBytes: 1e9 };
    await downloadGlb(request, bounds, always);
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
