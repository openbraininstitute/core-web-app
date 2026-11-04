import type { Contact } from './trace-layout';

/** Where a recording's traces are read from. */
export type RecordingSource =
  /** The raw traces of an extracellular recording's NWB file. */
  | { kind: 'nwb'; entityId: string }
  /** The processed traces in a preprocessing result's folder. */
  | { kind: 'preprocessed'; entityId: string };

/** How a worker downloads a file: the app holds the session, the worker does the reading. */
export type FileRequest = { url: string; headers: Record<string, string> };

export type ElectrodeColumn = { key: string; label: string };

/** One row per channel, in channel order. */
export type ElectrodeTable = {
  columns: ElectrodeColumn[];
  rows: Record<string, string | number | null>[];
};

export type RecordingInfo = {
  name: string;
  numFrames: number;
  numChannels: number;
  samplingFrequency: number;
  /** Time of the first frame, in seconds. */
  startTime: number;
  units: string;
  channelNames: string[];
  electrodes: ElectrodeTable;
  /** Where each channel sits on its probe, if the recording says. */
  contacts: Contact[] | null;
};

/** A preprocessed recording's files, by their path under its folder. */
export type PreprocessedFiles = {
  name: string;
  files: Record<string, FileRequest & { size?: number }>;
};

/** Reads frames of one recording, whatever it is stored in. */
export type RecordingReader = {
  info: RecordingInfo;
  /** `numFrames` frames from `startFrame`, frame by frame, in `info.units`. */
  read(startFrame: number, numFrames: number): Promise<Float32Array>;
  /** The frames a stored chunk holds, which reads of long stretches should fall in step with. */
  chunkFrames?: number;
};
