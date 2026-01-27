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
  [key: string]: any;
};

export type IonChannelRecordingJsonMetadata = {
  [key: string]: any;
};

export type EmodelJsonMetadata = {
  [key: string]: any;
};

export type ExperimentalBoutonDensityJsonMetadata = {
  [key: string]: any;
};

export type ExperimentalNeuronDensityJsonMetadata = {
  [key: string]: any;
};

export type ExperimentalSynapsesPerConnectionJsonMetadata = {
  [key: string]: any;
};

export type MemodelJsonMetadata = {
  [key: string]: any;
};

export type ReconstructionMorphologyJsonMetadata = {
  [key: string]: any;
};

export type SingleNeuronSynaptomeJsonMetadata = {
  [key: string]: any;
};

export type NotebookJsonMetadata = {
  [key: string]: any;
};
