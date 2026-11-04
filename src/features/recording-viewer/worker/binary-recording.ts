import { contactsOf } from '../trace-layout';
import { fetchRange, resolveRequest } from './ranged-file';

import type { ElectrodeColumn, FileRequest, PreprocessedFiles, RecordingReader } from '../types';

type NumericArray = Float32Array | Float64Array | Int16Array | Int32Array | Uint16Array;

const TYPED_ARRAYS: Record<string, new (buffer: ArrayBuffer) => NumericArray> = {
  f4: Float32Array,
  f8: Float64Array,
  i2: Int16Array,
  i4: Int32Array,
  u2: Uint16Array,
};
const BY_NAME: Record<string, string> = {
  float32: 'f4',
  float64: 'f8',
  int16: 'i2',
  int32: 'i4',
  uint16: 'u2',
};

function typedArrayOf(dtype: string) {
  const code = BY_NAME[dtype] ?? dtype.replace(/^[<|=]/, '');
  const TypedArray = TYPED_ARRAYS[code];
  if (!TypedArray) throw new Error(`Traces of type ${dtype} cannot be shown`);
  return { TypedArray, bytes: Number(code.slice(1)) };
}

/** A `.npy` file's array: numbers, or strings of a fixed width. */
export function parseNpy(buffer: ArrayBuffer): (number | string)[] {
  const view = new DataView(buffer);
  const major = view.getUint8(6);
  const headerLength = major === 1 ? view.getUint16(8, true) : view.getUint32(8, true);
  const headerStart = major === 1 ? 10 : 12;
  const header = new TextDecoder().decode(new Uint8Array(buffer, headerStart, headerLength));
  const descr = header.match(/'descr':\s*'([^']+)'/)?.[1];
  if (!descr) throw new Error('This .npy file has no type');
  const data = buffer.slice(headerStart + headerLength);

  const text = descr.match(/^[<|>]U(\d+)$/);
  if (text) {
    const width = Number(text[1]);
    const codes = new Uint32Array(data);
    const values: string[] = [];
    for (let i = 0; i < codes.length; i += width) {
      const end = codes.subarray(i, i + width).indexOf(0);
      values.push(String.fromCodePoint(...codes.subarray(i, end < 0 ? i + width : i + end)));
    }
    return values;
  }
  const code = descr.replace(/^[<|=]/, '');
  if (code === 'i8') return Array.from(new BigInt64Array(data), Number);
  return Array.from(new (typedArrayOf(descr).TypedArray)(data));
}

/** Where each channel sits, from the probes: a contact says which channel it is. */
export function channelPositions(probegroup: unknown, numChannels: number) {
  const positions: (number[] | null)[] = new Array(numChannels).fill(null);
  const { probes = [] } = probegroup as {
    probes?: { contact_positions?: number[][]; device_channel_indices?: number[] | null }[];
  };
  for (const probe of probes) {
    probe.contact_positions?.forEach((position, contact) => {
      const channel = probe.device_channel_indices?.[contact] ?? contact;
      if (channel >= 0 && channel < numChannels) positions[channel] = position;
    });
  }
  return positions;
}

const PROPERTY_LABELS: Record<string, string> = {
  brain_area: 'Brain area',
  electrode_name: 'Electrode',
  group: 'Group',
};
/** What converts the values, which the table has no use for. */
const NOT_SHOWN = new Set(['gain_to_uV', 'offset_to_uV', 'gain_to_physical_unit']);

async function getJson(request: FileRequest) {
  const response = await fetch(request.url, { headers: request.headers });
  if (!response.ok) throw new Error(`Reading the recording failed (HTTP ${response.status})`);
  return response.json();
}

async function getBuffer(request: FileRequest) {
  const response = await fetch(request.url, { headers: request.headers });
  if (!response.ok) throw new Error(`Reading the recording failed (HTTP ${response.status})`);
  return response.arrayBuffer();
}

type BinaryKwargs = {
  file_paths: string[];
  sampling_frequency: number;
  t_starts?: (number | null)[] | null;
  num_channels: number;
  dtype: string;
  channel_ids: (string | number)[];
  file_offset?: number;
  gain_to_uV?: number[] | null;
  offset_to_uV?: number[] | null;
};

/** The first segment of a preprocessed recording: what spikeinterface wrote as a binary folder. */
export async function openPreprocessedRecording({
  name,
  files,
}: PreprocessedFiles): Promise<RecordingReader> {
  const { kwargs } = (await getJson(files['binary.json'])) as { kwargs: BinaryKwargs };
  const fileName = kwargs.file_paths[0];
  const raw = files[fileName];
  if (!raw) throw new Error(`The recording's ${fileName} is missing`);

  const numChannels = kwargs.num_channels;
  const { TypedArray, bytes } = typedArrayOf(kwargs.dtype);
  const frameBytes = numChannels * bytes;
  const fileOffset = kwargs.file_offset ?? 0;
  const gains = kwargs.gain_to_uV ?? null;
  const offsets = kwargs.offset_to_uV ?? null;
  const channelNames = kwargs.channel_ids.map(String);

  const positions = files['probegroup.json']
    ? channelPositions(await getJson(files['probegroup.json']), numChannels)
    : new Array(numChannels).fill(null);
  const properties: Record<string, (number | string)[]> = {};
  await Promise.all(
    Object.entries(files)
      .filter(([path]) => path.startsWith('properties/') && path.endsWith('.npy'))
      .map(async ([path, request]) => {
        const key = path.slice('properties/'.length, -'.npy'.length);
        if (NOT_SHOWN.has(key)) return;
        const values = parseNpy(await getBuffer(request));
        if (values.length === numChannels) properties[key] = values;
      })
  );
  const columns: ElectrodeColumn[] = [
    { key: 'channel', label: 'Channel' },
    ...Object.keys(properties)
      .sort()
      .map((key) => ({ key, label: PROPERTY_LABELS[key] ?? key })),
    ...(positions.some(Boolean)
      ? [
          { key: 'x', label: 'x (µm)' },
          { key: 'y', label: 'y (µm)' },
        ]
      : []),
  ];
  const rows = channelNames.map((channel, index) => ({
    channel,
    ...Object.fromEntries(Object.entries(properties).map(([key, v]) => [key, v[index]])),
    x: positions[index]?.[0] ?? null,
    y: positions[index]?.[1] ?? null,
  }));

  const signed = await resolveRequest(raw);
  const numFrames = Math.floor(((raw.size ?? 0) - fileOffset) / frameBytes);

  return {
    info: {
      name,
      numFrames,
      numChannels,
      samplingFrequency: kwargs.sampling_frequency,
      startTime: kwargs.t_starts?.[0] ?? 0,
      units: 'µV',
      channelNames,
      electrodes: { columns, rows },
      contacts: contactsOf(rows, 'x', 'y', 'group'),
    },
    read: async (startFrame, count) => {
      const start = fileOffset + startFrame * frameBytes;
      const buffer = await fetchRange(signed, start, start + count * frameBytes);
      const raws = new TypedArray(buffer);
      const values = new Float32Array(raws.length);
      for (let i = 0; i < raws.length; i += 1) {
        const channel = i % numChannels;
        values[i] = raws[i] * (gains?.[channel] ?? 1) + (offsets?.[channel] ?? 0);
      }
      return values;
    },
  };
}
