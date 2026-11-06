import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/error';

import { contactPositions, recordingArrayId } from './contacts';
import {
  binAt,
  fieldStats,
  fieldValue,
  inflateRow,
  isLfpSummaryChanged,
  LfpSummaryChangedError,
  lfpSummaryIndexSchema,
  readChunkTable,
  readRanges,
  readSlice,
  rowRange,
  rowsField,
  sliceOf,
  sumFields,
} from './summary';
import { answeringRanges, deflated, rangeReader } from './test-ranges';

import type { LfpAxis, LfpDataset, LfpField, LfpSummaryIndex } from './summary';

const level0: LfpDataset = { offset: 1000, shape: [3, 4, 5], dtype: '<i2' };

describe('sliceOf', () => {
  it('spans the whole dataset with no leading index', () => {
    expect(sliceOf(level0, [])).toEqual({ offset: 1000, length: 120, shape: [3, 4, 5] });
  });

  it('finds a group, and a run of contacts within it', () => {
    expect(sliceOf(level0, [1])).toEqual({ offset: 1040, length: 40, shape: [1, 4, 5] });
    expect(sliceOf(level0, [2, 1], 3)).toEqual({
      offset: 1000 + (2 * 20 + 5) * 2,
      length: 30,
      shape: [3, 5],
    });
  });

  it('counts eight bytes a value for the table of chunks', () => {
    const table: LfpDataset = { offset: 8, shape: [2, 3, 2], dtype: '<u8' };
    expect(sliceOf(table, [])).toEqual({ offset: 8, length: 96, shape: [2, 3, 2] });
  });

  it('counts four bytes a value for float32', () => {
    expect(sliceOf({ ...level0, dtype: '<f4' }, [0, 3])).toEqual({
      offset: 1060,
      length: 20,
      shape: [1, 5],
    });
  });

  it('refuses a slice outside the dataset', () => {
    expect(() => sliceOf(level0, [3])).toThrow(RangeError);
    expect(() => sliceOf(level0, [0, 3], 2)).toThrow(RangeError);
  });
});

describe('readSlice', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('asks for the slice by range and reads it as its dtype', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(new Int16Array([1, -2, 3, -4, 5]).buffer, {
          status: 206,
          headers: { 'Content-Range': 'bytes 1020-1029/2000' },
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    const values = new Int16Array(
      await readSlice(rangeReader({ url: 'u', headers: { a: 'b' } }), level0, [0, 2])
    );
    expect(Array.from(values)).toEqual([1, -2, 3, -4, 5]);
    expect(fetchMock).toHaveBeenCalledWith(
      'u',
      expect.objectContaining({ headers: { a: 'b', Range: 'bytes=1020-1029' } })
    );
  });

  it('refuses a whole file sent by a server that ignored the range', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Int16Array(600).buffer, { status: 200 }))
    );
    await expect(readSlice(rangeReader({ url: 'u', headers: {} }), level0, [0, 2])).rejects.toThrow(
      'not read by range'
    );
  });

  it('refuses a part that does not say which range it is', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(new Int16Array(5).buffer, { status: 206 }))
    );
    await expect(readSlice(rangeReader({ url: 'u', headers: {} }), level0, [0, 2])).rejects.toThrow(
      'not read by range'
    );
  });

  it('tells a summary built again since its status was read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 412 }))
    );
    await expect(
      readSlice(rangeReader({ url: 'u', headers: {} }), level0, [0, 2])
    ).rejects.toBeInstanceOf(LfpSummaryChangedError);
    expect(isLfpSummaryChanged(new ApiError('changed', { status: 412 }))).toBe(true);
    expect(isLfpSummaryChanged(new ApiError('gone', { status: 404 }))).toBe(false);
  });
});

describe('readSlice of a part of a larger answer', () => {
  it('reads values that lie at an odd offset of its buffer', async () => {
    const answer = new Uint8Array(11);
    answer.set(new Uint8Array(Int16Array.of(-3, 7, 300, 0, -1).buffer), 1);
    const read = async () => answer.subarray(1);

    const values = new Int16Array(await readSlice(read, level0, [0, 2]));

    expect(Array.from(values)).toEqual([-3, 7, 300, 0, -1]);
  });
});

describe('rowsField', () => {
  it('packs rows in the order given', () => {
    const index = { time: { start: 0, dt: 0.5, steps: 2 } } as unknown as LfpSummaryIndex;
    const field = rowsField(index, 0.25, [Int16Array.of(3, 4), Int16Array.of(1, 2)]);
    expect(Array.from(field.data)).toEqual([3, 4, 1, 2]);
    expect(field).toMatchObject({ contacts: 2, bins: 2, binMs: 0.5, kind: 'value', scale: 0.25 });
  });
});

describe('inflateRow', () => {
  it('undoes the deflate and the shuffle, the signs too', async () => {
    const values = [1, -2, 300, -32768, 32767, 0];
    expect(Array.from(await inflateRow(deflated(values)))).toEqual(values);
  });
});

describe('rows in chunks', () => {
  afterEach(() => vi.unstubAllGlobals());

  const chunks: Record<number, ArrayBuffer> = {
    500: deflated([1, 2, 3]),
    900: deflated([7, 8, 9]),
  };
  const size = (offset: number) => BigInt(chunks[offset].byteLength);
  // Contact x (offset, size), a table per group: 2 groups, 2 contacts
  const tables = [
    BigUint64Array.from([BigInt(500), size(500), BigInt(0), BigInt(0)]),
    BigUint64Array.from([BigInt(0), BigInt(0), BigInt(900), size(900)]),
  ];
  const index = {
    contacts: 2,
    time: { start: 0, dt: 0.1, steps: 3 },
    datasets: { '/lfp/mtype/chunks': { offset: 40, shape: [2, 2, 2], dtype: '<u8' } },
  } as unknown as LfpSummaryIndex;
  const axis = {
    levels: [{ step: 1, kind: 'value', dataset: '/lfp/mtype/level0', chunks: '/lfp/mtype/chunks' }],
    scales: [1, 1],
  } as unknown as LfpAxis;
  const request = { url: 'u', headers: {} };

  it('reads rows by the offset and size of their chunks, in one request', async () => {
    const file = new Uint8Array(1000);
    file.set(new Uint8Array(chunks[500]), 500);
    file.set(new Uint8Array(chunks[900]), 900);
    const fetchMock = vi.fn(answeringRanges(file));
    vi.stubGlobal('fetch', fetchMock);

    const chunksRead = await readRanges(request, [rowRange(tables[1], 1), rowRange(tables[0], 0)]);
    const rows = await Promise.all(chunksRead.map(inflateRow));

    expect(rows.map((row) => Array.from(row))).toEqual([
      [7, 8, 9],
      [1, 2, 3],
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reads a group's table alone, and refuses an axis of plain rows", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(tables[1].buffer, {
          status: 206,
          headers: { 'Content-Range': 'bytes 72-103/200' },
        })
    );
    vi.stubGlobal('fetch', fetchMock);
    const read = rangeReader(request);

    expect(await readChunkTable(read, index, axis, 1)).toEqual(tables[1]);
    expect(fetchMock.mock.calls[0]).toEqual([
      'u',
      expect.objectContaining({ headers: { Range: 'bytes=72-103' } }),
    ]);
    const plain = { ...axis, levels: [{ step: 1, kind: 'value', dataset: 'x' }] } as LfpAxis;
    await expect(readChunkTable(read, index, plain, 0)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('readRanges', () => {
  afterEach(() => vi.unstubAllGlobals());

  // Bytes that hold the delimiter's own characters, so that they are not taken for it
  const file = new TextEncoder().encode('--b0undary'.repeat(30));
  const request = { url: 'u', headers: {} };
  const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

  it('takes each range from the part that holds it, merged or not, in the order asked', async () => {
    vi.stubGlobal('fetch', vi.fn(answeringRanges(file)));
    const asked = [
      { offset: 200, length: 5 },
      { offset: 3, length: 4 },
      { offset: 7, length: 3 },
    ];

    const parts = await readRanges(request, asked);

    expect(parts.map(text)).toEqual(
      asked.map(({ offset, length }) => text(file.slice(offset, offset + length)))
    );
  });

  it('reads a range merged into one part by its Content-Range', async () => {
    vi.stubGlobal('fetch', vi.fn(answeringRanges(file)));

    const parts = await readRanges(request, [
      { offset: 10, length: 2 },
      { offset: 12, length: 3 },
    ]);

    expect(parts.map(text)).toEqual([text(file.slice(10, 12)), text(file.slice(12, 15))]);
  });

  it('asks for at most 100 ranges a request, as more would be answered with the whole file', async () => {
    const fetchMock = vi.fn(answeringRanges(file));
    vi.stubGlobal('fetch', fetchMock);
    const asked = Array.from({ length: 150 }, (_, i) => ({ offset: i * 2, length: 1 }));

    const parts = await readRanges(request, asked);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(parts.map((p) => p[0])).toEqual(asked.map(({ offset }) => file[offset]));
  });

  it('refuses an answer with the whole file', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(file, { status: 200 }))
    );

    await expect(readRanges(request, [{ offset: 0, length: 1 }])).rejects.toThrow('by range');
  });
});

describe('sumFields', () => {
  const field = (scale: number, data: number[]): LfpField => ({
    contacts: 1,
    bins: data.length,
    binMs: 1,
    start: 0,
    kind: 'mean',
    scale,
    data: Int16Array.from(data),
  });

  it('leaves one field as it is', () => {
    const one = field(2, [1, 2]);
    expect(sumFields([one])).toBe(one);
  });

  it('adds in µV, across scales, at a scale of its own', () => {
    const sum = sumFields([field(0.5, [32767, -100]), field(2, [1000, 100])]);
    expect(sum.kind).toBe('mean');
    expect(fieldValue(sum, 0, 0)).toBeCloseTo(16383.5 + 2000, 0);
    expect(fieldValue(sum, 0, 1)).toBeCloseTo(-50 + 200, 0);
    expect(Math.max(...Array.from(sum.data, Math.abs))).toBe(32767);
  });

  it('keeps a silent sum readable', () => {
    const sum = sumFields([field(0.5, [0, 0]), field(2, [0, 0])]);
    expect(Array.from(sum.data)).toEqual([0, 0]);
    expect(sum.scale).toBe(1);
  });
});

describe('fieldStats', () => {
  it('gives the columns asked for, per contact, in µV and ms', () => {
    const field: LfpField = {
      contacts: 2,
      bins: 4,
      binMs: 2,
      start: 10,
      kind: 'mean',
      scale: 0.5,
      data: Int16Array.from([2, -6, 4, 0, 0, 0, 0, 0]),
    };
    const names = ['min', 'max', 'ptp', 'rms', 'mean', 'trough_ms'];
    const stats = fieldStats(field, names);
    expect(Array.from(stats.subarray(0, 6))).toEqual([
      -3,
      2,
      5,
      expect.closeTo(Math.sqrt(14 / 4), 5),
      0,
      12,
    ]);
    expect(Array.from(stats.subarray(6, 11))).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('the index', () => {
  const index = {
    format: 'lfp-summary',
    version: 2,
    populations: ['pop'],
    time: { start: 0, dt: 0.1, steps: 30000 },
    units: 'uV',
    contacts: 216,
    stats: ['min'],
    axes: [
      {
        name: 'total',
        groups: ['total'],
        scales: [1],
        shares: [1],
        levels: [
          { step: 1, kind: 'value', dataset: '/lfp/total/level0', chunks: '/lfp/total/chunks' },
          { step: 16, kind: 'min_max', dataset: '/lfp/total/level4' },
        ],
        stats: '/lfp/total/stats',
        psd: '/lfp/total/psd',
        psd_frequencies: [1, 2],
        correlation: { dataset: '/lfp/total/correlation', scale: 1 / 32767 },
        contact_shares: '/lfp/total/contact_shares',
      },
      {
        name: 'mtype',
        groups: ['A', 'B'],
        scales: [1, 2],
        shares: [0.25, 0.75],
        levels: [
          { step: 1, kind: 'value', dataset: '/lfp/mtype/level0', chunks: '/lfp/mtype/chunks' },
          { step: 16, kind: 'mean', dataset: '/lfp/mtype/level4' },
        ],
        stats: '/lfp/mtype/stats',
        psd: '/lfp/mtype/psd',
        psd_frequencies: [1, 2],
        contact_shares: '/lfp/mtype/contact_shares',
      },
    ],
    axes_left_out: { etype: 'memory' },
    groups_unavailable: null,
    datasets: { '/lfp/mtype/chunks': { offset: 0, shape: [2, 216, 2], dtype: '<u8' } },
  };

  it('takes a summary with group fields', () => {
    const parsed = lfpSummaryIndexSchema.parse(index);
    expect(parsed.axes[1].levels[1].kind).toBe('mean');
    expect(parsed.axes_left_out).toEqual({ etype: 'memory' });
  });

  it('takes a summary whose groups could not be built yet', () => {
    const parsed = lfpSummaryIndexSchema.parse({
      ...index,
      axes: index.axes.slice(0, 1),
      groups_unavailable: 'circuit_not_readable',
    });
    expect(parsed.groups_unavailable).toBe('circuit_not_readable');
  });

  it('refuses a summary of the format before', () => {
    expect(() => lfpSummaryIndexSchema.parse({ ...index, version: 1 })).toThrow();
  });
});

describe('fieldValue', () => {
  const base: Omit<LfpField, 'kind' | 'data' | 'bins'> = {
    contacts: 2,
    binMs: 2,
    start: 0,
    scale: 0.5,
  };

  it('scales a full-resolution value', () => {
    const field: LfpField = {
      ...base,
      kind: 'value',
      bins: 3,
      data: Int16Array.from([1, 2, 3, 4, 5, 6]),
    };
    expect(fieldValue(field, 1, 2)).toBe(3);
  });

  it('scales a mean over its bin', () => {
    const field: LfpField = {
      ...base,
      kind: 'mean',
      bins: 3,
      data: Int16Array.from([1, 2, 3, 4, 5, 6]),
    };
    expect(fieldValue(field, 1, 2)).toBe(3);
  });

  it('takes the end of a min/max bin further from zero', () => {
    const field: LfpField = {
      ...base,
      kind: 'min_max',
      bins: 1,
      data: Int16Array.from([-8, 2, -1, 6]),
    };
    expect(fieldValue(field, 0, 0)).toBe(-4);
    expect(fieldValue(field, 1, 0)).toBe(3);
  });

  it('clamps a time to the run', () => {
    const field: LfpField = { ...base, kind: 'value', bins: 3, data: new Int16Array(6) };
    expect(binAt(field, -5)).toBe(0);
    expect(binAt(field, 3.9)).toBe(1);
    expect(binAt(field, 99)).toBe(2);
  });
});

describe('contacts', () => {
  it('reads the array id from the electrodes file obi-one names after it', () => {
    expect(recordingArrayId('c1b20196-63ee-40b6-a0e9-1cf4569dfd3d.h5')).toBe(
      'c1b20196-63ee-40b6-a0e9-1cf4569dfd3d'
    );
    expect(recordingArrayId('probe.h5')).toBeNull();
    expect(recordingArrayId(undefined)).toBeNull();
  });

  it('keeps the blocks in their stored order, not by name', () => {
    const result = contactPositions(
      {
        Probe_10: { locations: [[1, 2, 3]] },
        Probe_2: {
          locations: [
            [4, 5, 6],
            [7, 8, 9],
          ],
        },
      },
      3
    );
    expect(Array.from(result?.positions ?? [])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(result?.blocks).toEqual([
      { name: 'Probe_10', first: 0, count: 1 },
      { name: 'Probe_2', first: 1, count: 2 },
    ]);
  });

  it('gives up where the order cannot be trusted or the count differs', () => {
    expect(contactPositions({ '1': { locations: [[0, 0, 0]] } }, 1)).toBeNull();
    expect(contactPositions({ a: { locations: [[0, 0, 0]] } }, 2)).toBeNull();
  });
});
