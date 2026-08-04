import type { Readable } from 'node:stream';

export type FileEntry = {
  path: string;
  stream: Readable;
  size: number;
};

export type CsvEntryBase = {
  name: string;
  description: string;
  subject_name: string;
  species_name: string;
  brain_region: string;
  contributors: string;
};

export type CsvSimulationEntryBase = {
  name: string;
  description: string;
};

export type CsvEntry = CsvEntryBase & {
  idx: number;
  data_path?: string;
};

export type ElectricalCellRecordingJsonMetadata = {
  [key: string]: unknown;
};

export type IonChannelRecordingJsonMetadata = {
  [key: string]: unknown;
};

export type EmodelJsonMetadata = {
  [key: string]: unknown;
};

export type ExperimentalBoutonDensityJsonMetadata = {
  [key: string]: unknown;
};

export type ExperimentalNeuronDensityJsonMetadata = {
  [key: string]: unknown;
};

export type ExperimentalSynapsesPerConnectionJsonMetadata = {
  [key: string]: unknown;
};

export type MemodelJsonMetadata = {
  [key: string]: unknown;
};

export type ReconstructionMorphologyJsonMetadata = {
  [key: string]: unknown;
};

export type SingleNeuronSynaptomeJsonMetadata = {
  [key: string]: unknown;
};

export type NotebookJsonMetadata = {
  [key: string]: unknown;
};

export type EMCellMeshJsonMetadata = {
  [key: string]: unknown;
};

export type TaskResultJsonMetadata = {
  [key: string]: unknown;
};
