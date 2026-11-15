/** A pack's bytes, wherever they are held, read a part at a time. */
export interface PackFile {
  /**
   * Bytes `start` to `end` once they are in; null where the file ends before them. They may be a view of what the file
   * holds, so they are for this read alone, and a later one asks again.
   */
  read(start: number, end: number): Promise<Uint8Array | null>;
}

/**
 * A file in a Blob. A blob of a Cache Storage entry is read from the browser's cache a part at a time, where the
 * browser keeps that on disk, so the file is never in the worker's memory whole.
 */
export function blobFile(blob: Blob): PackFile {
  return {
    async read(start, end) {
      if (end > blob.size) return null;
      return new Uint8Array(await blob.slice(start, end).arrayBuffer());
    },
  };
}
