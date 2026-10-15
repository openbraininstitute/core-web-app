// @vitest-environment node
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
import { openPack } from '@/features/circuit-viewer/morphologies/load/pack';
import {
  createPackApi,
  type PackApi,
} from '@/features/circuit-viewer/morphologies/load/worker-api';

import { FakeCacheStorage, fakeServer } from '../viewer-3d/fake-caches';
import { pack, readPack } from './packs';

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
    async open(...args) {
      const opened = await api.open(...args);
      if (opened.kind === 'opened') handedOver.push(opened.data.somas.buffer);
      return opened;
    },
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
  const outcome = await load(overrides);
  if (outcome.kind !== 'loaded') throw new Error(`refused: ${outcome.reason}`);
  return outcome;
}

/** What a load of `bytes` hands over for a page of `populations`: the pack opened, its somas numbered the page's way. */
async function opened(bytes: Uint8Array, populations: Population[] = POPULATIONS) {
  const { data, boxes, levels } = await openPack(bytes);
  const page = renumberSomas(data, pageCells(data.populations, populations), populations);
  return { ...page, chunks: { boxes, levels, read: expect.any(Function) } };
}

/** Every box of a level, read through the load's data. */
async function readLevel(data: CircuitMorphologyData, level = 0): Promise<MorphologySegments> {
  const chunks = data.chunks;
  if (!chunks) throw new Error('no chunks');
  const boxes = Array.from({ length: chunks.boxes.length / 6 }, (_, box) => ({ level, box }));
  const read = await chunks.read(boxes);
  const join = <T extends Float32Array | Uint32Array | Uint8Array>(
    pick: (s: MorphologySegments) => T
  ) => read.flatMap((s) => Array.from(pick(s)));
  return {
    segments: Float32Array.from(join((s) => s.segments)),
    segmentCells: Uint32Array.from(join((s) => s.segmentCells)),
    segmentTypes: Uint8Array.from(join((s) => s.segmentTypes)),
  };
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
  it('fetches the pack, opens it, hands its somas over and keeps it in the cache, the worker kept', async () => {
    const { fetch } = serve(small());
    const outcome = await load();

    expect(outcome).toEqual({ kind: 'loaded', fromCache: false, data: await opened(small()) });
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
      expect(await readLevel(data, level)).toEqual(
        (({ segments, segmentCells, segmentTypes }) => ({ segments, segmentCells, segmentTypes }))(
          await readPack(small(), level)
        )
      );
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

  it('opens the pack from the cache on a later visit', async () => {
    const { served } = serve(small());
    await loaded();
    const onProgress = vi.fn();
    const second = await load({ onProgress });

    expect(second).toEqual({ kind: 'loaded', fromCache: true, data: await opened(small()) });
    expect(served.requests).toBe(1);
    expect(onProgress).not.toHaveBeenCalled();
  });

  it('keeps a pack for each URL', async () => {
    const other = URL_A.replace('/a/', '/b/');
    const server = fakeServer({ [URL_A]: small(), [other]: small() });
    vi.stubGlobal('fetch', server.fetch);
    await loaded();
    const second = await loaded({ request: { url: other, headers: {} } });

    expect(second.fromCache).toBe(false);
    expect(server.served.requests).toBe(2);
  });

  it('drops a cached pack that does not open, and fetches it again', async () => {
    const { served } = serve(small());
    await loaded();
    replaceCached(broken());
    const again = await loaded();

    expect(again.fromCache).toBe(false);
    expect(again.data).toEqual(await opened(small()));
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
    const whole = await readPack(small());

    expect(data).toEqual(await opened(small(), page));
    const read = await readLevel(data);
    expect(read).toEqual(renumberSegments(whole, pageCells(whole.populations, page)));
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

  it('fetches the pack every time where the browser has no Cache Storage', async () => {
    vi.stubGlobal('caches', undefined);
    const { served } = serve(small());
    await loaded();
    const second = await loaded();

    expect(second).toEqual({ kind: 'loaded', fromCache: false, data: await opened(small()) });
    expect(served.requests).toBe(2);
  });
});
