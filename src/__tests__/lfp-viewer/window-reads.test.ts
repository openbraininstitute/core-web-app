import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  levelTiling,
  readField,
  readTile,
  toGroupScale,
  undoResiduals,
  windowField,
  windowLevel,
  windowTiles,
} from '@/features/lfp-viewer/summary';
import { answeringRanges, deflated, rangeReader } from '@/features/lfp-viewer/test-ranges';
import { windowReadLevel } from '@/features/lfp-viewer/use-lfp-summary';

import type { LfpAxis, LfpSummaryIndex } from '@/features/lfp-viewer/summary';

// 300 contacts at 40 kHz for 100 s: levels of 32 to 2,048 steps
const STEPS = 4_000_000;
const TILE_BINS = 4096;
const minMax = (k: number) => ({
  step: 2 ** k,
  kind: 'min_max',
  dataset: `/lfp/total/level${k}`,
  blocks: {
    chunks: `/lfp/total/level${k}_chunks`,
    steps: Math.min(TILE_BINS, Math.ceil(STEPS / 2 ** k)),
  },
});
const axis = {
  name: 'total',
  groups: ['total'],
  scales: [0.5],
  levels: [
    {
      step: 1,
      kind: 'value',
      dataset: '/lfp/total/rows',
      blocks: { chunks: '/lfp/total/chunks', steps: 65_536, scales: '/lfp/total/block_scales' },
    },
    minMax(5),
    minMax(7),
    minMax(9),
    minMax(11),
  ],
} as unknown as LfpAxis;
const index = {
  contacts: 300,
  time: { start: 0, dt: 0.025, steps: STEPS },
  datasets: {},
} as unknown as LfpSummaryIndex;

describe('windowLevel', () => {
  it('is the coarsest level with a bin a pixel at least', () => {
    // The whole run: 1,954 bins of 2,048 steps for 1,500 px
    expect(windowLevel(axis, STEPS, 1500)).toBe(4);
    // A tenth of it: 400,000 steps, 781 bins of 512 are too few, 3,125 of 128 are enough
    expect(windowLevel(axis, STEPS / 10, 1500)).toBe(2);
  });

  it('is full resolution where the finest has too few bins', () => {
    expect(windowLevel(axis, 32 * 1500, 1500)).toBe(1);
    expect(windowLevel(axis, 32 * 1500 - 1, 1500)).toBe(0);
  });
});

describe('windowReadLevel', () => {
  const runMs = STEPS * 0.025;

  it('is no finer than the rows read fit at, as far as a zoom goes', () => {
    // 300 rows of 3 blocks are 118 MB, over the budget; 3 tiles of bins of 32 are 15 MB
    expect(windowReadLevel(index, axis, 300, 10, 1500)).toEqual({ finest: 1, levelAt: 1 });
    expect(windowReadLevel(index, axis, 100, 10, 1500)).toEqual({ finest: 0, levelAt: 0 });
  });

  it("is a short run's overview, which is its values, however narrow the window", () => {
    const shortIndex = { ...index, time: { start: 0, dt: 0.025, steps: 1500 } };
    const shortAxis = {
      ...axis,
      levels: [
        { ...axis.levels[0], blocks: { ...axis.levels[0].blocks, steps: 1500 } },
        {
          step: 1,
          kind: 'value',
          dataset: '/lfp/total/level0',
          blocks: { chunks: '/lfp/total/level0_chunks', steps: 1500 },
        },
      ],
    } as unknown as LfpAxis;

    expect(windowReadLevel(shortIndex, shortAxis, 10, 10, 1500)).toEqual({
      finest: 0,
      levelAt: 1,
    });
  });

  it('is the overview where no rows are read', () => {
    expect(windowReadLevel(index, axis, null, 10, 1500)).toEqual({ finest: 4, levelAt: 4 });
  });

  it('is the coarsest with a bin a pixel, where that is coarser', () => {
    expect(windowReadLevel(index, axis, 300, runMs / 10, 1500).levelAt).toBe(2);
  });
});

describe('windowTiles', () => {
  it("lies in a level's tiles with a bin either side", () => {
    // Bins of 0.8 ms: 1,000 ms is bins 1,250 to 2,500, so 1,249 to 2,501
    expect(windowTiles(index, axis, 1, [1000, 2000])).toEqual([0]);
    const tileMs = TILE_BINS * 0.8;
    expect(windowTiles(index, axis, 1, [tileMs, 2 * tileMs])).toEqual([0, 1, 2]);
  });

  it('is in blocks at full resolution, and stops at the ends of the run', () => {
    const blockMs = 65_536 * 0.025;
    expect(windowTiles(index, axis, 0, [0, 10])).toEqual([0]);
    expect(windowTiles(index, axis, 0, [blockMs + 1, blockMs + 2])).toEqual([1]);
    const runMs = STEPS * 0.025;
    expect(windowTiles(index, axis, 0, [runMs - 1, runMs])).toEqual([61]);
    expect(levelTiling(index, axis, 0)).toMatchObject({ tileBins: 65_536, count: 62 });
  });
});

describe('windowField', () => {
  it('puts each contact’s tiles one after another, starting at the first tile', () => {
    const small = {
      ...index,
      time: { start: 10, dt: 0.025, steps: (TILE_BINS + 3) * 32 },
    } as unknown as LfpSummaryIndex;
    const tile = (value: number, bins: number) => new Int16Array(bins * 2).fill(value);

    const field = windowField(
      small,
      axis,
      0,
      1,
      [0, 1],
      [
        [tile(1, TILE_BINS), tile(2, 3)],
        [tile(3, TILE_BINS), tile(4, 3)],
      ]
    );

    expect(field).toMatchObject({
      contacts: 2,
      bins: TILE_BINS + 3,
      binMs: 0.8,
      start: 10,
      kind: 'min_max',
      scale: 0.5,
    });
    const at = (contact: number, bin: number) => field.data[(contact * field.bins + bin) * 2];
    expect([at(0, 0), at(0, TILE_BINS), at(1, 0), at(1, TILE_BINS + 2)]).toEqual([1, 2, 3, 4]);
  });

  it('starts at the time of its first tile', () => {
    const field = windowField(index, axis, 0, 1, [2], [[new Int16Array(TILE_BINS * 2)]]);

    expect(field.start).toBeCloseTo(2 * TILE_BINS * 0.8);
    expect(field.bins).toBe(TILE_BINS);
  });
});

describe('blocks', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('are brought to the group’s scale', () => {
    expect(Array.from(toGroupScale(Int16Array.from([100, -6, 7]), 0.25, 0.5))).toEqual([50, -3, 4]);
  });

  it('are read by their chunk table and their own scales, their padding left off', async () => {
    const shortRun = { ...index, time: { start: 0, dt: 0.025, steps: 65_536 + 3 } };
    const chunk = new Uint8Array(deflated([8, 9, 10, 0]));
    const file = new Uint8Array(600);
    file.set(chunk, 500);
    vi.stubGlobal('fetch', vi.fn(answeringRanges(file)));
    // One contact, two blocks; the second, of 3 steps, padded
    const table = BigUint64Array.from([BigInt(0), BigInt(0), BigInt(500), BigInt(chunk.length)]);

    const values = await readTile(
      rangeReader({ url: 'u', headers: {} }),
      shortRun as unknown as LfpSummaryIndex,
      axis,
      { group: 0, contact: 0, levelAt: 0, tile: 1 },
      { table, scales: Float32Array.from([1, 1]), predictors: Uint8Array.from([0, 0]) }
    );

    expect(Array.from(values)).toEqual([16, 18, 20]);
  });

  it('are their residuals added back up, wrapping as int16 as they did', () => {
    // 32767 then -32767 is a step of -65534, stored wrapped as 2
    expect(Array.from(undoResiduals(Int16Array.from([32767, 2, 32767, 5]), 1))).toEqual([
      32767, -32767, 0, 5,
    ]);
    expect(Array.from(undoResiduals(Int16Array.from([1, 0, 0, 1]), 2))).toEqual([1, 2, 3, 5]);
    expect(Array.from(undoResiduals(Int16Array.from([4, -1]), 0))).toEqual([4, -1]);
  });
});

describe('tiles of an overview level', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('are read by the chunk table, the last tile cut at the end of the level', async () => {
    // Bins of 32 steps: 125,000 of them in 31 tiles, the last holding the 2,120 left, padded
    const values = Array.from({ length: TILE_BINS * 2 }, (_, i) => (i < 2120 * 2 ? i - 2000 : 0));
    const chunk = new Uint8Array(deflated(values));
    const file = new Uint8Array(600 + chunk.length);
    file.set(chunk, 600);
    const fetchMock = vi.fn(answeringRanges(file));
    vi.stubGlobal('fetch', fetchMock);
    const table = new BigUint64Array(300 * 31 * 2);
    table.set([BigInt(600), BigInt(chunk.length)], (2 * 31 + 30) * 2);

    const tile = await readTile(
      rangeReader({ url: 'u', headers: {} }),
      index,
      axis,
      { group: 0, contact: 2, levelAt: 1, tile: 30 },
      { table }
    );

    expect(Array.from(tile)).toEqual(values.slice(0, 2120 * 2));
    expect(fetchMock.mock.calls[0]).toEqual([
      'u',
      expect.objectContaining({ headers: { Range: `bytes=600-${599 + chunk.length}` } }),
    ]);
  });

  it("are a group's field put together, every contact's tiles one after another", async () => {
    // 2 contacts, 5 bins of means in tiles of 3: a tile and 2 bins each
    const small = {
      contacts: 2,
      time: { start: 0, dt: 0.1, steps: 20 },
      datasets: { '/lfp/mtype/level2_chunks': { offset: 0, shape: [2, 2, 2, 2], dtype: '<u8' } },
    } as unknown as LfpSummaryIndex;
    const means = {
      ...axis,
      scales: [1, 0.25],
      levels: [
        axis.levels[0],
        {
          step: 4,
          kind: 'mean',
          dataset: '/lfp/mtype/level2',
          blocks: { chunks: '/lfp/mtype/level2_chunks', steps: 3 },
        },
      ],
    } as unknown as LfpAxis;
    const tiles = [
      [1, 2, 3],
      [4, 5, 0],
      [6, 7, 8],
      [9, 10, 0],
    ].map((t) => new Uint8Array(deflated(t)));
    const file = new Uint8Array(1000);
    // Group 1's table, after group 0's
    const table = new BigUint64Array(8);
    tiles.forEach((tile, t) => {
      file.set(tile, 200 + t * 100);
      table.set([BigInt(200 + t * 100), BigInt(tile.length)], t * 2);
    });
    file.set(new Uint8Array(table.buffer), 64);
    const fetchMock = vi.fn(answeringRanges(file));
    vi.stubGlobal('fetch', fetchMock);

    const field = await readField(rangeReader({ url: 'u', headers: {} }), small, means, 1, 1);

    expect(Array.from(field.data)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(field).toMatchObject({ contacts: 2, bins: 5, binMs: 0.4, kind: 'mean', scale: 0.25 });
  });
});
