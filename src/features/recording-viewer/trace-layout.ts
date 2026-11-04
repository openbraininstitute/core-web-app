import type { ElectrodeTable } from './types';

/** Where a channel's contact sits on its probe, in micrometres. */
export type Contact = { x: number; y: number; group: string };

/** Where a channel's trace is drawn among the others. */
export type TraceLane = { channel: number; column: number; row: number };

export type TraceLayout = {
  lanes: TraceLane[];
  numColumns: number;
  numRows: number;
  /** A lane's label beside its row, if its row has one meaning. */
  rowLabels?: string[];
  /** Noise deviations a lane spans either side of its centre, at a gain of 1. */
  noiseRange: number;
  /** How many lanes a large spike may reach over its neighbours. */
  laneReach: number;
  /** The space between columns, so that each reads as its own. */
  columnGapPx: number;
};

/** One line after another, whose spikes may run over their neighbours, as in acquisition software. */
const COLUMN_DRAWING = { noiseRange: 4, laneReach: 3, columnGapPx: 0 };
/** Small multiples, which stay apart only if each trace keeps to its own cell. */
const GRID_DRAWING = { noiseRange: 8, laneReach: 0.5, columnGapPx: 10 };

/** The contacts of a table's rows, or null unless every row has a position. */
export function contactsOf(
  rows: ElectrodeTable['rows'],
  xKey: string,
  yKey: string,
  groupKey: string
): Contact[] | null {
  const contacts: Contact[] = [];
  for (const row of rows) {
    const x = row[xKey];
    const y = row[yKey];
    if (typeof x !== 'number' || typeof y !== 'number') return null;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    contacts.push({ x, y, group: String(row[groupKey] ?? '') });
  }
  return contacts.length > 0 ? contacts : null;
}

function ascending(values: Iterable<number>) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function groupsOf(contacts: Contact[]) {
  return [...new Set(contacts.map((contact) => contact.group))];
}

/** One column of traces, from the top of each probe to its tip, side by side on a row. */
export function columnLayout(numChannels: number, contacts: Contact[] | null): TraceLayout {
  const channels = Array.from({ length: numChannels }, (_, channel) => channel);
  if (contacts) {
    const groups = groupsOf(contacts);
    channels.sort(
      (a, b) =>
        groups.indexOf(contacts[a].group) - groups.indexOf(contacts[b].group) ||
        contacts[b].y - contacts[a].y ||
        contacts[a].x - contacts[b].x
    );
  }
  return {
    lanes: channels.map((channel, row) => ({ channel, column: 0, row })),
    numColumns: 1,
    numRows: numChannels,
    ...COLUMN_DRAWING,
  };
}

/** Each trace where its contact sits on the probe, with a column per position across it. */
export function gridLayout(numChannels: number, contacts: Contact[] | null): TraceLayout {
  if (!contacts) {
    const numColumns = Math.ceil(Math.sqrt(numChannels));
    return {
      lanes: Array.from({ length: numChannels }, (_, channel) => ({
        channel,
        column: channel % numColumns,
        row: Math.floor(channel / numColumns),
      })),
      numColumns,
      numRows: Math.ceil(numChannels / numColumns),
      ...GRID_DRAWING,
    };
  }
  const depths = ascending(contacts.map((contact) => contact.y)).reverse();
  const columnOf = new Map<string, number>();
  for (const group of groupsOf(contacts)) {
    const across = ascending(contacts.filter((c) => c.group === group).map((c) => c.x));
    for (const x of across) columnOf.set(`${group}:${x}`, columnOf.size);
  }
  return {
    lanes: contacts.map((contact, channel) => ({
      channel,
      column: columnOf.get(`${contact.group}:${contact.x}`) ?? 0,
      row: depths.indexOf(contact.y),
    })),
    numColumns: columnOf.size,
    numRows: depths.length,
    rowLabels: depths.map((depth) => `${depth} µm`),
    ...GRID_DRAWING,
  };
}

/** The contact of each channel on a map of the probes, with probes that overlap set apart. */
export type ProbeMapGeometry = {
  points: { channel: number; x: number; y: number }[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  pitchX: number;
  pitchY: number;
};

function smallestStep(sorted: number[]) {
  let step = Number.POSITIVE_INFINITY;
  for (let i = 1; i < sorted.length; i += 1) step = Math.min(step, sorted[i] - sorted[i - 1]);
  return Number.isFinite(step) ? step : 0;
}

export function probeMapGeometry(contacts: Contact[]): ProbeMapGeometry {
  const steps = ascending(contacts.map((contact) => contact.x));
  const pitchX = smallestStep(steps) || smallestStep(ascending(contacts.map((c) => c.y))) || 1;
  const pitchY = smallestStep(ascending(contacts.map((c) => c.y))) || pitchX;

  const shifts = new Map<string, number>();
  let right = Number.NEGATIVE_INFINITY;
  for (const group of groupsOf(contacts)) {
    const xs = contacts.filter((c) => c.group === group).map((c) => c.x);
    const low = Math.min(...xs);
    const shift = low <= right ? right + 4 * pitchX - low : 0;
    shifts.set(group, shift);
    right = Math.max(...xs) + shift;
  }
  const points = contacts.map((contact, channel) => ({
    channel,
    x: contact.x + (shifts.get(contact.group) ?? 0),
    y: contact.y,
  }));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    points,
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    pitchX,
    pitchY,
  };
}
