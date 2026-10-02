// @vitest-environment node
import * as Comlink from 'comlink';
import { MeshoptSimplifier } from 'meshoptimizer';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { fullKey } from '@/features/entities/em-cell-mesh/viewer/engine/full-cache';
import {
  DECODE_LOCK,
  keepFullMesh,
  LoadError,
  type LoadOptions,
  type LoadReport,
  loadEmMesh,
  type WorkerHandle,
  type Workers,
} from '@/features/entities/em-cell-mesh/viewer/engine/load';
import { decodeStandIn } from '@/features/entities/em-cell-mesh/viewer/engine/stand-in-cache';
import {
  buildApi,
  createDecodeApi,
  createFullCacheApi,
  createStandInApi,
} from '@/features/entities/em-cell-mesh/viewer/engine/worker-apis';

import { FakeCacheStorage, fakeServer } from './fake-caches';
import { dracoDecoder, encodeGlb, torus } from './mesh-fixtures';

import type { CacheBounds } from '@/features/entities/em-cell-mesh/viewer/engine/asset-cache';
import type { PackedMesh, StandIn } from '@/features/entities/em-cell-mesh/viewer/engine/types';

const URL_A = 'https://entitycore.test/em-cell-mesh/1/assets/a/download';
const DESKTOP = { memoryGB: 8, pixels: 1920 * 1080 };

let glb: Uint8Array;
let log: string[];
let handles: (WorkerHandle<unknown> & { terminated: boolean })[];
/** What the decode worker handed over, kept to see that it was transferred, not copied. */
let handedOver: ArrayBufferLike[];

beforeAll(async () => {
  glb = await encodeGlb(torus(120, 60), 14);
  await MeshoptSimplifier.ready;
});

beforeEach(() => {
  log = [];
  handles = [];
  handedOver = [];
  fullCache = null;
  vi.stubGlobal('navigator', {
    locks: {
      async request(name: string, _options: unknown, work: () => Promise<void>) {
        log.push(`lock ${name}`);
        try {
          return await work();
        } finally {
          log.push('unlock');
        }
      },
    },
  });
});

afterEach(() => {
  for (const h of handles) h.terminate();
  vi.unstubAllGlobals();
});

/**
 * A worker in this thread: the API behind a MessageChannel, as Comlink sees a worker, so arrays are really
 * transferred. Each call and the termination are logged; `kill` makes a call die with the worker.
 */
function inProcess<T extends object>(name: string, api: T, kill?: string): WorkerHandle<T> {
  const { port1, port2 } = new MessageChannel();
  let die: (e: Error) => void = () => {};
  const died = new Promise<never>((_, reject) => {
    die = reject;
  });
  died.catch(() => {});
  const logged = new Proxy(api, {
    get(target, key) {
      const value = Reflect.get(target, key);
      if (typeof value !== 'function') return value;
      return async (...args: unknown[]) => {
        log.push(`${name}.${String(key)}`);
        if (key === kill) {
          die(new Error(`${name} worker ran out of memory`));
          return new Promise(() => {});
        }
        const result = await value.apply(target, args);
        if (key === 'decode')
          handedOver.push(result.mesh.positions.buffer, result.mesh.indices.buffer);
        return result;
      };
    },
  });
  Comlink.expose(logged, port1);
  const handle = {
    api: Comlink.wrap<T>(port2),
    died,
    terminated: false,
    terminate() {
      if (handle.terminated) return;
      handle.terminated = true;
      log.push(`${name} terminated`);
      port1.close();
      port2.close();
    },
  };
  handles.push(handle as WorkerHandle<unknown> & { terminated: boolean });
  return handle;
}

const encoder = async () => {
  const { MeshoptEncoder } = await import('meshoptimizer/encoder');
  await MeshoptEncoder.ready;
  return MeshoptEncoder;
};
const decoder = async () => {
  const { MeshoptDecoder } = await import('meshoptimizer/decoder');
  await MeshoptDecoder.ready;
  return MeshoptDecoder;
};
/** The full mesh's cache, where a test stubs Cache Storage. */
let fullCache: CacheBounds | null = null;

function workers(
  kill: { decode?: string; standIn?: string; build?: string; fullCache?: string } = {}
): Workers {
  return {
    decode: () => inProcess('decode', createDecodeApi(dracoDecoder, null), kill.decode),
    standIn: () =>
      inProcess(
        'standIn',
        createStandInApi(
          async () => MeshoptSimplifier,
          () => 42
        ),
        kill.standIn
      ),
    build: () => inProcess('build', buildApi, kill.build),
    fullCache: () =>
      inProcess('fullCache', createFullCacheApi(encoder, decoder, fullCache), kill.fullCache),
  };
}

function load(overrides: Partial<LoadOptions> = {}, cached: StandIn | null = null) {
  const events: {
    standIn?: StandIn;
    full?: PackedMesh;
    reports: LoadReport[];
    progress: number[];
    stages: string[];
  } = {
    reports: [],
    progress: [],
    stages: [],
  };
  const stored: ArrayBuffer[] = [];
  const standIns = {
    read: vi.fn(async () => cached),
    store: vi.fn(async (_url: string, _triangles: number, encoded: ArrayBuffer) =>
      stored.push(encoded)
    ),
  };
  const promise = loadEmMesh(
    {
      request: { url: URL_A, headers: {}, size: glb.byteLength },
      device: DESKTOP,
      signal: new AbortController().signal,
      workers: workers(),
      standInTriangles: 2000,
      standIns,
      ...overrides,
    },
    {
      onStage: (stage) => events.stages.push(stage),
      onProgress: (received) => events.progress.push(received),
      onReport: (report) => events.reports.push(report),
      onStandIn: (standIn) => {
        log.push('onStandIn');
        events.standIn = standIn;
      },
      onFull: (mesh) => {
        log.push('onFull');
        events.full = mesh;
      },
    }
  );
  return { promise, events, stored, standIns };
}

describe('loadEmMesh', () => {
  it('decodes, makes the stand-in, then builds the full mesh, one worker after the other', async () => {
    vi.stubGlobal('fetch', fakeServer({ [URL_A]: glb }).fetch);
    const { promise, events, stored, standIns } = load();
    expect(await promise).toEqual({ kind: 'loaded' });
    // The full mesh's cache, asked while the GLB comes in, has nothing.
    expect(log).toContain('fullCache.has');
    expect(log).not.toContain('fullCache.restore');
    expect(log.filter((e) => !e.endsWith('warmUp') && !e.startsWith('fullCache'))).toEqual([
      'decode.download',
      `lock ${DECODE_LOCK}`,
      'decode.decode',
      'decode terminated',
      'standIn.make',
      'standIn terminated',
      'onStandIn',
      'build.build',
      'build terminated',
      'onFull',
      'unlock',
    ]);
    expect(events.stages).toEqual(['download', 'decode', 'stand-in', 'full']);
    // Done with before the lock.
    expect(log.indexOf('fullCache terminated')).toBeLessThan(log.indexOf(`lock ${DECODE_LOCK}`));
    // Of the size asked: the mesh, of 14,400 triangles, would be its own stand-in at the default size.
    expect(events.standIn?.triangles).toBeLessThanOrEqual(2000);
    expect(events.standIn?.errorUm).toBeGreaterThan(0);
    expect(standIns.read).toHaveBeenCalledWith(URL_A, 2000);
    expect(events.full?.triangles).toBe(120 * 60 * 2);
    // Encoded for the cache in the stand-in worker, and stored once shown.
    expect(stored).toHaveLength(1);
    expect(standIns.store).toHaveBeenCalledWith(URL_A, 2000, stored[0]);
    expect(decodeStandIn(stored[0])).toEqual(events.standIn);
    expect(events.progress.at(-1)).toBe(glb.byteLength);
    const report = events.reports.at(-1);
    expect(report).toMatchObject({
      dracoBits: 14,
      standInFrom: 'build',
      glbFrom: 'network',
      budget: { kind: 'ok' },
    });
    expect(report?.header?.triangles).toBe(120 * 60 * 2);
  });

  it('transfers what the decode worker hands over, leaving it nothing', async () => {
    vi.stubGlobal('fetch', fakeServer({ [URL_A]: glb }).fetch);
    await load().promise;
    expect(handedOver).toHaveLength(2);
    for (const buffer of handedOver) expect(buffer.byteLength).toBe(0);
  });

  it('leaves no listener on the signal, which would keep the full mesh alive for as long as the signal', async () => {
    vi.stubGlobal('fetch', fakeServer({ [URL_A]: glb }).fetch);
    const { signal } = new AbortController();
    const added = vi.spyOn(signal, 'addEventListener');
    const removed = vi.spyOn(signal, 'removeEventListener');
    await load({ signal }).promise;
    const listeners = (spy: typeof added) =>
      spy.mock.calls.filter(([type]) => type === 'abort').map(([, listener]) => listener);
    expect(listeners(added)).not.toHaveLength(0);
    expect(listeners(removed)).toEqual(listeners(added));
  });

  it('starts the decode and stand-in workers, which compile their WASM, before the download ends', async () => {
    vi.stubGlobal('fetch', fakeServer({ [URL_A]: glb }).fetch);
    await load().promise;
    const download = log.indexOf('decode.download');
    expect(log.indexOf('decode.warmUp')).toBeLessThan(download);
    expect(log.indexOf('standIn.warmUp')).toBeGreaterThan(-1);
    expect(log.indexOf('standIn.warmUp')).toBeLessThan(log.indexOf('decode.decode'));
  });

  it('downloads while the view has not been seen, and decodes once it is', async () => {
    vi.stubGlobal('fetch', fakeServer({ [URL_A]: glb }).fetch);
    let show: () => void = () => {};
    const seen = new Promise<void>((resolve) => {
      show = resolve;
    });
    const { promise, events } = load({ seen });
    await vi.waitFor(() => expect(events.progress.at(-1)).toBe(glb.byteLength));
    await new Promise((r) => setTimeout(r, 20));
    expect(log).not.toContain('decode.decode');
    show();
    expect(await promise).toEqual({ kind: 'loaded' });
    expect(log).toContain('decode.decode');
    // Timed, for the Debug menu, as the times since the load started include it.
    const waited = events.reports.at(-1)?.timings.find((t) => t.step === 'unseen');
    expect(waited?.ms).toBeGreaterThanOrEqual(15);
  });

  it('keeps the full mesh as it goes up, and takes it from its cache the next time, decoding nothing', async () => {
    const standIn = await cachedStandIn();
    const { built, triangles } = await keptFull();
    // Its arrays went to the worker.
    expect(built.chunks[0].indices.length).toBe(0);

    const second = load({}, standIn);
    expect(await second.promise).toEqual({ kind: 'loaded' });
    expect(log).not.toContain('decode.decode');
    expect(log).not.toContain('build.build');
    expect(second.events.reports.at(-1)?.fullFrom).toBe('cache');
    expect(second.events.full?.triangles).toBe(built.triangles);
    expect(packedTriangleCount(second.events.full as PackedMesh)).toBe(triangles);
  });

  it('makes a stand-in its cache has none of, of another size say, from the full mesh its own cache gives back', async () => {
    const { triangles } = await keptFull();
    const { promise, events, stored } = load();
    expect(await promise).toEqual({ kind: 'loaded' });
    // Nothing decoded or built: the full mesh's cache is done with, and the download stopped, before the lock.
    expect(log.filter((e) => !e.endsWith('warmUp') && e !== 'decode.download')).toEqual([
      'fullCache.has',
      'fullCache.restore',
      'fullCache terminated',
      'decode terminated',
      `lock ${DECODE_LOCK}`,
      'standIn.fromFull',
      'standIn terminated',
      'onStandIn',
      'unlock',
      'onFull',
    ]);
    expect(events.stages).toEqual(['download', 'full', 'stand-in']);
    expect(events.standIn?.triangles).toBeLessThanOrEqual(2000);
    expect(events.standIn?.errorUm).toBeGreaterThan(0);
    expect(decodeStandIn(stored[0])).toEqual(events.standIn);
    expect(events.reports.at(-1)).toMatchObject({ standInFrom: 'build', fullFrom: 'cache' });
    expect(packedTriangleCount(events.full as PackedMesh)).toBe(triangles);
  });

  it('takes the full mesh from its cache though the mesh is refused at its header, or the download fails', async () => {
    await keptFull();
    const refused = load({ device: { memoryGB: 1e-6, pixels: 0 } });
    expect(await refused.promise).toEqual({ kind: 'loaded' });
    expect(refused.events.reports.at(-1)).toMatchObject({
      standInFrom: 'build',
      fullFrom: 'cache',
    });

    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    const offline = load();
    expect(await offline.promise).toEqual({ kind: 'loaded' });
    expect(offline.events.reports.at(-1)).toMatchObject({
      standInFrom: 'build',
      fullFrom: 'cache',
    });
  });

  it('takes the full mesh from its cache for its own stand-in, whole, where it has no more triangles than one', async () => {
    await keptFull();
    const { promise, events, stored } = load({ standInTriangles: 20_000 });
    expect(await promise).toEqual({ kind: 'loaded' });
    expect(events.full).toBe(events.standIn);
    expect(events.standIn?.errorUm).toBe(0);
    expect(log).not.toContain('standIn.fromFull');
    expect(log).not.toContain('decode.decode');
    // Kept in the full mesh's cache already.
    expect(stored).toHaveLength(0);
  });

  it("reads the full mesh's cache in a tab not seen yet, and makes the stand-in from it once it is", async () => {
    await keptFull();
    let show: () => void = () => {};
    const seen = new Promise<void>((resolve) => {
      show = resolve;
    });
    const { promise } = load({ seen });
    await vi.waitFor(() => expect(log).toContain('decode terminated'));
    await new Promise((r) => setTimeout(r, 20));
    expect(log).not.toContain('standIn.fromFull');
    show();
    expect(await promise).toEqual({ kind: 'loaded' });
    expect(log).toContain('standIn.fromFull');
  });

  it("decodes and builds the full mesh after all where its cache can't give back the mesh it has", async () => {
    await keptFull();
    const { promise, events } = load({ workers: workers({ fullCache: 'restore' }) });
    expect(await promise).toEqual({ kind: 'loaded' });
    expect(log).toContain('decode.decode');
    expect(log).toContain('standIn.make');
    expect(events.reports.at(-1)).toMatchObject({ standInFrom: 'build', fullFrom: 'build' });
  });

  it('shows a cached stand-in before the download ends, and makes none', async () => {
    const cached = { ...(await cachedStandIn()), errorUm: 0.5 };
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const server = fakeServer({ [URL_A]: glb });
    vi.stubGlobal('fetch', async (...args: Parameters<typeof fetch>) => {
      await gate;
      return server.fetch(...args);
    });
    const { promise, events } = load({}, cached);
    await vi.waitFor(() => expect(events.standIn).toBe(cached));
    expect(events.full).toBeUndefined();
    release();
    await promise;
    expect(log).not.toContain('standIn.make');
    expect(events.full?.triangles).toBe(120 * 60 * 2);
  });

  it('takes a cached stand-in without error for the whole mesh, and stops the download', async () => {
    const whole = { ...(await cachedStandIn()), errorUm: 0 };
    const server = fakeServer({ [URL_A]: glb });
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal('fetch', async (...args: Parameters<typeof fetch>) => {
      await gate;
      return server.fetch(...args);
    });
    const { promise, events } = load({}, whole);
    expect(await promise).toEqual({ kind: 'loaded' });
    release();
    expect(events.full).toBe(whole);
    expect(log).not.toContain('decode.decode');
    expect(log).toContain('decode terminated');
  });

  it('takes a cached stand-in without error for the whole mesh though the download fails before it is read', async () => {
    const whole = { ...(await cachedStandIn()), errorUm: 0 };
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal('fetch', async () => {
      // Offline: the request fails at once, and the stand-in's read comes in after.
      setTimeout(release, 20);
      throw new TypeError('Failed to fetch');
    });
    const { promise, events } = load({
      standIns: { read: () => gate.then(() => whole), store: async () => {} },
    });
    expect(await promise).toEqual({ kind: 'loaded' });
    expect(events.full).toBe(whole);
  });

  it('refuses a mesh over the budget at its header, unless told to load it anyway', async () => {
    const server = fakeServer({ [URL_A]: glb }, { chunk: 256 });
    vi.stubGlobal('fetch', server.fetch);
    const small = { memoryGB: 1e-6, pixels: 0 };
    const refused = load({ device: small });
    expect(await refused.promise).toMatchObject({
      kind: 'refused',
      budget: { kind: 'over-budget' },
    });
    expect(server.served.aborted).toBe(1);
    expect(log).not.toContain('decode.decode');
    expect(handles.every((h) => h.terminated)).toBe(true);

    const anyway = load({ device: small, ignoreBudget: true });
    expect(await anyway.promise).toEqual({ kind: 'loaded' });
  });

  it('stops everything when the entity changes', async () => {
    vi.stubGlobal('fetch', async () => new Response(new ReadableStream({ pull() {} })));
    const abort = new AbortController();
    const { promise } = load({ signal: abort.signal });
    await vi.waitFor(() => expect(log).toContain('decode.download'));
    abort.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(handles.length).toBeGreaterThan(0);
    expect(handles.every((h) => h.terminated)).toBe(true);
  });

  it('fails at the decode where its worker dies', async () => {
    vi.stubGlobal('fetch', fakeServer({ [URL_A]: glb }).fetch);
    const { promise, events } = load({ workers: workers({ decode: 'decode' }) });
    const error = await promise.catch((e) => e);
    expect(error).toBeInstanceOf(LoadError);
    expect(error.stage).toBe('decode');
    expect(events.standIn).toBeUndefined();
    expect(handles.every((h) => h.terminated)).toBe(true);
    // The lock is let go even so.
    expect(log).toContain('unlock');
  });

  it('keeps the stand-in where the build worker dies after it', async () => {
    vi.stubGlobal('fetch', fakeServer({ [URL_A]: glb }).fetch);
    const { promise, events } = load({ workers: workers({ build: 'build' }) });
    const error = await promise.catch((e) => e);
    expect(error).toMatchObject({ stage: 'full', message: 'build worker ran out of memory' });
    expect(events.standIn).toBeDefined();
    expect(events.full).toBeUndefined();
  });

  it("builds the full mesh where the full mesh's cache dies before it answers", async () => {
    vi.stubGlobal('fetch', fakeServer({ [URL_A]: glb }).fetch);
    const { promise, events } = load({ workers: workers({ fullCache: 'has' }) });
    expect(await promise).toEqual({ kind: 'loaded' });
    expect(events.reports.at(-1)?.fullFrom).toBe('build');
  });
});

/**
 * A load whose full mesh the viewer kept in its cache, handing each chunk over once it is up, as in the browser; the
 * log starts again after it.
 */
async function keptFull(): Promise<{ built: PackedMesh; triangles: number }> {
  const storage = new FakeCacheStorage();
  vi.stubGlobal('caches', storage);
  fullCache = { name: 'test-full', ttlMs: 1e9, maxBytes: 1e9 };
  vi.stubGlobal('fetch', fakeServer({ [URL_A]: glb }).fetch);
  const first = load();
  await first.promise;
  const built = first.events.full as PackedMesh;
  const triangles = packedTriangleCount(built);
  const keeper = keepFullMesh(URL_A, built, workers());
  built.chunks.forEach((chunk, i) => {
    keeper.keep(chunk, i);
  });
  await vi.waitFor(() =>
    expect(storage.bucket('test-full').entries.has(fullKey(URL_A))).toBe(true)
  );
  log = [];
  return { built, triangles };
}

const packedTriangleCount = (mesh: PackedMesh) =>
  mesh.chunks.reduce((n, c) => n + c.indices.length / 3, 0);

/** A stand-in as the cache would give one back, from a load of the same mesh. */
async function cachedStandIn(): Promise<StandIn> {
  const saved = log;
  log = [];
  vi.stubGlobal('fetch', fakeServer({ [URL_A]: glb }).fetch);
  const { promise, events } = load();
  await promise;
  log = saved;
  if (!events.standIn) throw new Error('no stand-in');
  return events.standIn;
}
