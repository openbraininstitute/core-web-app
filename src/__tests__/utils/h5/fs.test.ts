import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchToFS, writeToFS } from '@/utils/h5/fs';

import type { DownloadProgress } from '@/utils/h5/fs';

/** The module object `ready` resolves to, with its FS swapped in per test. */
const h5 = vi.hoisted(() => ({ FS: null as unknown }));

vi.mock('h5wasm', () => ({ ready: Promise.resolve(h5) }));

const DOWNLOAD_URL = 'https://entitycore.test/electrical-cell-recording/abc/assets/def/download';

const HDF5_SIGNATURE = [0x89, 0x48, 0x44, 0x46, 0x0d, 0x0a, 0x1a, 0x0a];

type FakeFile = { bytes: Uint8Array };
type FakeEntry = { bytes: Uint8Array; headers: Record<string, string> };

/** Bytes that pass the signature check, so these tests are about lengths and not content. */
function hdf5Bytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  bytes.set(HDF5_SIGNATURE);
  for (let i = HDF5_SIGNATURE.length; i < length; i += 1) bytes[i] = i % 251;

  return bytes;
}

function bodyOf(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

/** A response that sends `bytes` while declaring `declared` — the interrupted-transfer case. */
function responseOf(bytes: Uint8Array, declared: number | null = bytes.length): Response {
  return new Response(bodyOf(bytes), {
    status: 200,
    headers: declared === null ? {} : { 'content-length': String(declared) },
  });
}

/** Enough of Emscripten's MEMFS for the download path: positional writes, reads and a rename. */
function createFakeFS() {
  const files = new Map<string, FakeFile>();

  const get = (path: string): FakeFile => {
    const file = files.get(path);
    if (!file) throw new Error(`ENOENT: ${path}`);

    return file;
  };

  const resize = (file: FakeFile, size: number): void => {
    if (file.bytes.length === size) return;
    const next = new Uint8Array(size);
    next.set(file.bytes.subarray(0, Math.min(size, file.bytes.length)));
    file.bytes = next;
  };

  const FS = {
    stat: (path: string) => ({ size: get(path).bytes.length }),
    open: (path: string, flags: string) => {
      if (flags.startsWith('w')) files.set(path, { bytes: new Uint8Array(0) });
      get(path);

      return { path };
    },
    close: () => {},
    truncate: (path: string, len: number) => resize(get(path), len),
    write: (
      stream: { path: string },
      buffer: Uint8Array,
      offset: number,
      length: number,
      position: number
    ) => {
      const file = get(stream.path);
      if (position + length > file.bytes.length) resize(file, position + length);
      file.bytes.set(buffer.subarray(offset, offset + length), position);

      return length;
    },
    read: (
      stream: { path: string },
      buffer: Uint8Array,
      offset: number,
      length: number,
      position: number
    ) => {
      const { bytes } = get(stream.path);
      const slice = bytes.subarray(position, Math.min(position + length, bytes.length));
      buffer.set(slice, offset);

      return slice.length;
    },
    rename: (from: string, to: string) => {
      files.set(to, get(from));
      files.delete(from);
    },
    unlink: (path: string) => {
      get(path);
      files.delete(path);
    },
    writeFile: (path: string, data: Uint8Array) => {
      files.set(path, { bytes: new Uint8Array(data) });
    },
  };

  return { FS, files };
}

/** A `CacheStorage` that buffers bodies, so `match` can hand back a readable one every time. */
function createFakeCaches() {
  const entries = new Map<string, FakeEntry>();

  const cache = {
    match: async (url: string) => {
      const entry = entries.get(url);

      return entry ? new Response(bodyOf(entry.bytes), { headers: entry.headers }) : undefined;
    },
    put: async (url: string, response: Response) => {
      const bytes = new Uint8Array(await response.arrayBuffer());
      entries.set(url, { bytes, headers: Object.fromEntries(response.headers.entries()) });
    },
    delete: async (url: string) => entries.delete(url),
  };

  return { caches: { open: async () => cache } as unknown as CacheStorage, entries };
}

let files: Map<string, FakeFile>;
let entries: Map<string, FakeEntry>;

function fetchAsset(onProgress?: (progress: DownloadProgress) => void) {
  return fetchToFS({
    url: DOWNLOAD_URL,
    headers: {},
    fileKey: 'cell',
    cacheName: 'test-bucket',
    extension: '.nwb',
    onProgress,
  });
}

beforeEach(() => {
  const fs = createFakeFS();
  h5.FS = fs.FS;
  files = fs.files;

  const cacheStorage = createFakeCaches();
  entries = cacheStorage.entries;
  vi.stubGlobal('caches', cacheStorage.caches);
});

describe('fetchToFS', () => {
  it('publishes a complete download under the final name', async () => {
    const bytes = hdf5Bytes(4096);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => responseOf(bytes))
    );
    const progress: DownloadProgress[] = [];

    const { filename } = await fetchAsset((next) => progress.push(next));

    expect(filename).toBe('cell.nwb');
    expect(files.get('cell.nwb')?.bytes).toEqual(bytes);
    expect(files.has('cell.nwb.part')).toBe(false);
    expect(progress.at(-1)).toEqual({ received: 4096, total: 4096 });
    // The put is deliberately not awaited, so give it a turn to land.
    await vi.waitFor(() => expect(entries.get(DOWNLOAD_URL)?.bytes).toEqual(bytes));
  });

  it('rejects a body that ends short of its content-length, leaving nothing behind', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => responseOf(hdf5Bytes(1024), 4096))
    );

    await expect(fetchAsset()).rejects.toThrow('ended early: 1024 of 4096 bytes');
    expect(files.size).toBe(0);
    // Whatever the put committed is a partial of the same download, so it goes too.
    expect(entries.size).toBe(0);
  });

  it('rejects bytes that are not an HDF5 file', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => responseOf(new Uint8Array(1024).fill(7)))
    );

    await expect(fetchAsset()).rejects.toThrow('not an HDF5 file');
    expect(files.size).toBe(0);
  });

  it('drops a truncated cache entry and downloads afresh', async () => {
    const bytes = hdf5Bytes(4096);
    // What an interrupted `cache.put` leaves behind: the full length in the header, part of the
    // body behind it. Trusting it is what handed HDF5 a file it rejected at the superblock.
    entries.set(DOWNLOAD_URL, {
      bytes: bytes.subarray(0, 1024),
      headers: { 'content-length': '4096' },
    });
    const fetchMock = vi.fn(async () => responseOf(bytes));
    vi.stubGlobal('fetch', fetchMock);

    const { filename } = await fetchAsset();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(files.get(filename)?.bytes).toEqual(bytes);
    expect(files.has(`${filename}.part`)).toBe(false);
  });

  it('serves a sound cache entry without touching the network', async () => {
    const bytes = hdf5Bytes(2048);
    entries.set(DOWNLOAD_URL, { bytes, headers: { 'content-length': '2048' } });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const progress: DownloadProgress[] = [];

    const { filename } = await fetchAsset((next) => progress.push(next));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(files.get(filename)?.bytes).toEqual(bytes);
    // A cache hit reads fast enough that a progress bar would only flicker.
    expect(progress).toHaveLength(0);
  });

  it('does not cache a response that declares no length', async () => {
    const bytes = hdf5Bytes(2048);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => responseOf(bytes, null))
    );

    const { filename } = await fetchAsset();

    expect(files.get(filename)?.bytes).toEqual(bytes);
    // Nothing a later read could check it against, so it is not worth keeping.
    expect(entries.size).toBe(0);
  });

  it('reuses a file already in the FS', async () => {
    const fetchMock = vi.fn(async () => responseOf(hdf5Bytes(2048)));
    vi.stubGlobal('fetch', fetchMock);

    await fetchAsset();
    await fetchAsset();

    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe('writeToFS', () => {
  it('publishes under the final name, leaving no staging file', async () => {
    const { filename } = await writeToFS('spikes', hdf5Bytes(512).buffer as ArrayBuffer);

    expect(filename).toBe('spikes.h5');
    expect(files.has('spikes.h5')).toBe(true);
    expect(files.has('spikes.h5.part')).toBe(false);
  });
});
