// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  electrodeColumns,
  electrodeRows,
  queryElectrodes,
} from '@/features/recording-viewer/electrode-rows';
import {
  columnLayout,
  contactsOf,
  gridLayout,
  probeMapGeometry,
} from '@/features/recording-viewer/trace-layout';
import { traceEnvelopes } from '@/features/recording-viewer/worker/envelopes';
import { readWindow } from '@/features/recording-viewer/worker/read-window';

const contact = (x: number, y: number, group = 'a') => ({ x, y, group });

describe('contactsOf', () => {
  it('reads each row where it says it is', () => {
    expect(
      contactsOf([{ rel_x: 1, rel_y: 2, group_name: 'a' }], 'rel_x', 'rel_y', 'group_name')
    ).toEqual([contact(1, 2)]);
  });

  it('has nothing to say unless every row has a position', () => {
    const rows = [
      { x: 1, y: 2 },
      { x: null, y: 2 },
    ];
    expect(contactsOf(rows, 'x', 'y', 'group')).toBeNull();
    expect(contactsOf([{ x: Number.NaN, y: 2 }], 'x', 'y', 'group')).toBeNull();
    expect(contactsOf([], 'x', 'y', 'group')).toBeNull();
  });
});

describe('columnLayout', () => {
  it('runs from the top of the probe down, across each row', () => {
    const contacts = [contact(16, 0), contact(0, 20), contact(0, 0), contact(16, 20)];

    expect(columnLayout(4, contacts).lanes.map((lane) => lane.channel)).toEqual([1, 3, 2, 0]);
  });

  it('keeps each probe together', () => {
    const contacts = [contact(0, 0, 'a'), contact(0, 0, 'b'), contact(0, 20, 'a')];

    expect(columnLayout(3, contacts).lanes.map((lane) => lane.channel)).toEqual([2, 0, 1]);
  });

  it('keeps channel order without positions', () => {
    expect(columnLayout(3, null).lanes.map((lane) => lane.channel)).toEqual([0, 1, 2]);
  });
});

describe('gridLayout', () => {
  it('puts each trace where its contact sits', () => {
    const contacts = [contact(0, 0), contact(6, 0), contact(0, 6), contact(6, 6)];
    const layout = gridLayout(4, contacts);

    expect(layout.numColumns).toBe(2);
    expect(layout.numRows).toBe(2);
    expect(layout.lanes[2]).toEqual({ channel: 2, column: 0, row: 0 });
    expect(layout.lanes[1]).toEqual({ channel: 1, column: 1, row: 1 });
    expect(layout.rowLabels).toEqual(['6 µm', '0 µm']);
  });

  it('gives each shank columns of its own, even where positions recur', () => {
    const contacts = [contact(0, 0, 'a'), contact(32, 0, 'a'), contact(0, 0, 'b')];
    const layout = gridLayout(3, contacts);

    expect(layout.numColumns).toBe(3);
    expect(layout.lanes[2].column).toBe(2);
  });

  it('falls back on a square of channels without positions', () => {
    const layout = gridLayout(5, null);

    expect(layout.numColumns).toBe(3);
    expect(layout.numRows).toBe(2);
    expect(layout.lanes[4]).toEqual({ channel: 4, column: 1, row: 1 });
  });
});

describe('probeMapGeometry', () => {
  it('finds the pitch across and along the probe', () => {
    const map = probeMapGeometry([contact(0, 0), contact(32, 0), contact(0, 15)]);

    expect(map.pitchX).toBe(32);
    expect(map.pitchY).toBe(15);
  });

  it('sets overlapping probes apart', () => {
    const map = probeMapGeometry([contact(0, 0, 'a'), contact(6, 0, 'a'), contact(0, 0, 'b')]);

    expect(map.points[2].x).toBeGreaterThan(map.points[1].x);
  });

  it('leaves probes that do not overlap where they are', () => {
    const map = probeMapGeometry([contact(0, 0, 'a'), contact(250, 0, 'b')]);

    expect(map.points.map((point) => point.x)).toEqual([0, 250]);
  });
});

describe('traceEnvelopes', () => {
  // Two channels over four frames: the first has a mean of 1, the second never moves.
  const values = Float32Array.from([-0.5, 5, 1.5, 5, -0.5, 5, 3.5, 5]);

  it('gives each channel its range in each pixel, about its mean', () => {
    const { lows, highs, width } = traceEnvelopes(values, 2, 4, 2);

    expect(width).toBe(2);
    expect(Array.from(lows.slice(0, 2))).toEqual([-1.5, -1.5]);
    expect(Array.from(highs.slice(0, 2))).toEqual([0.5, 2.5]);
    expect(Array.from(lows.slice(2))).toEqual([0, 0]);
  });

  it('takes noise so that a large spike hardly moves it', () => {
    const quiet = Float32Array.from({ length: 1000 }, (_, i) => (i % 2 ? 1 : -1));
    const spiked = quiet.slice();
    spiked.fill(500, 100, 110);

    const noise = traceEnvelopes(quiet, 1, 1000, 10).noise;
    expect(traceEnvelopes(spiked, 1, 1000, 10).noise).toBeCloseTo(noise, 4);
  });

  it('never asks for more pixels than there are frames', () => {
    expect(traceEnvelopes(values, 2, 4, 100).width).toBe(4);
  });

  it('says how far each channel moved, and how noisy the channels are', () => {
    const { peakToPeak, noise } = traceEnvelopes(values, 2, 4, 2);

    expect(Array.from(peakToPeak)).toEqual([4, 0]);
    expect(noise).toBeCloseTo(2 / 0.6745, 4);
  });
});

describe('the electrodes as the nodes grid takes them', () => {
  const table = {
    columns: [
      { key: 'channel_name', label: 'Channel name' },
      { key: 'group_name', label: 'Group' },
      { key: 'rel_y', label: 'Rel Y' },
    ],
    rows: [
      { channel_name: 'AP10', group_name: 'a', rel_y: 20 },
      { channel_name: 'AP2', group_name: 'b', rel_y: 0 },
      { channel_name: 'AP1', group_name: 'a', rel_y: null },
    ],
  };
  const rows = electrodeRows(table);
  const channels = (sort = [] as never[], filter = {}) =>
    queryElectrodes(rows, sort, filter).map((row) => row.node_id);

  it('goes by each column of what it holds', () => {
    const [name, group, position] = electrodeColumns(table);

    expect(name.kind).toBe('categorical');
    expect(group.library).toEqual(['a', 'b']);
    expect(position.kind).toBe('numeric');
    expect(position.label).toBe('Rel Y');
  });

  it('numbers each row by its channel', () => {
    expect(rows.map((row) => row.node_id)).toEqual([0, 1, 2]);
  });

  it('sorts numbers as numbers, with blanks last, and names in their natural order', () => {
    const byPosition = [{ column: 'rel_y', direction: 'asc' }] as never[];
    const byName = [{ column: 'channel_name', direction: 'asc' }] as never[];

    expect(channels(byPosition)).toEqual([1, 0, 2]);
    expect(channels(byName)).toEqual([2, 1, 0]);
  });

  it('filters as the nodes table does', () => {
    expect(channels([], { group_name: { filterType: 'set', values: ['b'] } })).toEqual([1]);
    expect(
      channels([], { channel_name: { filterType: 'text', type: 'contains', filter: 'ap1' } })
    ).toEqual([0, 2]);
    expect(
      channels([], { rel_y: { filterType: 'number', type: 'greaterThan', filter: '5' } })
    ).toEqual([0]);
  });

  it('leaves its rows as they were', () => {
    channels([{ column: 'rel_y', direction: 'desc' }] as never[]);

    expect(rows.map((row) => row.node_id)).toEqual([0, 1, 2]);
  });
});

describe('readWindow', () => {
  const NUM_CHANNELS = 2;
  /** A recording whose second channel is the negative of the first, its frame number. */
  function fakeReader(numFrames: number, chunkFrames?: number) {
    const reads: [number, number][] = [];
    const reader = {
      info: { numChannels: NUM_CHANNELS, numFrames },
      chunkFrames,
      read: async (start: number, count: number) => {
        reads.push([start, count]);
        const out = new Float32Array(count * NUM_CHANNELS);
        for (let i = 0; i < count; i += 1) {
          out[i * 2] = start + i;
          out[i * 2 + 1] = -(start + i);
        }
        return out;
      },
    };
    return { reader: reader as never, reads };
  }
  const options = { isCurrent: () => true, onProgress: () => {} };

  it('keeps every frame of what fits', async () => {
    const { reader } = fakeReader(100);
    const { values, numFrames } = await readWindow(reader, 10, 4, options);

    expect(numFrames).toBe(4);
    expect(Array.from(values)).toEqual([10, -10, 11, -11, 12, -12, 13, -13]);
  });

  it('reduces what does not to each channel’s low and high per bin', async () => {
    const { reader } = fakeReader(100);
    const { values, numFrames } = await readWindow(reader, 0, 8, options, 8);

    // Two bins of four frames, each a frame of lows and one of highs.
    expect(numFrames).toBe(4);
    expect(Array.from(values, (value) => value + 0)).toEqual([0, -3, 3, 0, 4, -7, 7, -4]);
  });

  it('never loses a spike to the reduction', async () => {
    const reader = {
      info: { numChannels: 1, numFrames: 1000 },
      read: async (start: number, count: number) => {
        const out = new Float32Array(count);
        if (start <= 617 && 617 < start + count) out[617 - start] = -500;
        return out;
      },
    } as never;
    const { values } = await readWindow(reader, 0, 1000, options, 100);

    expect(Math.min(...values)).toBe(-500);
    expect(values.length).toBeLessThanOrEqual(100);
  });

  it('falls in step with the stored chunks, reading none twice', async () => {
    // Twelve million frames per piece would be asked for without chunks of a million.
    const { reader, reads } = fakeReader(40_000_000, 1_000_000);
    await readWindow(reader, 500_000, 25_000_000, options, 1000);

    const starts = reads.map(([start]) => start);
    expect(starts[0]).toBe(500_000);
    expect(starts.slice(1).every((start) => start % 12_000_000 === 0)).toBe(true);
    expect(reads.reduce((total, [, count]) => total + count, 0)).toBe(25_000_000);
  });

  it('says how far it has got, and stops once it is not wanted', async () => {
    const { reader, reads } = fakeReader(100_000_000);
    const fractions: number[] = [];
    let current = true;
    const read = readWindow(
      reader,
      0,
      50_000_000,
      {
        isCurrent: () => current,
        onProgress: (fraction) => {
          fractions.push(fraction);
          current = false;
        },
      },
      1000
    );

    await expect(read).rejects.toThrow('newer window');
    expect(fractions).toHaveLength(1);
    expect(reads.length).toBeLessThanOrEqual(2);
  });
});
