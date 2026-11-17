/** A pack's bytes, wherever they are held, read a part at a time. */
export interface PackSource {
  /**
   * Bytes `start` to `end` once they are in; null where the pack ends before them. They may be a view of what the
   * source holds, so they are for this read alone, and a later one asks again.
   */
  read(start: number, end: number): Promise<Uint8Array | null>;
}

/** A source's bytes could not be read, whatever the browser said of it (`cause`). */
export class Unreadable extends Error {
  constructor(cause: unknown) {
    super('the stored bytes could not be read', { cause });
    this.name = 'Unreadable';
  }
}

/** A blob's bytes, each part read from it as it is asked for. A part that cannot be read is `Unreadable`. */
export function blobSource(blob: Blob): PackSource {
  return {
    async read(start, end) {
      if (end > blob.size) return null;
      try {
        return new Uint8Array(await blob.slice(start, end).arrayBuffer());
      } catch (e) {
        throw new Unreadable(e);
      }
    },
  };
}
