// @vitest-environment node
import * as Comlink from 'comlink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renumberCells } from '@/features/circuit-viewer/morphologies/load/cells';
import {
  type LoadOptions,
  loadCircuitMorphologies,
} from '@/features/circuit-viewer/morphologies/load/load';
import { readPack } from '@/features/circuit-viewer/morphologies/load/pack';
import {
  createPackApi,
  type PackApi,
} from '@/features/circuit-viewer/morphologies/load/worker-api';

import { FakeCacheStorage, fakeServer } from '../viewer-3d/fake-caches';
import { pack, withIndex } from './packs';

import type { OnProgress } from '@/features/circuit-viewer/morphologies/load/download';
import type { CacheBounds } from '@/features/viewer-3d/load/asset-cache';
import type { WorkerHandle } from '@/features/viewer-3d/load/worker-handle';

const URL_A = 'https://obi-one.test/circuit/viz/a/morphology-pack?max_segments=2000000';
const BOUNDS: CacheBounds = { name: 'test-pack', ttlMs: 60_000, maxBytes: 2 ** 20 };
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
  const api = createPackApi(BOUNDS);
  const handedOver: ArrayBufferLike[] = [];
  const exposed: PackApi = {
    async load(...args) {
      const loaded = await api.load(...args);
      if (loaded.kind === 'loaded') {
        const { segments, segmentCells, segmentTypes, somas } = loaded.data;
        handedOver.push(segments.buffer, segmentCells.buffer, segmentTypes.buffer, somas.buffer);
      }
      return loaded;
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
  const outcome = await load(overrides);
  if (outcome.kind !== 'loaded') throw new Error(`refused: ${outcome.reason}`);
  return outcome;
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
  it('fetches the pack, reads it, hands its arrays over and keeps it in the cache', async () => {
    const { fetch } = serve(small());
    const outcome = await load();

    expect(outcome).toEqual({ kind: 'loaded', fromCache: false, data: await readPack(small()) });
    expect(fetch).toHaveBeenCalledExactlyOnceWith(URL_A, {
      headers: { Authorization: 'Bearer token' },
    });
    const [worker] = workers;
    expect(worker.terminated).toBe(true);
    expect(worker.handedOver.map((buffer) => buffer.byteLength)).toEqual([0, 0, 0, 0]);
    expect(cached()?.body).toEqual(small());
  });

  it('reports progress at most every 100 ms, and at the end', async () => {
    serve(small());
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    await load();

    const size = small().byteLength;
    expect(progress).toEqual([
      [1024, size],
      [size, size],
    ]);
  });

  it('reports no total where the server gives none', async () => {
    serve(small(), { length: false });
    await load();

    expect(progress.at(-1)).toEqual([small().byteLength, 0]);
  });

  it('reports nothing once the load has ended', async () => {
    let report: OnProgress = () => {};
    const api = {
      load(_request: unknown, _populations: unknown, onProgress: OnProgress) {
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

  it('reads the pack from the cache on a later visit', async () => {
    const { served } = serve(small());
    const first = await loaded();
    const onProgress = vi.fn();
    const second = await load({ onProgress });

    expect(second).toEqual({ ...first, fromCache: true });
    expect(served.requests).toBe(1);
    expect(onProgress).not.toHaveBeenCalled();
    expect(workers.map((worker) => worker.terminated)).toEqual([true, true]);
  });

  it('keeps a pack for each number of segments asked for', async () => {
    const coarser = URL_A.replace('2000000', '1000000');
    const server = fakeServer({ [URL_A]: small(), [coarser]: small() });
    vi.stubGlobal('fetch', server.fetch);
    await loaded();
    const other = await loaded({ request: { url: coarser, headers: {} } });

    expect(other.fromCache).toBe(false);
    expect(server.served.requests).toBe(2);
  });

  it('drops a cached pack that does not read, and fetches it again', async () => {
    const { served } = serve(small());
    await loaded();
    replaceCached(broken());
    const again = await loaded();

    expect(again.fromCache).toBe(false);
    expect(again.data).toEqual(await readPack(small()));
    expect(served.requests).toBe(2);
    expect(cached()?.body).toEqual(small());
  });

  it('keeps a cached pack that is whole, and too much for where it is read', async () => {
    const { served } = serve(small());
    await loaded();
    // More segments than an array holds.
    const vast = withIndex(small(), ({ levels: [level] }) => {
      level.segments += 2 ** 51;
      level.chunks.segments[0] += 2 ** 51;
    });
    replaceCached(new Uint8Array(vast));

    await expect(load()).rejects.toMatchObject({ name: 'RangeError' });
    expect(cached()?.body).toEqual(new Uint8Array(vast));
    expect(served.requests).toBe(1);
  });

  it('fails on a pack that does not read, and does not keep it', async () => {
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

    expect(data).toEqual(renumberCells(await readPack(small()), page));
    expect(data.segmentCells.length).toBeGreaterThan(0);
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

  it('fetches the pack every time where the browser has no Cache Storage', async () => {
    vi.stubGlobal('caches', undefined);
    const { served } = serve(small());
    const first = await loaded();
    const second = await loaded();

    expect(second).toEqual(first);
    expect(second.fromCache).toBe(false);
    expect(served.requests).toBe(2);
  });
});
