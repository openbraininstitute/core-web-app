import { beforeEach, describe, expect, it, vi } from 'vitest';

const remote = vi.hoisted(() => ({
  open: vi.fn(async () => ({ neurons: 0, connections: 0, synapses: null, properties: [] })),
  holdCells: vi.fn(async () => {}),
  holdProperty: vi.fn(async () => {}),
  forget: vi.fn(async () => {}),
  group: vi.fn(),
}));

vi.mock('comlink', () => ({
  wrap: () => remote,
  proxy: (value: unknown) => value,
  transfer: (value: unknown) => value,
  releaseProxy: Symbol('releaseProxy'),
}));

import {
  countConnectivity,
  groupConnectivity,
  includedNeurons,
  layOutConnectivity,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import { LatestOnly, SupersededError } from '@/features/circuit-nodes/connectivity/latest-only';
import { connectivitySessions } from '@/features/circuit-nodes/connectivity/use-connectivity';

import type {
  ConnectivityGroups,
  ConnectivityRequest,
  NodeProperty,
} from '@/features/circuit-nodes/connectivity/connectivity-groups';
import type { ConnectivityMatrix } from '@/features/circuit-nodes/connectivity/connectivity-h5';

/** A number from 0 to 1, the same each run. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const SIZE = 60;
const random = seeded(7);
const LIBRARY = ['L5_TPC', 'L1_NGC', 'L23_PC', 'L4_SSC'];
const CODES = Int32Array.from({ length: SIZE }, () => Math.floor(random() * 5) - 1);
/** Node ids in no order, some of them shared. */
const SHUFFLED: ConnectivityMatrix = {
  size: SIZE,
  nodeIds: Float64Array.from({ length: SIZE }, () => Math.floor(random() * 40)),
  properties: [{ name: 'mtype', kind: 'categorical', library: LIBRARY, codes: CODES }],
  pre: Uint32Array.from({ length: 400 }, () => Math.floor(random() * SIZE)),
  post: Uint32Array.from({ length: 400 }, () => Math.floor(random() * SIZE)),
  synapses: Float32Array.from({ length: 400 }, () => 1 + Math.floor(random() * 5)),
};
const CELLS = Uint32Array.from({ length: 25 }, (_, i) => i + 5);

/** The answer as a worker sends it: its arrays moved out of the thread that made them. */
function sent(groups: ConnectivityGroups): ConnectivityGroups {
  const buffers = new Set(
    [
      groups.connections,
      groups.synapses,
      groups.neuronsBefore,
      ...[groups.pre, groups.post].flatMap((s) => [s.sizes, s.members.offsets, s.members.nodeIds]),
    ].flatMap((array) => (array ? [array.buffer as ArrayBuffer] : []))
  );
  return structuredClone(groups, { transfer: [...buffers] });
}

/** Typed arrays as plain ones: those a clone makes are of another realm, and never equal. */
function plain(value: unknown): unknown {
  if (ArrayBuffer.isView(value)) return Array.from(value as unknown as ArrayLike<number>);
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, plain(v)]));
  }
  return value;
}

describe('the neurons in an order', () => {
  /** As the order was first written: a comparison of every pair, by value, node id and place. */
  function compared(orderBy: string | null, cells: Uint32Array | null) {
    const wanted = cells && new Set(cells);
    const values = LIBRARY.filter((_, code) =>
      CODES.some((c, n) => c === code && (!wanted || wanted.has(SHUFFLED.nodeIds[n])))
    ).sort();
    const rank = (n: number) => (CODES[n] < 0 ? values.length : values.indexOf(LIBRARY[CODES[n]]));
    return Array.from({ length: SIZE }, (_, n) => n)
      .filter((n) => !wanted || wanted.has(SHUFFLED.nodeIds[n]))
      .sort(
        (a, b) =>
          (orderBy ? rank(a) - rank(b) : 0) || SHUFFLED.nodeIds[a] - SHUFFLED.nodeIds[b] || a - b
      )
      .map((n) => SHUFFLED.nodeIds[n]);
  }

  it.each([
    [null, null],
    ['mtype', null],
    [null, CELLS],
    ['mtype', CELLS],
  ])('is by value, then node id, then place: ordered by %s, of %s', (orderBy, cells) => {
    const groups = groupConnectivity(SHUFFLED, { by: 'neuron', orderBy }, cells);
    expect([...groups.pre.members.nodeIds]).toEqual(compared(orderBy, cells));
  });
});

describe('includedNeurons', () => {
  it('flags the neurons whose node ids are among the cells, some of them not the matrix’s', () => {
    const flags = includedNeurons(SHUFFLED, Uint32Array.from([3, 3, 17, 4000]));
    expect([...flags]).toEqual(
      Array.from(SHUFFLED.nodeIds, (id) => (id === 3 || id === 17 ? 1 : 0))
    );
  });

  it('flags them the same where node ids are far apart', () => {
    const sparse = { ...SHUFFLED, nodeIds: SHUFFLED.nodeIds.map((id) => id * 100_000_000) };
    const flags = includedNeurons(sparse, Uint32Array.from([300_000_000, 5]));
    expect([...flags]).toEqual(Array.from(SHUFFLED.nodeIds, (id) => (id === 3 ? 1 : 0)));
  });
});

describe('a layout counted more than once', () => {
  const side = (start: number, end: number, step: number) => ({ start, end, step });
  const REQUESTS: ConnectivityRequest[] = [
    { by: 'property', property: 'mtype' },
    { by: 'neuron', orderBy: 'mtype', maxRows: 8 },
  ];
  const windowsOf = (places: number) => [
    undefined,
    { pre: side(0, Math.min(2, places), 1), post: side(1, Math.min(4, places), 1) },
    { pre: side(0, places, 2), post: side(0, places, 2) },
  ];

  it.each(
    REQUESTS
  )('answers each window as from scratch, its last answer sent away: %o', (request) => {
    const included = includedNeurons(SHUFFLED, CELLS);
    const layout = layOutConnectivity(SHUFFLED, request, included);
    const places = groupConnectivity(SHUFFLED, request, CELLS).places;
    for (const window of [...windowsOf(places), ...windowsOf(places)]) {
      const asked = { ...request, window };
      const answer = sent(countConnectivity(SHUFFLED, layout, asked));
      expect(answer.connections.length).toBeGreaterThan(0);
      expect(plain(answer)).toEqual(plain(groupConnectivity(SHUFFLED, asked, CELLS)));
    }
  });
});

describe('LatestOnly', () => {
  /** A task that ends when told to. */
  function task<T>(log: string[], name: string) {
    let end: (value: T) => void = () => {};
    const promise = new Promise<T>((resolve) => {
      end = resolve;
    });
    return {
      run: () => {
        log.push(name);
        return promise;
      },
      end,
    };
  }

  it('runs the first asked for, then only the last of those asked for meanwhile', async () => {
    const latest = new LatestOnly();
    const channel = {};
    const log: string[] = [];
    const tasks = ['a', 'b', 'c', 'd'].map((name) => task<string>(log, name));
    const [a, b, c, d] = tasks.map((t) => latest.run(channel, t.run));
    await expect(b).rejects.toBeInstanceOf(SupersededError);
    await expect(c).rejects.toBeInstanceOf(SupersededError);
    expect(log).toEqual(['a']);
    tasks[0].end('A');
    await expect(a).resolves.toBe('A');
    tasks[3].end('D');
    await expect(d).resolves.toBe('D');
    expect(log).toEqual(['a', 'd']);
  });

  it('runs what is asked for once the channel is free again, and after a task that fails', async () => {
    const latest = new LatestOnly();
    const channel = {};
    await expect(latest.run(channel, async () => 1)).resolves.toBe(1);
    await expect(
      latest.run(channel, () => {
        throw new Error('no');
      })
    ).rejects.toThrow('no');
    await expect(latest.run(channel, async () => 2)).resolves.toBe(2);
  });

  it('keeps one channel from waiting on another', async () => {
    const latest = new LatestOnly();
    const log: string[] = [];
    const first = task<number>(log, 'first');
    latest.run({}, first.run);
    await expect(latest.run({}, async () => 2)).resolves.toBe(2);
  });

  it('fails what runs and what waits on a reset, and runs what is asked for after', async () => {
    const latest = new LatestOnly();
    const channel = {};
    const log: string[] = [];
    const stuck = task<number>(log, 'stuck');
    const running = latest.run(channel, stuck.run);
    const waiting = latest.run(channel, async () => 2);
    latest.reset(new Error('closed'));
    await expect(running).rejects.toThrow('closed');
    await expect(waiting).rejects.toThrow('closed');
    await expect(latest.run(channel, async () => 3)).resolves.toBe(3);
    // What ran before the reset ends late, and starts nothing.
    stuck.end(1);
    await Promise.resolve();
    expect(log).toEqual(['stuck']);
  });
});

describe('a matrix’s rows asked of its worker', () => {
  let matrices = 0;
  let KEY = '';
  const REQUEST: ConnectivityRequest = { by: 'neuron', orderBy: null };
  const property = (name: string): NodeProperty => ({
    name,
    library: [],
    codes: new Int32Array(1),
  });
  const ask = (channel: object, cells: Uint32Array | null, outside: NodeProperty[] = []) =>
    connectivitySessions.group(KEY, channel, REQUEST, cells, outside);

  beforeEach(async () => {
    vi.clearAllMocks();
    remote.group.mockResolvedValue('rows');
    vi.stubGlobal(
      'Worker',
      class {
        terminate() {}
      }
    );
    matrices += 1;
    KEY = `circuit/asset/matrix-${matrices}.h5`;
    connectivitySessions.acquire(KEY, async () => ({ url: 'https://matrix', headers: {} }));
    await vi.waitFor(() => expect(connectivitySessions.state(KEY).status).toBe('ready'));
    return () => connectivitySessions.release(KEY);
  });

  it('hands a selection and a property over once, and asks by their ids from then on', async () => {
    const cells = Uint32Array.from([1, 2]);
    const layer = property('layer');
    await ask({}, cells, [layer]);
    await ask({}, cells, [layer]);
    await ask({}, null, [layer]);
    expect(remote.holdCells).toHaveBeenCalledTimes(1);
    expect(remote.holdProperty).toHaveBeenCalledTimes(1);
    const [[cellsId, sentCells]] = remote.holdCells.mock.calls as unknown as [
      [number, Uint32Array],
    ];
    const [[layerId]] = remote.holdProperty.mock.calls as unknown as [[number]];
    expect(sentCells).toBe(cells);
    expect(remote.group.mock.calls).toEqual([
      [REQUEST, cellsId, [layerId]],
      [REQUEST, cellsId, [layerId]],
      [REQUEST, null, [layerId]],
    ]);
  });

  it('has the worker forget the selections asked by longest ago', async () => {
    const selections = Array.from({ length: 8 }, (_, i) => Uint32Array.from([i]));
    for (const cells of selections) await ask({}, cells);
    const ids = (remote.holdCells.mock.calls as unknown as [number][]).map(([id]) => id);
    expect(remote.forget.mock.calls).toEqual([[[ids[0]]], [[ids[1]]]]);
    await ask({}, selections[0]);
    expect(remote.holdCells).toHaveBeenCalledTimes(9);
  });

  it('asks the worker for a view’s first request and its last, not those between', async () => {
    let answer: (rows: string) => void = () => {};
    remote.group.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      })
    );
    const view = {};
    const selections = [1, 2, 3].map((id) => Uint32Array.from([id]));
    const [first, second, third] = selections.map((cells) => ask(view, cells));
    await expect(second).rejects.toBeInstanceOf(SupersededError);
    expect(remote.group).toHaveBeenCalledTimes(1);
    answer('first rows');
    await expect(first).resolves.toBe('first rows');
    await expect(third).resolves.toBe('rows');
    expect(remote.group).toHaveBeenCalledTimes(2);
    // A selection never asked by is never handed over.
    expect(
      (remote.holdCells.mock.calls as unknown as [number, Uint32Array][]).map((c) => c[1])
    ).toEqual([selections[0], selections[2]]);
  });
});
