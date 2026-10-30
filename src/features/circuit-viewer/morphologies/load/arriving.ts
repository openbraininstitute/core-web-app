/**
 * A file's bytes as they come in, in one buffer of the file's size where that is known. To read a part, wait until its
 * bytes are in (`until`), then take them (`bytes`). The buffer is replaced by a larger one when the file is longer than
 * said, so take a part again for each read and never keep it for a later one.
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

  /** The whole file once it has all come in (`end`); before that, what is in so far. */
  get all(): Uint8Array {
    return this.buffer.subarray(0, this.received);
  }

  /** Bytes `start` to `end`, which must already be in. */
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

  /** Nothing more comes in: every wait for bytes learns they will not come, and a buffer past the file is cut to it. */
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
