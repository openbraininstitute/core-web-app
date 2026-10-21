// @vitest-environment node
import { createHash } from 'node:crypto';

import * as Comlink from 'comlink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  pageCells,
  renumberSegments,
  renumberSomas,
} from '@/features/circuit-viewer/morphologies/load/cells';
import {
  type LoadOptions,
  loadCircuitMorphologies,
} from '@/features/circuit-viewer/morphologies/load/load';
import { mortonOrder } from '@/features/circuit-viewer/morphologies/load/morton';
import { openPack } from '@/features/circuit-viewer/morphologies/load/pack';
import {
  createPackApi,
  PACK_CACHE,
  type PackApi,
  STORED_PACK_CACHE,
} from '@/features/circuit-viewer/morphologies/load/worker-api';

import { FakeCacheStorage, fakeServer } from '../viewer-3d/fake-caches';
import { indexEnd, indexOf, joined, pack } from './packs';

import type { OnProgress } from '@/features/circuit-viewer/morphologies/load/download';
import type {
  CircuitMorphologyData,
  MorphologySegments,
  Population,
} from '@/features/circuit-viewer/morphologies/types';
import type { CacheBounds } from '@/features/viewer-3d/load/asset-cache';
import type { WorkerHandle } from '@/features/viewer-3d/load/worker-handle';

const URL_A = 'https://obi-one.test/circuit/viz/a/morphology-pack?all_levels=true';
const BOUNDS: CacheBounds = { name: 'test-pack', ttlMs: 60_000, maxBytes: 2 ** 20 };
const STORED: CacheBounds = { name: 'test-mpack', ttlMs: 60_000, maxBytes: 2 ** 20 };
/** The pack's own, in its order: a page with these numbers its cells as the pack does. */
const POPULATIONS = [
  { name: 'excitatory', cells: 3 },
  { name: 'inhibitory', cells: 2 },
];

const small = () => pack('small');
/** Not a pack: its first byte is another. */
function broken(): Uint8Array {
  const bytes = small();
  bytes[0] ^= 0xff;
  return bytes;
}

interface TestWorker extends WorkerHandle<PackApi> {
  terminated: boolean;
  /** As a worker out of memory does. */
  die(): void;
  /** What the worker handed over, as it has it after. */
  handedOver: ArrayBufferLike[];
}

let storage: FakeCacheStorage;
let workers: TestWorker[];
let progress: [number, number][];

beforeEach(() => {
  storage = new FakeCacheStorage();
  workers = [];
  progress = [];
  vi.stubGlobal('caches', storage);
});

afterEach(() => {
  for (const worker of workers) worker.terminate();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** A worker in this thread: the API behind a MessageChannel, as Comlink sees a worker, so arrays are really transferred. */
function inProcess(): TestWorker {
  const { port1, port2 } = new MessageChannel();
  let fail: (e: Error) => void = () => {};
  const died = new Promise<never>((_, reject) => {
    fail = reject;
  });
  died.catch(() => {});
  const api = createPackApi(BOUNDS, STORED);
  const handedOver: ArrayBufferLike[] = [];
  const exposed: PackApi = {
    async open(...args) {
      const opened = await api.open(...args);
      if (opened.kind === 'opened') handedOver.push(opened.data.somas.buffer);
      return opened;
    },
    whole: () => api.whole(),
    async read(wanted) {
      const read = await api.read(wanted);
      for (const { segments } of read) handedOver.push(segments.buffer);
      return read;
    },
  };
  Comlink.expose(exposed, port1);
  const worker: TestWorker = {
    api: Comlink.wrap<PackApi>(port2),
    died,
    terminated: false,
    handedOver,
    die: () => fail(new Error('the worker ran out of memory')),
    terminate() {
      worker.terminated = true;
      port1.close();
      port2.close();
    },
  };
  workers.push(worker);
  return worker;
}

const load = (overrides: Partial<LoadOptions> = {}) =>
  loadCircuitMorphologies({
    request: { url: URL_A, headers: { Authorization: 'Bearer token' } },
    populations: POPULATIONS,
    signal: new AbortController().signal,
    onProgress: (received, total) => progress.push([received, total]),
    worker: inProcess,
    ...overrides,
  });

async function loaded(overrides?: Partial<LoadOptions>) {
  const result = await load(overrides);
  if (result.kind !== 'loaded') throw new Error(`refused: ${result.reason}`);
  return result;
}

/** A load, once the whole pack is in and kept. */
const kept = async (overrides?: Partial<LoadOptions>) => (await loaded(overrides)).whole;

/**
 * What a load of `bytes` hands over for a page of `populations`: the pack opened, its somas numbered the page's way;
 * downloaded, with how much each box needs in.
 */
async function opened(
  bytes: Uint8Array,
  populations: Population[] = POPULATIONS,
  downloaded = true
) {
  const { data, boxes, levels, readableAt } = await openPack(bytes);
  const page = renumberSomas(data, pageCells(data.populations, populations), populations);
  const arrival = { readableAt, received: expect.any(Function), listen: expect.any(Function) };
  const chunks = { boxes, levels, read: expect.any(Function) };
  return { ...page, chunks: downloaded ? { ...chunks, arrival } : chunks };
}

/** A load of `bytes` as `toEqual` takes it. */
const outcome = async (bytes: Uint8Array, fromCache = false) => ({
  kind: 'loaded',
  fromCache,
  data: await opened(bytes, POPULATIONS, !fromCache),
  whole: expect.any(Promise),
});

/** Every box of a level of `bytes` as the worker reads it: the cells numbered the page's way, each box in Morton order. */
async function asRead(bytes: Uint8Array, level = 0, populations = POPULATIONS) {
  const own = await openPack(bytes);
  const numbers = pageCells(own.data.populations, populations);
  const boxes = Array.from(own.levels[level].segments, (_, box) =>
    own.readBox(level, box).then((read) => mortonOrder(renumberSegments(read, numbers)))
  );
  return joined(await Promise.all(boxes));
}

/** Every box of a level, read through the load's data. */
async function readLevel(data: CircuitMorphologyData, level = 0): Promise<MorphologySegments> {
  const chunks = data.chunks;
  if (!chunks) throw new Error('no chunks');
  const boxes = Array.from({ length: chunks.boxes.length / 6 }, (_, box) => ({ level, box }));
  return joined(await chunks.read(boxes));
}

const serve = (bytes: Uint8Array, options?: { length: boolean }) => {
  const server = fakeServer({ [URL_A]: bytes }, options);
  const fetch = vi.fn(server.fetch);
  vi.stubGlobal('fetch', fetch);
  return { fetch, served: server.served };
};

const answer = (status: number, body: unknown) =>
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify(body), { status }));

const cached = () => storage.bucket(BOUNDS.name).entries.get(URL_A);

function replaceCached(body: Uint8Array) {
  const entry = cached();
  if (!entry) throw new Error('no pack in the cache');
  entry.body = body;
  entry.headers.set('Content-Length', String(body.byteLength));
}

describe('loadCircuitMorphologies', () => {
  it('fetches the pack, opens it, hands its somas over and keeps it in the cache once it is all in, the worker kept', async () => {
    const { fetch } = serve(small());
    const first = await loaded();

    expect(first).toEqual(await outcome(small()));
    await first.whole;
    expect(fetch).toHaveBeenCalledExactlyOnceWith(URL_A, {
      headers: { Authorization: 'Bearer token' },
    });
    const [worker] = workers;
    expect(worker.terminated).toBe(false);
    expect(worker.handedOver.map((buffer) => buffer.byteLength)).toEqual([0]);
    expect(cached()?.body).toEqual(small());
  });

  it("reads the pack's boxes from the worker, every level, and hands their arrays over", async () => {
    serve(small());
    const { data } = await loaded();

    for (const level of [0, 1, 2]) {
      expect(await readLevel(data, level)).toEqual(await asRead(small(), level));
    }
    expect(workers[0].handedOver.slice(1).every((buffer) => buffer.byteLength === 0)).toBe(true);
  });

  it('fails a read of a box that does not read, and reads the others', async () => {
    serve(small());
    const { data } = await loaded();
    const read = data.chunks?.read;

    await expect(read?.([{ level: 0, box: 1e6 }])).rejects.toThrow('without a box');
    await expect(read?.([{ level: 0, box: 0 }])).resolves.toHaveLength(1);
  });

  it('reports progress at most every 100 ms, and at the end', async () => {
    serve(small());
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    await kept();

    const size = small().byteLength;
    expect(progress).toEqual([
      [1024, size],
      [size, size],
    ]);
  });

  it('reports no total where the server gives none', async () => {
    serve(small(), { length: false });
    await kept();

    expect(progress.at(-1)).toEqual([small().byteLength, 0]);
  });

  it('reports nothing once the load has ended', async () => {
    let report: OnProgress = () => {};
    const api = {
      open(_request: unknown, _populations: unknown, onProgress: OnProgress) {
        report = onProgress;
        return new Promise<never>(() => {});
      },
    } as unknown as Comlink.Remote<PackApi>;
    const worker = () => ({ api, died: new Promise<never>(() => {}), terminate() {} });
    const abort = new AbortController();
    const promise = load({ signal: abort.signal, worker });
    report(1, 2);
    abort.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    report(2, 2);
    expect(progress).toEqual([[1, 2]]);
  });

  describe('once the whole pack has settled, a report come late on its own channel', () => {
    /** A load whose whole pack settles as the test says, and whose reports the test sends. */
    async function settling() {
      let report: OnProgress = () => {};
      let settle: (failure?: Error) => void = () => {};
      const all = new Promise<void>((resolve, reject) => {
        settle = (failure) => (failure ? reject(failure) : resolve());
      });
      const { data, boxes, levels, readableAt } = await openPack(small());
      const api = {
        async open(_request: unknown, _populations: unknown, onProgress: OnProgress) {
          report = onProgress;
          return { kind: 'opened', data, boxes, levels, readableAt, fromCache: false };
        },
        whole: () => all,
      } as unknown as Comlink.Remote<PackApi>;
      const worker = () => ({ api, died: new Promise<never>(() => {}), terminate() {} });
      const { data: shown, whole } = await loaded({ worker });
      const arrival = shown.chunks?.arrival;
      const told = vi.fn();
      arrival?.listen(told);
      return { report, settle, whole, arrival, told };
    }

    it('takes the whole pack as in where it all came, and moves nothing', async () => {
      const { report, settle, whole, arrival, told } = await settling();
      report(1, 2);
      expect(arrival?.received()).toBe(1);
      settle();
      await whole;
      report(1, 2);

      expect(arrival?.received()).toBe(Number.POSITIVE_INFINITY);
      expect(told).toHaveBeenCalledTimes(2);
      expect(progress).toEqual([[1, 2]]);
    });

    it('moves what is in where it did not all come, and is told the page no more', async () => {
      const { report, settle, whole, arrival, told } = await settling();
      report(1, 4);
      settle(new Error('Download not resumed (HTTP 403)'));
      await whole.catch(() => {});
      report(3, 4);

      expect(arrival?.received()).toBe(3);
      expect(told).toHaveBeenCalledTimes(2);
      expect(progress).toEqual([[1, 4]]);
    });
  });

  it('opens the pack from the cache on a later visit', async () => {
    const { served } = serve(small());
    await kept();
    expect(cached()?.body).toEqual(small());
    const onProgress = vi.fn();
    const second = await load({ onProgress });

    expect(second).toEqual(await outcome(small(), true));
    expect(served.requests).toBe(1);
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('keeps a pack for each URL', async () => {
    const other = URL_A.replace('/a/', '/b/');
    const server = fakeServer({ [URL_A]: small(), [other]: small() });
    vi.stubGlobal('fetch', server.fetch);
    await kept();
    const second = await loaded({ request: { url: other, headers: {} } });

    expect(second.fromCache).toBe(false);
    expect(server.served.requests).toBe(2);
  });

  it('drops a cached pack that does not open, and fetches it again', async () => {
    const { served } = serve(small());
    await kept();
    expect(cached()?.body).toEqual(small());
    replaceCached(broken());
    const again = await loaded();

    expect(again.fromCache).toBe(false);
    expect(again.data).toEqual(await opened(small()));
    await again.whole;
    expect(served.requests).toBe(2);
    expect(cached()?.body).toEqual(small());
  });

  it('fails on a pack that does not open, does not keep it, and terminates the worker', async () => {
    serve(broken());

    await expect(load()).rejects.toMatchObject({
      name: 'PackError',
      message: 'not a morphology pack',
    });
    expect(cached()).toBeUndefined();
    expect(workers[0].terminated).toBe(true);
  });

  it.each([
    [422, { reason: 'too_many_neurons', detail: 'The circuit has 6213 neurons' }],
    [503, { reason: 'busy', detail: 'Another pack is being built; try again' }],
  ])('gives the reason OBI-One refuses for (HTTP %i)', async (status, refusal) => {
    answer(status, { detail: { code: 'INVALID_REQUEST', ...refusal } });

    await expect(load()).resolves.toEqual({ kind: 'refused', ...refusal });
    expect(cached()).toBeUndefined();
    expect(workers[0].terminated).toBe(true);
  });

  it('takes a refusal with no sentence to it', async () => {
    answer(422, { detail: { reason: 'no_morphologies' } });

    await expect(load()).resolves.toEqual({
      kind: 'refused',
      reason: 'no_morphologies',
      detail: '',
    });
  });

  it.each([
    ['an error with no reason', () => answer(500, { detail: 'Internal Server Error' })],
    [
      'a body that is not JSON',
      () => vi.stubGlobal('fetch', async () => new Response('Bad Gateway', { status: 500 })),
    ],
  ])('fails on %s', async (_, stub) => {
    stub();

    await expect(load()).rejects.toThrow('Download failed (HTTP 500)');
    expect(workers[0].terminated).toBe(true);
  });

  it.each([
    [
      'in another order, with a population the pack has none of',
      [{ name: 'input', cells: 4 }, POPULATIONS[1], POPULATIONS[0]],
    ],
    ['without a population the pack has', [POPULATIONS[0]]],
  ])('numbers the cells as the page does, %s', async (_, page) => {
    serve(small());
    const { data } = await loaded({ populations: page });

    expect(data).toEqual(await opened(small(), page));
    const read = await readLevel(data);
    expect(read).toEqual(await asRead(small(), 0, page));
    expect(read.segmentCells.length).toBeGreaterThan(0);
  });

  it('fails where the page has another number of cells in a population than the pack', async () => {
    serve(small());
    const page = [{ name: 'excitatory', cells: 4 }, POPULATIONS[1]];

    await expect(load({ populations: page })).rejects.toThrow(
      '3 cells in excitatory, where the page has 4'
    );
  });

  it('stops when it is aborted, and terminates the worker', async () => {
    vi.stubGlobal('fetch', () => new Promise(() => {}));
    const abort = new AbortController();
    const promise = load({ signal: abort.signal });
    abort.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(workers[0].terminated).toBe(true);
  });

  it('terminates the worker when aborted once the pack is open, and reads no more', async () => {
    serve(small());
    const abort = new AbortController();
    const { data } = await loaded({ signal: abort.signal });
    abort.abort();

    expect(workers[0].terminated).toBe(true);
    await expect(data.chunks?.read([{ level: 0, box: 0 }])).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('starts no worker for a load aborted already', async () => {
    const abort = new AbortController();
    abort.abort();

    await expect(load({ signal: abort.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(workers).toEqual([]);
  });

  it('fails when the worker dies', async () => {
    vi.stubGlobal('fetch', () => new Promise(() => {}));
    const promise = load();
    workers[0].die();

    await expect(promise).rejects.toThrow('the worker ran out of memory');
    expect(workers[0].terminated).toBe(true);
  });

  describe('of a pack stored as the circuit asset', () => {
    const URL_S = 'https://entitycore.test/circuit/c/assets/p/download';
    const S3 = 'https://s3.test/pack?signature';
    const digestOf = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
    /** Past the somas, into the base. */
    const breakAt = (bytes: Uint8Array) => indexEnd(bytes) + indexOf(bytes).levels[2].offset + 40;

    /**
     * entitycore sending the request on to S3, which serves ranges; the `n`th response's body breaks at `breaks[n]`
     * bytes into the file, where there is one.
     */
    function storedServer(bytes: Uint8Array, breaks: number[]) {
      const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const range = (init?.headers as Record<string, string> | undefined)?.Range;
        const from = range ? Number(range.slice('bytes='.length, -1)) : 0;
        const to = breaks[fetch.mock.calls.length - 1] ?? bytes.byteLength;
        let sent = false;
        const body = new ReadableStream<Uint8Array>({
          pull(controller) {
            if (!sent) {
              sent = true;
              controller.enqueue(bytes.slice(from, to));
            } else if (to < bytes.byteLength) controller.error(new TypeError('network error'));
            else controller.close();
          },
        });
        const response = new Response(body, {
          status: range ? 206 : 200,
          headers: { 'Content-Length': String(bytes.byteLength - from) },
        });
        Object.defineProperty(response, 'url', { value: S3 });
        return response;
      });
      vi.stubGlobal('fetch', fetch);
      return fetch;
    }

    const storedRequest = (bytes: Uint8Array, sha256: string | null = digestOf(bytes)) => ({
      url: URL_S,
      headers: { Authorization: 'Bearer token' },
      stored: { size: bytes.byteLength, sha256 },
    });
    const storedEntry = () => storage.buckets.get(STORED.name)?.entries.get(URL_S);

    it('resumes where the body broke, of the URL it was sent on to with the range alone, and keeps it in a bucket of its own', async () => {
      const bytes = small();
      const fetch = storedServer(bytes, [breakAt(bytes)]);
      const first = await loaded({ request: storedRequest(bytes) });
      await first.whole;

      expect(fetch.mock.calls.map(([url, init]) => [url, init])).toEqual([
        [URL_S, { headers: { Authorization: 'Bearer token' } }],
        [S3, { headers: { Range: `bytes=${breakAt(bytes)}-` } }],
      ]);
      for (const level of [0, 1, 2]) {
        expect(await readLevel(first.data, level)).toEqual(await asRead(bytes, level));
      }
      expect(storedEntry()?.body).toEqual(bytes);
      expect(storage.buckets.get(BOUNDS.name)?.entries.size ?? 0).toBe(0);

      const again = await loaded({ request: storedRequest(bytes) });
      expect(again.fromCache).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('refuses the boxes past a second break, keeps nothing, and fails the whole', async () => {
      const bytes = small();
      storedServer(bytes, [breakAt(bytes), breakAt(bytes) + 100]);
      const { data, whole } = await loaded({ request: storedRequest(bytes) });

      await expect(whole).rejects.toThrow(`Download of ${breakAt(bytes) + 100} bytes`);
      await expect(readLevel(data, 0)).rejects.toThrow('cut short');
      expect(storedEntry()).toBeUndefined();
    });

    it("keeps no pack whose digest is not its asset's, its morphologies still read", async () => {
      const bytes = small();
      storedServer(bytes, []);
      const { data, whole } = await loaded({ request: storedRequest(bytes, '00'.repeat(32)) });

      await expect(whole).rejects.toThrow("digest is not its asset's");
      expect(await readLevel(data, 2)).toEqual(await asRead(bytes, 2));
      expect(storedEntry()).toBeUndefined();
    });

    it('takes one whose body broke after its last byte as whole, and keeps it', async () => {
      const bytes = small();
      let sent = false;
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (sent) controller.error(new TypeError('network error'));
          else controller.enqueue(bytes.slice());
          sent = true;
        },
      });
      vi.stubGlobal('fetch', async () => new Response(body));
      await kept({ request: storedRequest(bytes) });

      expect(storedEntry()?.body).toEqual(bytes);
    });

    it('keeps one with no digest to check against', async () => {
      const bytes = small();
      storedServer(bytes, []);
      await kept({ request: storedRequest(bytes, null) });

      expect(storedEntry()?.body).toEqual(bytes);
    });

    it('keeps stored packs a month, and those OBI-One builds a day', () => {
      const DAY_MS = 24 * 60 * 60 * 1000;
      expect(STORED_PACK_CACHE.ttlMs).toBe(30 * DAY_MS);
      expect(PACK_CACHE.ttlMs).toBe(DAY_MS);
    });
  });

  it('fetches the pack every time where the browser has no Cache Storage', async () => {
    vi.stubGlobal('caches', undefined);
    const { served } = serve(small());
    await kept();
    const second = await loaded();

    expect(second).toEqual(await outcome(small()));
    expect(served.requests).toBe(2);
  });
});
