// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type CacheBounds, readEntry, writeEntry } from '@/features/viewer-3d/load/asset-cache';

import { FakeCacheStorage } from './fake-caches';

const BOUNDS: CacheBounds = { name: 'test-cache', ttlMs: 1000, maxBytes: 10_000 };

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

  it('gives back nothing of an entry past its lifetime, and deletes it', async () => {
    await writeEntry(BOUNDS, key('a'), bytes(10).buffer, 10);
    now += BOUNDS.ttlMs;
    expect(await readEntry(BOUNDS, key('a'))).toBeNull();
    expect(storage.bucket(BOUNDS.name).entries.has(key('a'))).toBe(false);
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
