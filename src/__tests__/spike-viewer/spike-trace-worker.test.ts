// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { SpikeTraceWorkerApi } from '@/features/spike-viewer/spike-trace.worker';

// The worker hands itself to comlink: kept here instead, and h5wasm's node build in place of the browser's.
const hoisted = vi.hoisted(() => ({ worker: null as SpikeTraceWorkerApi | null }));
vi.mock('comlink', () => ({
  expose: (worker: SpikeTraceWorkerApi) => {
    hoisted.worker = worker;
  },
  transfer: (value: unknown) => value,
}));
vi.mock('h5wasm', async () => import('h5wasm/node'));

let dir: string;
let worker: SpikeTraceWorkerApi;
let bytes: ArrayBuffer;

beforeAll(async () => {
  const h5wasm = await import('h5wasm/node');
  await h5wasm.ready;
  dir = mkdtempSync(path.join(tmpdir(), 'spike-trace-worker-'));
  const name = path.join(dir, 'spikes.h5');
  const file = new h5wasm.File(name, 'w');
  file.create_group('spikes');
  file.create_group('spikes/cortex');
  const population = file.get('spikes/cortex') as InstanceType<typeof h5wasm.Group>;
  population.create_dataset({ name: 'timestamps', data: Float64Array.from([5, 10, 15, 20]) });
  population.create_dataset({
    name: 'node_ids',
    data: BigUint64Array.from([0n, 2n, 1n, 2n]),
  });
  file.close();
  const read = readFileSync(name);
  bytes = read.buffer.slice(read.byteOffset, read.byteOffset + read.byteLength);

  await import('@/features/spike-viewer/spike-trace.worker');
  if (!hoisted.worker) throw new Error('The worker did not expose itself.');
  worker = hoisted.worker;
});

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('the spike file’s worker', () => {
  it('hands the page the parsed spikes and answers from a copy of its own', async () => {
    const data = await worker.parseSpikeFile('spikes', bytes);
    const [cortex] = data.populations;
    expect(Array.from(cortex.nodeIds)).toEqual([0, 2, 1, 2]);

    // What the page holds is the page's: emptied there, the worker still has every spike.
    cortex.timestamps.fill(0);
    cortex.nodeIds.fill(0);
    const kept = worker.kept('cortex', Uint8Array.from([0, 0, 1]), null);
    expect(Array.from(kept.timestamps)).toEqual([10, 20]);
    expect(Array.from(kept.nodeIds)).toEqual([2, 2]);
    expect(worker.statistics('cortex', 3, { min: 0, max: 1000 }).count).toEqual(
      Float64Array.from([1, 1, 2])
    );
  });

  it('takes spikes handed in as they are', () => {
    worker.adopt({
      populations: [
        {
          name: 'thalamus',
          timestamps: Float32Array.from([1, 2]),
          nodeIds: Float64Array.from([4, 0]),
          nodeIdRange: { min: 0, max: 4 },
        },
      ],
      timeRange: { min: 0, max: 10 },
      nodeIdRange: { min: 0, max: 4 },
    });
    expect(worker.viewer('thalamus', null, [1.5, 10], { min: 0, max: 10 })).toMatchObject({
      cellIndices: Uint32Array.from([0]),
      timeMaxInMs: 10,
    });
  });
});
