import type { ColumnValues } from '@/features/circuit-nodes/types';
import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

export type SpikeStatisticKey = 'count' | 'rate' | 'firstSpike' | 'meanIsi' | 'isiCv';

/** A value worked out for every cell, as a column of the nodes table and a plot's value. */
export type CellStatistic<Key extends string = string> = {
  key: Key;
  /** The column's name in the nodes session, prefixed so it never meets a node attribute. */
  column: string;
  label: string;
  /** The column header where the table is narrow; the full label is its tooltip. */
  short: string;
  unit?: string;
  format: (value: number) => string;
  /** The steps its values come in, given the run's span in ms: whole spikes, or one spike over the run. */
  step?: (windowMs: number) => number;
};

export type SpikeStatistic = CellStatistic<SpikeStatisticKey>;

export const SPIKE_STATISTICS: readonly SpikeStatistic[] = [
  {
    key: 'count',
    column: 'spikes:count',
    label: 'Spike count',
    short: 'Count',
    format: (v) => v.toLocaleString(),
    step: () => 1,
  },
  {
    key: 'rate',
    column: 'spikes:rate',
    label: 'Firing rate',
    short: 'Rate',
    unit: 'Hz',
    format: (v) => v.toFixed(2),
    step: (windowMs) => 1000 / windowMs,
  },
  {
    key: 'firstSpike',
    column: 'spikes:first_spike',
    label: 'First spike',
    short: 'First',
    unit: 'ms',
    format: (v) => v.toFixed(1),
  },
  {
    key: 'meanIsi',
    column: 'spikes:mean_isi',
    label: 'Mean ISI',
    short: 'ISI',
    unit: 'ms',
    format: (v) => v.toFixed(1),
  },
  {
    key: 'isiCv',
    column: 'spikes:isi_cv',
    label: 'ISI CV',
    short: 'CV',
    format: (v) => v.toFixed(2),
  },
];

export function statisticLabel(statistic: CellStatistic): string {
  return statistic.unit ? `${statistic.label} (${statistic.unit})` : statistic.label;
}

/** One value per node, in node order, for every statistic. `NaN` where a cell has none. */
export type SpikeStatistics = Record<SpikeStatisticKey, Float64Array>;

/**
 * Per-cell statistics of one population's spikes, in one pass over the
 * time-sorted trains.
 *
 * Rates are over `window`, the run's span in ms rather than the spikes' own, so
 * a cell firing once in a one-second run is at 1 Hz however early it fired. A
 * silent cell has 0 spikes at 0 Hz and no first spike. The ISI statistics need
 * two spikes for a mean and three for a CV, and are `NaN` below that.
 */
export function computeSpikeStatistics(
  population: SpikePopulation | undefined,
  cellCount: number,
  window: { min: number; max: number }
): SpikeStatistics {
  const count = new Float64Array(cellCount);
  const firstSpike = new Float64Array(cellCount).fill(Number.NaN);
  const lastSpike = new Float64Array(cellCount);
  const meanIsi = new Float64Array(cellCount);
  // Welford's running sum of squared deviations: stable however long the train.
  const isiM2 = new Float64Array(cellCount);

  const nodeIds = population?.nodeIds ?? new Float64Array(0);
  const timestamps = population?.timestamps ?? new Float32Array(0);
  for (let i = 0; i < nodeIds.length; i++) {
    const id = nodeIds[i];
    // An id past the node file's end has no row to go on.
    if (!(id >= 0 && id < cellCount) || !Number.isInteger(id)) continue;
    const t = timestamps[i];
    const seen = count[id];
    if (seen === 0) {
      firstSpike[id] = t;
    } else {
      // `seen` intervals once this one is in.
      const isi = t - lastSpike[id];
      const delta = isi - meanIsi[id];
      meanIsi[id] += delta / seen;
      isiM2[id] += delta * (isi - meanIsi[id]);
    }
    lastSpike[id] = t;
    count[id] = seen + 1;
  }

  const seconds = (window.max - window.min) / 1000;
  const rate = new Float64Array(cellCount);
  const isiCv = new Float64Array(cellCount);
  for (let id = 0; id < cellCount; id++) {
    const n = count[id];
    rate[id] = seconds > 0 ? n / seconds : Number.NaN;
    if (n < 2) meanIsi[id] = Number.NaN;
    isiCv[id] =
      n >= 3 && meanIsi[id] > 0 ? Math.sqrt(isiM2[id] / (n - 1)) / meanIsi[id] : Number.NaN;
  }

  return { count, rate, firstSpike, meanIsi, isiCv };
}

export type ValueGroup = { name: string; values: Float64Array };

/**
 * A statistic's values split by a node property, for plotting.
 *
 * `rows` narrows it to the nodes a table filter keeps; null means all of them.
 * Cells with no value are left out, and so is any group left empty. Groups come
 * in the order `compareGroupNames` gives. With no column there is one group,
 * named "All".
 */
export function groupValues(
  values: Float64Array,
  column: ColumnValues | null,
  rows: Uint32Array | null
): ValueGroup[] {
  const rowCount = rows ? rows.length : values.length;
  const rowAt = (i: number) => (rows ? rows[i] : i);

  if (column === null) {
    const kept = new Float64Array(rowCount);
    let n = 0;
    for (let i = 0; i < rowCount; i++) {
      const v = values[rowAt(i)];
      if (!Number.isNaN(v)) kept[n++] = v;
    }
    return n === 0 ? [] : [{ name: 'All', values: kept.slice(0, n) }];
  }

  // A group index per node, and the group names: the library as it is for a
  // categorical column, the distinct values for a string one.
  let names: string[];
  let groupOf: (row: number) => number;
  if (column.kind === 'categorical') {
    names = column.library;
    groupOf = (row) => column.indices[row];
  } else if (column.kind === 'string') {
    const index = new Map<string, number>();
    names = [];
    const codes = new Uint32Array(column.values.length);
    for (let row = 0; row < column.values.length; row++) {
      const name = column.values[row];
      let code = index.get(name);
      if (code === undefined) {
        code = names.length;
        index.set(name, code);
        names.push(name);
      }
      codes[row] = code;
    }
    groupOf = (row) => codes[row];
  } else {
    // A number is a value to plot, not a group to plot it in.
    return groupValues(values, null, rows);
  }

  // Two passes, sizing each group's array before filling it. An index past the
  // library's end is a malformed file's, and has no group to go in.
  const sizes = new Uint32Array(names.length);
  for (let i = 0; i < rowCount; i++) {
    const row = rowAt(i);
    const g = groupOf(row);
    if (g < names.length && !Number.isNaN(values[row])) sizes[g] += 1;
  }
  const groups = names.map((name, g) => ({ name, values: new Float64Array(sizes[g]) }));
  const filled = new Uint32Array(names.length);
  for (let i = 0; i < rowCount; i++) {
    const row = rowAt(i);
    const g = groupOf(row);
    const v = values[row];
    if (g < names.length && !Number.isNaN(v)) groups[g].values[filled[g]++] = v;
  }

  return groups
    .filter((g) => g.values.length > 0)
    .sort((a, b) => compareGroupNames(a.name, b.name));
}

/** Cells by node index, under the name of what they share. */
export type CellGroup = { name: string; cells: Uint32Array };

/**
 * The cells split by a node property, for their time courses to be drawn a
 * line each. `cells` narrows it to the ones on show; null means all `rowCount`
 * of them. With no column, or a numeric one, there is one group, "All". Groups
 * come in the order `compareGroupNames` gives.
 */
export function groupCells(
  column: ColumnValues | null,
  cells: Uint32Array | null,
  rowCount: number
): CellGroup[] {
  const shown = cells ?? Uint32Array.from({ length: rowCount }, (_, i) => i);
  if (!column || column.kind === 'numeric') {
    return shown.length > 0 ? [{ name: 'All', cells: shown }] : [];
  }
  const byName = new Map<string, number[]>();
  for (const cell of shown) {
    const name =
      column.kind === 'categorical' ? column.library[column.indices[cell]] : column.values[cell];
    if (name === undefined) continue;
    const members = byName.get(name);
    if (members) members.push(cell);
    else byName.set(name, [cell]);
  }
  return [...byName]
    .map(([name, members]) => ({ name, cells: Uint32Array.from(members) }))
    .sort((a, b) => compareGroupNames(a.name, b.name));
}

/**
 * Names that start with a number by that number, so "10" follows "9" and
 * layer "2/3" comes before "4", and ahead of everything else; the rest by
 * spelling, which keeps L23 - layers 2 and 3 - between L1 and L4, where
 * counting its digits would put it after L6.
 */
export function compareGroupNames(a: string, b: string): number {
  const x = leadingNumber(a);
  const y = leadingNumber(b);
  if (x !== null && y !== null) return x - y || a.localeCompare(b);
  if ((x === null) !== (y === null)) return x !== null ? -1 : 1;
  return a.localeCompare(b);
}

function leadingNumber(name: string): number | null {
  const match = /^\s*-?\d+(\.\d+)?/.exec(name);
  return match ? Number(match[0]) : null;
}
