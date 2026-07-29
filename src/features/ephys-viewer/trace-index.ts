/**
 * The contract between the NWB worker and the main thread.
 *
 * The file itself is streamed into the worker's Emscripten FS and stays there, so nothing in
 * this module may import h5wasm — it is loaded on both sides of the `postMessage` boundary.
 *
 * The worker walks the whole cell/protocol/repetition/sweep hierarchy once when the file is
 * opened and ships it over as a `TraceIndex`. That keeps every structural lookup in the UI
 * synchronous; only sample data has to be fetched.
 */

export enum RecordingType {
  STIMULUS = 'stimulus',
  RESPONSE = 'response',
}

/** Sample buffers as h5wasm returns them for the float datasets in these files. */
export type Samples = Float32Array | Float64Array;

/** Everything about a recording except its samples. Cheap enough to read for the index. */
export type RecordingMeta = {
  label?: string;
  unit: string;
  conversionFactor: number;
  timeUnit: string;
  timeRate: number;
};

export type RecordingData = RecordingMeta & {
  data: number[] | Samples;
};

export type SweepData = Partial<{
  stimulus: RecordingData[];
  response: RecordingData[];
}>;

export type TraceRepetitionIndex = {
  name: string;
  sweeps: string[];
  /**
   * Metadata of the first sweep, per recording type. The viewer reads units, conversion
   * factors and sample rates off the first sweep of a repetition and applies them to the
   * whole plot, so carrying them here keeps axis titles and unit toggles synchronous.
   */
  recordings: Partial<Record<RecordingType, RecordingMeta[]>>;
};

export type TraceProtocolIndex = {
  name: string;
  repetitions: TraceRepetitionIndex[];
};

export type TraceCellIndex = {
  id: string;
  protocols: TraceProtocolIndex[];
};

export type TraceIndex = {
  recordingTypes: RecordingType[];
  /**
   * Every protocol across every cell, in the order the reader wants them listed. Most readers
   * sort alphabetically; the VU reader puts the recognised BBP protocols ahead of the ones
   * named after their raw stimulus.
   */
  protocolOrder: string[];
  cells: TraceCellIndex[];
};

/** A decimated series, ready to hand to Plotly. */
export type SweepSeries = {
  sweep: string;
  x: number[];
  y: number[];
};

export type SweepSeriesRequest = {
  cellId: string;
  protocol: string;
  repetition: string;
  sweeps: string[];
  /** Number of points to decimate down to. */
  desiredLength: number;
  /** Zoom window in milliseconds. Omitted means the whole sweep. */
  xStart?: number;
  xEnd?: number;
};

/** One recording of a repetition — a single plot — decimated across every requested sweep. */
export type RecordingSeries = {
  /** Metadata of the first requested sweep, matching what the viewer reads at index 0. */
  meta: RecordingMeta;
  series: SweepSeries[];
};

/**
 * Every recording of the repetition, in one response. The viewer draws a plot per recording
 * type and index, and a VU sweep has to be read whole to correct either of its channels, so
 * fetching them together keeps it to one pass over the file.
 */
export type SweepSeriesResponse = Partial<Record<RecordingType, RecordingSeries[]>>;

export type OpenTraceRequest = {
  fileKey: string;
  url: string;
  headers: Record<string, string>;
};

function findCell(index: TraceIndex, cellId: string): TraceCellIndex | undefined {
  return index.cells.find((cell) => cell.id === cellId);
}

function findProtocol(
  index: TraceIndex,
  cellId: string,
  protocol: string
): TraceProtocolIndex | undefined {
  return findCell(index, cellId)?.protocols.find((p) => p.name === protocol);
}

export function findRepetition(
  index: TraceIndex,
  cellId: string,
  protocol: string,
  repetition: string
): TraceRepetitionIndex | undefined {
  return findProtocol(index, cellId, protocol)?.repetitions.find((r) => r.name === repetition);
}

export function getCellIds(index: TraceIndex): string[] {
  return index.cells.map((cell) => cell.id);
}

export function getProtocols(index: TraceIndex, cellId: string): string[] {
  return findCell(index, cellId)?.protocols.map((protocol) => protocol.name) ?? [];
}

export function getRepetitions(index: TraceIndex, cellId: string, protocol: string): string[] {
  return findProtocol(index, cellId, protocol)?.repetitions.map((r) => r.name) ?? [];
}

export function getSweeps(
  index: TraceIndex,
  cellId: string,
  protocol: string,
  repetition: string
): string[] {
  return findRepetition(index, cellId, protocol, repetition)?.sweeps ?? [];
}

export function getRecordings(
  index: TraceIndex,
  cellId: string,
  protocol: string,
  repetition: string,
  recordingType: RecordingType
): RecordingMeta[] {
  return findRepetition(index, cellId, protocol, repetition)?.recordings[recordingType] ?? [];
}

/** One plot of a repetition: which recording type it draws, and which recording of that type. */
export type RecordingSlot = {
  recordingType: RecordingType;
  recordingIndex: number;
};

/**
 * Every plot a repetition is drawn as, in display order.
 *
 * The overview grid and the detail view lay the same set out differently but must agree on what
 * is in it — a thumbnail without a matching detail plot is a tile that opens onto nothing.
 */
export function getRecordingSlots(
  index: TraceIndex,
  cellId: string,
  protocol: string,
  repetition: string
): RecordingSlot[] {
  return index.recordingTypes.flatMap((recordingType) =>
    getRecordings(index, cellId, protocol, repetition, recordingType).map((_, recordingIndex) => ({
      recordingType,
      recordingIndex,
    }))
  );
}

/**
 * Whether a repetition has more recordings than the stimulus/response pair both views lay out
 * side by side. Past that they switch to a grid, so the threshold has to be the same in each.
 */
export function isMultiRecordingLayout(slots: RecordingSlot[]): boolean {
  return slots.length > 2;
}

/** Does any recording of this repetition carry a current, i.e. should the pA/nA toggle show? */
export function hasCurrentRecordings(
  index: TraceIndex,
  cellId: string,
  protocol: string,
  repetition: string
): boolean {
  const recordings = findRepetition(index, cellId, protocol, repetition)?.recordings;
  if (!recordings) return false;

  return Object.values(recordings)
    .flat()
    .some((recording) => recording.unit === 'amperes');
}

/**
 * Milliseconds per sample. The viewer plots time in ms; files that report their rate in
 * seconds (VU spells it "Seconds") need converting, anything else is treated as 1:1.
 */
export function deltaTimeMs({ timeUnit, timeRate }: RecordingMeta): number {
  return timeUnit.toLowerCase() === 'seconds' ? (1 / timeRate) * 1000 : 1;
}
