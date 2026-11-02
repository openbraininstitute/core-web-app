/**
 * A file's bytes as they come in, in one buffer of the file's size where that is known: a read of a part waits until
 * its bytes are in (`until`), then takes them (`bytes`). The buffer grows where the file is longer than said, so a part
 * is taken again for each read, never held across one.
 */
export class Arriving {
  private buffer: Uint8Array;
  private received = 0;
  private ended = false;
  private waiting: { end: number; settle(arrived: boolean): void }[] = [];

  /** `size` is what the file is said to be, 0 where nothing says. */
  constructor(size: number) {
    this.buffer = new Uint8Array(size);
  }

  /** A file in whole already. */
  static whole(bytes: Uint8Array): Arriving {
    const arriving = new Arriving(0);
    arriving.buffer = bytes;
    arriving.received = bytes.byteLength;
    arriving.ended = true;
    return arriving;
  }

  /** The bytes in so far. */
  get in(): number {
    return this.received;
  }

  /** The file as it came in, once it has (`end`); before, what is in so far. */
  get all(): Uint8Array {
    return this.buffer.subarray(0, this.received);
  }

  /** Bytes `start` to `end`, which are in. */
  bytes(start: number, end: number): Uint8Array {
    return this.buffer.subarray(start, end);
  }

  /** Whether the bytes up to `end` come in: true once they have, false where the file ends before them. */
  until(end: number): Promise<boolean> {
    if (end <= this.received) return Promise.resolve(true);
    if (this.ended) return Promise.resolve(false);
    return new Promise((settle) => this.waiting.push({ end, settle }));
  }

  add(chunk: Uint8Array): void {
    const at = this.received;
    if (at + chunk.byteLength > this.buffer.byteLength) {
      const grown = new Uint8Array(Math.max(2 * this.buffer.byteLength, at + chunk.byteLength));
      grown.set(this.buffer.subarray(0, at));
      this.buffer = grown;
    }
    this.buffer.set(chunk, at);
    this.received += chunk.byteLength;
    this.settle((end) => end <= this.received, true);
  }

  /** No more comes in: what waits for more is told it will not, and a buffer grown past the file let go of. */
  end(): void {
    this.ended = true;
    if (this.buffer.byteLength > this.received) this.buffer = this.buffer.slice(0, this.received);
    this.settle(() => true, false);
  }

  private settle(due: (end: number) => boolean, arrived: boolean): void {
    const still: typeof this.waiting = [];
    for (const wait of this.waiting) {
      if (due(wait.end)) wait.settle(arrived);
      else still.push(wait);
    }
    this.waiting = still;
  }
}
