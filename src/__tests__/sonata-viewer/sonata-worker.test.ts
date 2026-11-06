// @vitest-environment node
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { SonataWorkerImpl } from '@/features/sonata-viewer/worker/sonata-worker';

// The worker hands itself to comlink: kept here instead, and h5wasm's node build in place of the browser's.
const hoisted = vi.hoisted(() => ({ worker: null as SonataWorkerImpl | null }));
vi.mock('comlink', () => ({
  expose: (worker: SonataWorkerImpl) => {
    hoisted.worker = worker;
  },
  transfer: (value: unknown) => value,
}));
vi.mock('h5wasm', async () => import('h5wasm/node'));

// Enough cells that a block holds 1000 rows of them, and rows enough for a second block.
const CELLS = 4000;
const STEPS = 1200;
const START = 5;
const DT = 0.5;
const POPULATION = 'pop';

/** A value per row and column: a ramp that crosses 0 upward once every 20 rows, set apart per cell. */
const valueAt = (row: number, column: number) => ((row + column) % 20) - 10 + column / 1000;

let dir: string;
let worker: SonataWorkerImpl;

beforeAll(async () => {
  const h5wasm = await import('h5wasm/node');
  await h5wasm.ready;
  dir = mkdtempSync(path.join(tmpdir(), 'sonata-worker-'));
  const name = path.join(dir, 'report.h5');
  const file = new h5wasm.File(name, 'w');
  const values = new Float32Array(STEPS * CELLS);
  for (let row = 0; row < STEPS; row++) {
    for (let column = 0; column < CELLS; column++)
      values[row * CELLS + column] = valueAt(row, column);
  }
  file.create_group('report');
  file.create_group(`report/${POPULATION}`);
  file.create_group(`report/${POPULATION}/mapping`);
  const population = file.get(`report/${POPULATION}`) as InstanceType<typeof h5wasm.Group>;
  population.create_dataset({ name: 'data', data: values, shape: [STEPS, CELLS], dtype: '<f' });
  const mapping = file.get(`report/${POPULATION}/mapping`) as InstanceType<typeof h5wasm.Group>;
  mapping.create_dataset({
    name: 'node_ids',
    data: Uint32Array.from({ length: CELLS }, (_, i) => i),
  });
  mapping.create_dataset({
    name: 'index_pointers',
    data: BigUint64Array.from({ length: CELLS + 1 }, (_, i) => BigInt(i)),
  });
  mapping.create_dataset({
    name: 'time',
    data: Float64Array.from([START, START + STEPS * DT, DT]),
  });
  file.close();

  await import('@/features/sonata-viewer/worker/sonata-worker');
  if (!hoisted.worker) throw new Error('The worker did not expose itself.');
  worker = hoisted.worker;
  const bytes = readFileSync(name);
  await worker.loadFile(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
});

afterAll(() => {
  worker?.destroy();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe('the report worker, reading the matrix a block of rows at a time', () => {
  it('finds the range of every value', async () => {
    const [min, max] = await worker.getValueRange(POPULATION);
    expect(min).toBeCloseTo(-10, 5);
    expect(max).toBeCloseTo(9 + (CELLS - 1) / 1000, 3);
  });

  it('takes every row as a frame across blocks, and every so many when fewer are asked for', async () => {
    const every = await worker.getCellFrames(POPULATION, 2000);
    expect(every.times).toHaveLength(STEPS);
    // Rows either side of the block boundary at 1000.
    for (const row of [0, 999, 1000, 1199]) {
      expect(every.times[row]).toBeCloseTo(START + row * DT, 9);
      for (const column of [0, 1, CELLS - 1]) {
        expect(every.values[row * CELLS + column]).toBeCloseTo(valueAt(row, column), 4);
      }
    }

    const fewer = await worker.getCellFrames(POPULATION, 100);
    expect(fewer.times).toHaveLength(100);
    for (const frame of [0, 50, 99]) {
      const row = frame * 12;
      expect(fewer.times[frame]).toBeCloseTo(START + row * DT, 9);
      expect(fewer.values[frame * CELLS + 7]).toBeCloseTo(valueAt(row, 7), 4);
    }
  });

  it('works out each cell over a window that crosses a block, counting upward crossings', async () => {
    const window: [number, number] = [START + 990 * DT, START + 1010 * DT];
    const found = await worker.getCellStatistics(POPULATION, 0, window);
    for (const column of [0, 3, CELLS - 1]) {
      const rows = Array.from({ length: 21 }, (_, i) => 990 + i);
      const values = rows.map((row) => Math.fround(valueAt(row, column)));
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const crossings = rows.filter(
        (row) => valueAt(row - 1, column) < 0 && valueAt(row, column) >= 0
      ).length;
      expect(found.mean[column]).toBeCloseTo(mean, 4);
      expect(found.min[column]).toBeCloseTo(Math.min(...values), 4);
      expect(found.max[column]).toBeCloseTo(Math.max(...values), 4);
      expect(found.spikes?.[column]).toBe(crossings);
    }
  });
});
