import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  blocksOf,
  readBlock,
  readTile,
  TILE_BINS,
  toGroupScale,
  windowField,
  windowLevel,
  windowTiles,
} from '@/features/lfp-viewer/summary';
import { answeringRanges, deflated, rangeReader } from '@/features/lfp-viewer/test-ranges';
import { windowReadLevel } from '@/features/lfp-viewer/use-lfp-summary';

import type { LfpAxis, LfpSummaryIndex } from '@/features/lfp-viewer/summary';

// 300 contacts at 40 kHz for 100 s: levels of 32 to 2,048 steps
const STEPS = 4_000_000;
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
    { step: 32, kind: 'min_max', dataset: '/lfp/total/level5' },
    { step: 128, kind: 'min_max', dataset: '/lfp/total/level7' },
    { step: 512, kind: 'min_max', dataset: '/lfp/total/level9' },
    { step: 2048, kind: 'min_max', dataset: '/lfp/total/level11' },
  ],
} as unknown as LfpAxis;
const index = {
  contacts: 300,
  time: { start: 0, dt: 0.025, steps: STEPS },
  datasets: {
    '/lfp/total/level5': { offset: 1000, shape: [1, 300, STEPS / 32, 2], dtype: '<i2' },
  },
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
        { step: 1, kind: 'value', dataset: '/lfp/total/level0' },
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
    expect(blocksOf(index, axis)).toEqual({ length: 65_536, count: 62 });
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

  it('are brought to the group’s scale, their padding left off', () => {
    expect(Array.from(toGroupScale(Int16Array.from([100, -6, 7, 0]), 3, 0.25, 0.5))).toEqual([
      50, -3, 4,
    ]);
  });

  it('are read by their chunk table and their own scales', async () => {
    const shortRun = { ...index, time: { start: 0, dt: 0.025, steps: 65_536 + 3 } };
    const chunk = new Uint8Array(deflated([8, 9, 10, 0]));
    const file = new Uint8Array(600);
    file.set(chunk, 500);
    vi.stubGlobal('fetch', vi.fn(answeringRanges(file)));
    // One contact, two blocks; the second, of 3 steps, padded
    const table = BigUint64Array.from([BigInt(0), BigInt(0), BigInt(500), BigInt(chunk.length)]);

    const values = await readBlock(
      rangeReader({ url: 'u', headers: {} }),
      shortRun as unknown as LfpSummaryIndex,
      axis,
      { group: 0, contact: 0, block: 1 },
      table,
      Float32Array.from([1, 1])
    );

    expect(Array.from(values)).toEqual([16, 18, 20]);
  });
});

describe('readTile', () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads a contact's bins of a tile, the last tile cut at the end of the level", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 416 }));
    vi.stubGlobal('fetch', fetchMock);
    const read = rangeReader({ url: 'u', headers: {} });

    await readTile(read, index, axis, { group: 0, contact: 2, levelAt: 1, tile: 30 }).catch(
      () => null
    );

    // Contact 2 is 2 × 125,000 bins × 2 values × 2 bytes in; tile 30 starts at bin 122,880 and
    // holds the 2,120 left
    const offset = 1000 + (2 * 125_000 + 122_880) * 4;
    const range = `bytes=${offset}-${offset + 2120 * 4 - 1}`;
    expect(fetchMock.mock.calls[0]).toEqual([
      'u',
      expect.objectContaining({ headers: { Range: range } }),
    ]);
  });
});
