import { afterEach, describe, expect, it, vi } from 'vitest';

import { contactPositions, recordingArrayId } from './contacts';
import { binAt, fieldValue, readRow, readSlice, rowsField, sliceOf } from './summary';

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
      async () => new Response(new Int16Array([1, -2, 3, -4, 5]).buffer, { status: 206 })
    );
    vi.stubGlobal('fetch', fetchMock);
    const values = new Int16Array(
      await readSlice({ url: 'u', headers: { a: 'b' } }, level0, [0, 2])
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
    await expect(readSlice({ url: 'u', headers: {} }, level0, [0, 2])).rejects.toThrow(
      'not read by range'
    );
  });
});

describe('readRow and rowsField', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads each contact by its own range and packs them in the order given', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const range = (init.headers as Record<string, string>).Range;
      const offset = Number(range.slice('bytes='.length).split('-')[0]);
      return new Response(new Int16Array(5).fill(offset).buffer, { status: 206 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const index = {
      time: { start: 0, dt: 0.5, steps: 5 },
      datasets: { '/lfp/total/level0': level0 },
    } as unknown as LfpSummaryIndex;
    const axis = {
      levels: [{ step: 1, kind: 'value', dataset: '/lfp/total/level0' }],
      scales: [0.25, 1, 1],
    } as unknown as LfpAxis;
    const request = { url: 'u', headers: {} };
    const rows = await Promise.all([3, 1].map((c) => readRow(request, index, axis, 0, c)));
    const field = rowsField(index, axis, 0, rows);
    expect(Array.from(field.data)).toEqual([
      1030, 1030, 1030, 1030, 1030, 1010, 1010, 1010, 1010, 1010,
    ]);
    expect(field).toMatchObject({ contacts: 2, bins: 5, binMs: 0.5, kind: 'value', scale: 0.25 });
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
