import { Readable } from 'stream';

export type FileEntry = {
  path: string;
  stream: Readable;
  size: number;
};
