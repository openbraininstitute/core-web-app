import { startCase } from 'es-toolkit/compat';
import { Dataset, type File, Group } from 'h5wasm';

import { contactsOf } from '../trace-layout';

import type { ElectrodeColumn, ElectrodeTable, RecordingReader } from '../types';

const ELECTRODES_PATH = 'general/extracellular_ephys/electrodes';
const VOLTS_TO_MICROVOLTS = 1e6;

function attribute(item: Dataset | Group, name: string): unknown {
  const attr = item.attrs[name];
  return attr === undefined ? undefined : attr.value;
}

function numberAttribute(item: Dataset, name: string, fallback: number): number {
  const value = attribute(item, name);
  return typeof value === 'number' ? value : fallback;
}

function isElectricalSeries(item: unknown): item is Group {
  if (!(item instanceof Group)) return false;
  const type = attribute(item, 'neurodata_type');
  const data = item.get('data');
  return (
    typeof type === 'string' &&
    type.includes('ElectricalSeries') &&
    data instanceof Dataset &&
    data.shape?.length === 2
  );
}

function values(dataset: Dataset): (string | number | null)[] {
  return Array.from(dataset.to_array() as ArrayLike<unknown>, (value) => {
    if (typeof value === 'string' || typeof value === 'number') return value;
    if (typeof value === 'bigint') return Number(value);
    return null;
  });
}

/** The electrodes' own table, narrowed to the channels of a series, in their order. */
function electrodeTable(file: File, series: Group, numChannels: number): ElectrodeTable {
  const table = file.get(ELECTRODES_PATH);
  const region = series.get('electrodes');
  const indices =
    region instanceof Dataset
      ? values(region).map(Number)
      : Array.from({ length: numChannels }, (_, i) => i);
  const fallback = {
    columns: [{ key: 'channel', label: 'Channel' }],
    rows: indices.map((index) => ({ channel: index })),
  };
  if (!(table instanceof Group)) return fallback;

  const columns: ElectrodeColumn[] = [];
  const data: Record<string, (string | number | null)[]> = {};
  for (const key of table.keys()) {
    const column = table.get(key);
    if (column instanceof Dataset && !key.endsWith('_index') && column.shape?.length === 1) {
      try {
        const read = values(column);
        // References to the group, read as nothing: `group_name` says it.
        if (read.some((value) => value !== null)) {
          data[key] = read;
          columns.push({ key, label: key === 'id' ? 'Electrode' : startCase(key) });
        }
      } catch {
        // A column h5wasm cannot read is left out rather than losing the table.
      }
    }
  }
  if (columns.length === 0) return fallback;
  columns.sort((a, b) => Number(b.key === 'id') - Number(a.key === 'id'));
  return {
    columns,
    rows: indices.map((index) =>
      Object.fromEntries(columns.map(({ key }) => [key, data[key]?.[index] ?? null]))
    ),
  };
}

function timing(series: Group): { rate: number; startTime: number } {
  const starting = series.get('starting_time');
  if (starting instanceof Dataset) {
    const rate = numberAttribute(starting, 'rate', 0);
    if (rate > 0) return { rate, startTime: Number(starting.value) };
  }
  const timestamps = series.get('timestamps');
  if (timestamps instanceof Dataset) {
    const first = timestamps.slice([[0, 2]]) as unknown as ArrayLike<number>;
    if (first.length === 2 && first[1] > first[0]) {
      return { rate: 1 / (first[1] - first[0]), startTime: first[0] };
    }
  }
  throw new Error('This recording says neither its rate nor its timestamps');
}

/** One reader per electrical series under `acquisition`, the fastest first. */
export function openNwbRecordings(file: File): RecordingReader[] {
  const acquisition = file.get('acquisition');
  if (!(acquisition instanceof Group)) throw new Error('This NWB file has no acquisition');

  const readers: RecordingReader[] = [];
  for (const name of acquisition.keys()) {
    const series = acquisition.get(name);
    if (isElectricalSeries(series)) {
      const data = series.get('data') as Dataset;
      const [numFrames, numChannels] = data.shape as [number, number];
      const { rate, startTime } = timing(series);
      const volts = String(attribute(data, 'unit') ?? 'volts').toLowerCase() === 'volts';
      const toUnits = volts ? VOLTS_TO_MICROVOLTS : 1;
      const conversion = numberAttribute(data, 'conversion', 1) * toUnits;
      const offset = numberAttribute(data, 'offset', 0) * toUnits;
      const perChannel = series.get('channel_conversion');
      const channelConversion =
        perChannel instanceof Dataset ? values(perChannel).map(Number) : null;
      const electrodes = electrodeTable(file, series, numChannels);
      const labelKey = electrodes.columns.find((c) => c.key === 'channel_name')?.key;

      readers.push({
        info: {
          name,
          numFrames,
          numChannels,
          samplingFrequency: rate,
          startTime,
          units: volts ? 'µV' : String(attribute(data, 'unit')),
          channelNames: electrodes.rows.map((row, index) =>
            String((labelKey ? row[labelKey] : null) ?? index)
          ),
          electrodes,
          contacts: contactsOf(electrodes.rows, 'rel_x', 'rel_y', 'group_name'),
        },
        chunkFrames: data.metadata?.chunks?.[0] ?? undefined,
        read: async (startFrame, count) => {
          const raws = data.slice([
            [startFrame, startFrame + count],
            [0, numChannels],
          ]) as unknown as ArrayLike<number>;
          const out = new Float32Array(raws.length);
          for (let i = 0; i < raws.length; i += 1) {
            const gain = conversion * (channelConversion?.[i % numChannels] ?? 1);
            out[i] = Number(raws[i]) * gain + offset;
          }
          return out;
        },
      });
    }
  }
  if (readers.length === 0) throw new Error('This NWB file holds no electrical series');
  return readers.sort((a, b) => b.info.samplingFrequency - a.info.samplingFrequency);
}
