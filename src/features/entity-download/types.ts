import { Readable } from 'stream';

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
  contribution: string;
};

export type CsvEntry = CsvEntryBase & {
  idx: number;
  data_path?: string;
};
