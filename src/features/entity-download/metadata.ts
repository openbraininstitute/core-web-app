import { Readable } from 'stream';
import { flatten } from 'flat';
import { format } from 'fast-csv';

import { bufferStream } from '@/features/entity-download/utils';

type FileEntry = {
  path: string;
  stream: Readable;
  size: number;
};

export const METADATA_FLATTEN_DELIMITER = '__';

/**
 * Manages metadata collection and CSV generation for entity downloads.
 *
 * @class Metadata
 * @description Handles flattening and converting metadata entries into a CSV format
 * for use in entity download processes.
 */
export class Metadata {
  private entries: Record<string, any>[] = [];

  public add(entry: Record<string, any>) {
    this.entries.push(entry);
  }

  public get entriesCount() {
    return this.entries.length;
  }

  public async *getFileEntries(): AsyncGenerator<FileEntry> {
    // Create JSON metadata file
    const jsonBuffer = Buffer.from(JSON.stringify(this.entries));

    yield {
      path: 'metadata.json',
      stream: Readable.from(jsonBuffer),
      size: Buffer.byteLength(jsonBuffer),
    };

    // Create  CSV metadata file
    const flattenedEntries = this.entries.map((entry) =>
      flatten(entry, { delimiter: METADATA_FLATTEN_DELIMITER })
    ) as Record<string, any>[];

    const headers = Array.from(new Set(flattenedEntries.flatMap((entry) => Object.keys(entry))));

    const metadataCsvStream = format({ headers, delimiter: ',' });

    flattenedEntries.forEach((entry) => metadataCsvStream.write(entry));
    metadataCsvStream.end();

    const metadataCsvBuffer = await bufferStream(metadataCsvStream);

    yield {
      path: 'metadata.csv',
      stream: Readable.from(metadataCsvBuffer),
      size: Buffer.byteLength(metadataCsvBuffer),
    };
  }
}
