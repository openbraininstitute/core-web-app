import { format } from 'fast-csv';
import { Readable } from 'stream';
import { bufferStream } from '@/features/entity-download/utils';
import type { CsvEntry, CsvSimulationEntryBase } from './types';

type FileEntry = {
  path: string;
  stream: Readable;
  size: number;
};

type MetadataEntry<JsonEntry> = {
  csv: CsvEntry | CsvSimulationEntryBase;
  json: JsonEntry;
};

/**
 * Manages metadata collection and CSV/JSON generation for entity downloads.
 *
 * @class Metadata
 * @description Handles converting metadata entries into a CSV/JSON format
 * for use in entity download processes.
 */
export class Metadata<JsonEntry> {
  private jsonEntries: JsonEntry[] = [];

  private csvEntries: (CsvEntry | CsvSimulationEntryBase)[] = [];

  public add(entry: MetadataEntry<JsonEntry>) {
    this.jsonEntries.push(entry.json);
    this.csvEntries.push(entry.csv);
  }

  public get entriesCount() {
    return this.csvEntries.length;
  }

  public async *getFileEntries(): AsyncGenerator<FileEntry> {
    // Create JSON metadata file
    const jsonBuffer = Buffer.from(JSON.stringify(this.jsonEntries));

    yield {
      path: 'metadata.json',
      stream: Readable.from(jsonBuffer),
      size: Buffer.byteLength(jsonBuffer),
    };

    // Create  CSV metadata file
    const metadataCsvStream = format({ headers: true, delimiter: ',' });

    this.csvEntries.forEach((entry) => {
      metadataCsvStream.write(entry);
    });
    metadataCsvStream.end();

    const metadataCsvBuffer = await bufferStream(metadataCsvStream);

    yield {
      path: 'metadata.csv',
      stream: Readable.from(metadataCsvBuffer),
      size: Buffer.byteLength(metadataCsvBuffer),
    };
  }
}
