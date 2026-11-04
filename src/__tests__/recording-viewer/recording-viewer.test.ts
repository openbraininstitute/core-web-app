// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ScanConfigActivity } from '@/features/scan-config/types';

import type { RecordingWorkerImpl } from '@/features/recording-viewer/worker/recording.worker';

const hoisted = vi.hoisted(() => ({ worker: null as RecordingWorkerImpl | null }));
vi.mock('comlink', () => ({
  expose: (worker: RecordingWorkerImpl) => {
    hoisted.worker = worker;
  },
}));
vi.mock('h5wasm', async () => import('h5wasm/node'));

const { channelPositions, parseNpy } = await import(
  '@/features/recording-viewer/worker/binary-recording'
);
const { RangedFileCache } = await import('@/features/recording-viewer/worker/ranged-file');
const { recordingSourceOfConfig } = await import('@/features/recording-viewer/source');
const { resolveRightPreviewMode, RightPreviewModeDict } = await import(
  '@/features/scan-config/components/model-preview/helpers'
);
await import('@/features/recording-viewer/worker/recording.worker');

function npy(descr: string, shape: string, data: ArrayBuffer) {
  const header = `{'descr': '${descr}', 'fortran_order': False, 'shape': (${shape}), }`;
  const bytes = new TextEncoder().encode(header);
  const out = new Uint8Array(10 + bytes.length + data.byteLength);
  out.set([0x93, 0x4e, 0x55, 0x4d, 0x50, 0x59, 1, 0]);
  new DataView(out.buffer).setUint16(8, bytes.length, true);
  out.set(bytes, 10);
  out.set(new Uint8Array(data), 10 + bytes.length);
  return out.buffer;
}

function text(values: string[], width: number) {
  const codes = new Uint32Array(values.length * width);
  values.forEach((value, i) => {
    Array.from(value).forEach((char, j) => {
      codes[i * width + j] = char.codePointAt(0) ?? 0;
    });
  });
  return codes.buffer;
}

describe('parseNpy', () => {
  it('reads floats, 64-bit integers and fixed-width text', () => {
    expect(parseNpy(npy('<f8', '2,', new Float64Array([1.5, 2]).buffer))).toEqual([1.5, 2]);
    expect(parseNpy(npy('<i8', '2,', new BigInt64Array([BigInt(3), BigInt(4)]).buffer))).toEqual([
      3, 4,
    ]);
    expect(parseNpy(npy('<U7', '2,', text(['unknown', 'CA1'], 7)))).toEqual(['unknown', 'CA1']);
  });
});

describe('channelPositions', () => {
  it('places each contact at the channel it is wired to', () => {
    const probegroup = {
      probes: [
        {
          contact_positions: [
            [0, 0],
            [0, 20],
          ],
          device_channel_indices: [1, 0],
        },
      ],
    };

    expect(channelPositions(probegroup, 3)).toEqual([[0, 20], [0, 0], null]);
  });
});

describe('RangedFileCache', () => {
  const bytes = Uint8Array.from({ length: 100 }, (_, i) => i);

  function cache(maxBlocks = 4) {
    const calls: [number, number][] = [];
    const reader = new RangedFileCache(
      (start, end) => {
        calls.push([start, end]);
        return bytes.slice(start, end);
      },
      bytes.length,
      10,
      maxBlocks
    );
    return { reader, calls };
  }

  function read(reader: InstanceType<typeof RangedFileCache>, position: number, length: number) {
    const target = new Uint8Array(length);
    const copied = reader.read(target, 0, length, position);
    return Array.from(target.subarray(0, copied));
  }

  it('fetches contiguous blocks at once, and only once', () => {
    const { reader, calls } = cache();

    expect(read(reader, 5, 10)).toEqual(Array.from(bytes.slice(5, 15)));
    expect(read(reader, 12, 5)).toEqual(Array.from(bytes.slice(12, 17)));

    expect(calls).toEqual([[0, 20]]);
  });

  it('stops at the end of the file', () => {
    const { reader } = cache();

    expect(read(reader, 95, 10)).toEqual(Array.from(bytes.slice(95)));
    expect(read(reader, 100, 10)).toEqual([]);
  });

  it('keeps no more blocks than it may, and refetches what it dropped', () => {
    const { reader, calls } = cache(2);

    read(reader, 0, 5);
    read(reader, 10, 5);
    read(reader, 20, 5);
    read(reader, 0, 5);

    expect(calls.at(-1)).toEqual([0, 10]);
    expect(calls).toHaveLength(4);
  });

  it('reads past its capacity straight into the target', () => {
    const { reader, calls } = cache(2);

    expect(read(reader, 0, 45)).toEqual(Array.from(bytes.slice(0, 45)));
    expect(calls).toEqual([[0, 45]]);
  });
});

describe('recordingSourceOfConfig', () => {
  it('prefers the preprocessing result a sorter works on', () => {
    expect(
      recordingSourceOfConfig({
        initialize: { preprocessing_result: { type: 'TaskResultFromID', id_str: 'r' } },
      })
    ).toEqual({ kind: 'preprocessed', entityId: 'r' });
  });

  it('reads the recording however the form holds it', () => {
    const expected = { kind: 'nwb', entityId: 'n' };

    expect(recordingSourceOfConfig({ initialize: { recording: { id_str: 'n' } } })).toEqual(
      expected
    );
    expect(recordingSourceOfConfig({ initialize: { recording: [{ id_str: 'n' }] } })).toEqual(
      expected
    );
  });

  it('has nothing to show before a pick', () => {
    expect(recordingSourceOfConfig({ initialize: { recording: null } })).toBeNull();
    expect(recordingSourceOfConfig({})).toBeNull();
  });
});

describe('the right-hand preview', () => {
  const base = {
    activity: ScanConfigActivity.SpikeSorting,
    entityType: 'extracellular_recording',
    hasEntity: false,
  };

  it('is the recording throughout spike sorting', () => {
    expect(resolveRightPreviewMode({ ...base, entityPreviewActive: false })).toBe(
      RightPreviewModeDict.Recording
    );
  });

  it('survives a pick in the browser, but not a click on an entity', () => {
    expect(
      resolveRightPreviewMode({
        ...base,
        entityPreviewActive: true,
        entityPreviewFromSelection: true,
      })
    ).toBe(RightPreviewModeDict.Recording);
    expect(resolveRightPreviewMode({ ...base, entityPreviewActive: true })).toBe(
      RightPreviewModeDict.EntityPreview
    );
  });
});

describe('a preprocessed recording in the worker', () => {
  const NUM_CHANNELS = 2;
  const FRAMES = 1000;
  const RATE = 1000;
  const raw = new Int16Array(FRAMES * NUM_CHANNELS);
  raw.forEach((_, i) => {
    raw[i] = Math.floor(i / NUM_CHANNELS) + (i % NUM_CHANNELS) * 10000;
  });
  const files: Record<string, ArrayBuffer | object> = {
    'binary.json': {
      kwargs: {
        file_paths: ['traces_cached_seg0.raw'],
        sampling_frequency: RATE,
        t_starts: [2],
        num_channels: NUM_CHANNELS,
        dtype: '<i2',
        channel_ids: ['a', 'b'],
        file_offset: 0,
        gain_to_uV: [2, 2],
        offset_to_uV: [0, 1],
      },
    },
    'probegroup.json': {
      probes: [
        {
          contact_positions: [
            [0, 0],
            [0, 20],
          ],
          device_channel_indices: [0, 1],
        },
      ],
    },
    'traces_cached_seg0.raw': raw.buffer,
    'properties/group.npy': npy('<i8', '2,', new BigInt64Array([BigInt(0), BigInt(1)]).buffer),
    'properties/gain_to_uV.npy': npy('<f8', '2,', new Float64Array([2, 2]).buffer),
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function open() {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: { headers?: Record<string, string> }) => {
        const content = files[url];
        const range = init?.headers?.Range?.match(/bytes=(\d+)-(\d+)/);
        if (content instanceof ArrayBuffer) {
          return new Response(
            range ? content.slice(Number(range[1]), Number(range[2]) + 1) : content,
            { status: range ? 206 : 200 }
          );
        }
        return new Response(JSON.stringify(content));
      })
    );
    const worker = hoisted.worker as RecordingWorkerImpl;
    const [info] = await worker.openPreprocessed([
      {
        name: 'rec',
        files: Object.fromEntries(
          Object.keys(files).map((path) => [
            path,
            {
              url: path,
              headers: {},
              size: path.endsWith('.raw') ? raw.byteLength : undefined,
            },
          ])
        ),
      },
    ]);
    return { worker, info };
  }

  it('describes the recording and its electrodes', async () => {
    const { info } = await open();

    expect(info).toMatchObject({
      numFrames: FRAMES,
      numChannels: NUM_CHANNELS,
      samplingFrequency: RATE,
      startTime: 2,
      units: 'µV',
      channelNames: ['a', 'b'],
    });
    expect(info.electrodes.columns.map((c) => c.key)).toEqual(['channel', 'group', 'x', 'y']);
    expect(info.electrodes.rows[1]).toEqual({ channel: 'b', group: 1, x: 0, y: 20 });
  });

  it('reads only the window, converted to microvolts', async () => {
    const { worker } = await open();

    const window = await worker.loadWindow('rec', 2.5, 0.1);
    const trace = await worker.getNodeTrace({
      populationName: window.name,
      traceIndex: 1,
      desiredPoints: 1000,
    });

    expect(window.timeConfig.startTime).toBeCloseTo(2.5);
    expect(window.traces.map((t) => t.label)).toEqual(['a', 'b']);
    expect(trace.x).toHaveLength(100);
    expect(trace.y[0]).toBeCloseTo((500 + 10000) * 2 + 1);
    await expect(worker.getValueRange(window.name)).resolves.toEqual([1000, 21199]);
  });

  it('stops a window at the end of the recording', async () => {
    const { worker } = await open();

    const window = await worker.loadWindow('rec', 2.95, 5);

    expect(window.timeConfig.endTime).toBeCloseTo(2.999);
  });
});
