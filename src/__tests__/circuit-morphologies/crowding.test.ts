// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  CROWDING_REACH,
  crowding,
  gridFor,
  MAX_GRID_CELLS,
} from '@/features/circuit-viewer/morphologies/load/crowding';
import { loadCrowding } from '@/features/circuit-viewer/morphologies/load/load-crowding';

import type { CrowdingApi } from '@/features/circuit-viewer/morphologies/load/crowding.worker';
import type { WorkerHandle } from '@/features/viewer-3d/load/worker-handle';

const positionsOf = (points: number[][]) => Float32Array.from(points.flat());

/** The sum of reach² − d² over the other somas within reach, pair by pair, made bytes as `crowding` makes them. */
function byPairs(positions: Float32Array, reach = CROWDING_REACH): Uint8Array {
  const cells = positions.length / 3;
  const totals = new Float64Array(cells);
  for (let a = 0; a < cells; a++) {
    for (let b = 0; b < cells; b++) {
      if (a === b) continue;
      let d2 = 0;
      for (let k = 0; k < 3; k++) d2 += (positions[3 * a + k] - positions[3 * b + k]) ** 2;
      if (d2 < reach * reach) totals[a] += reach * reach - d2;
    }
  }
  const most = Math.max(...totals);
  return Uint8Array.from(totals, (total) => Math.round((255 * total) / most));
}

/** Somas strewn through a box, thicker towards its middle, from a fixed seed. */
function cloud(count: number, side: number): Float32Array {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const positions = new Float32Array(3 * count);
  for (let i = 0; i < positions.length; i++) {
    positions[i] = side * (0.5 + (random() + random() + random() - 1.5) / 3);
  }
  return positions;
}

describe('how crowded each soma is', () => {
  it('is 255 for the most crowded soma and 0 for one with no neighbour within reach', () => {
    const bytes = crowding(
      positionsOf([
        [0, 0, 0],
        [20, 0, 0],
        [0, 30, 0],
        [0, 0, 40],
        [-20, -20, 0],
        [1000, 1000, 1000],
      ])
    );
    expect(bytes).not.toBeNull();
    expect(Math.max(...(bytes as Uint8Array))).toBe(255);
    expect(bytes?.[5]).toBe(0);
  });

  it('is unknown where no soma has another within reach, or there is none', () => {
    expect(crowding(new Float32Array(0))).toBeNull();
    expect(crowding(positionsOf([[0, 0, 0]]))).toBeNull();
    expect(
      crowding(
        positionsOf([
          [0, 0, 0],
          [500, 0, 0],
        ])
      )
    ).toBeNull();
  });

  it('leaves out a soma with no position, which counts for no other', () => {
    const bytes = crowding(
      positionsOf([
        [0, 0, 0],
        [NaN, NaN, NaN],
        [10, 0, 0],
      ])
    );
    expect([...(bytes as Uint8Array)]).toEqual([255, 0, 255]);
  });

  // Measured when written: 7 steps of 255 at worst, 1.9 on average.
  it('comes within a few steps of the sum taken pair by pair', () => {
    const positions = cloud(2000, 900);
    const grid = crowding(positions) as Uint8Array;
    const pairs = byPairs(positions);
    let worst = 0;
    let total = 0;
    for (let cell = 0; cell < grid.length; cell++) {
      const off = Math.abs(grid[cell] - pairs[cell]);
      worst = Math.max(worst, off);
      total += off;
    }
    expect(worst).toBeLessThanOrEqual(8);
    expect(total / grid.length).toBeLessThan(2.5);
  });
});

describe("the crowding's grid", () => {
  const cells = (sizes: number[]) => sizes[0] * sizes[1] * sizes[2];

  it('is a third of the reach a step where it fits', () => {
    const { step, sizes } = gridFor({ min: [0, 0, 0], max: [1000, 1000, 1000] }, CROWDING_REACH);
    expect(step).toBe(50);
    expect(cells(sizes)).toBeLessThanOrEqual(MAX_GRID_CELLS);
  });

  // A flat circuit's thin side keeps its padding however long the step: a step grown once, as for a cube, leaves the
  // grid over four times too large.
  it('grows its step till it fits, a flat circuit too', () => {
    const { step, sizes } = gridFor({ min: [0, 0, 0], max: [1e6, 1e6, 0] }, CROWDING_REACH);
    expect(cells(sizes)).toBeLessThanOrEqual(MAX_GRID_CELLS);
    expect(step).toBeGreaterThan(50);
  });
});

describe('how crowded each soma is, worked out in a worker', () => {
  /** A worker whose answer is `answer`, which says whether it was terminated. */
  function fakeWorker(answer: Promise<Uint8Array | null>) {
    const state = { terminated: false };
    const make = () =>
      ({
        api: { crowding: () => answer },
        died: new Promise<never>(() => {}),
        terminate: () => {
          state.terminated = true;
        },
      }) as unknown as WorkerHandle<CrowdingApi>;
    return { make, state };
  }

  it("hands back the worker's bytes and terminates it", async () => {
    const bytes = Uint8Array.of(0, 255);
    const { make, state } = fakeWorker(Promise.resolve(bytes));
    await expect(
      loadCrowding(new Float32Array(6), new AbortController().signal, make)
    ).resolves.toBe(bytes);
    expect(state.terminated).toBe(true);
  });

  it('stops when it is aborted, and terminates the worker', async () => {
    const { make, state } = fakeWorker(new Promise(() => {}));
    const abort = new AbortController();
    const promise = loadCrowding(new Float32Array(6), abort.signal, make);
    abort.abort(new Error('other somas'));
    await expect(promise).rejects.toThrow('other somas');
    expect(state.terminated).toBe(true);
  });
});
