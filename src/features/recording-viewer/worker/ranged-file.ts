import type { FileRequest } from '../types';

export type SyncRangeReader = (start: number, end: number) => Uint8Array;

const BLOCK_BYTES = 1024 * 1024;
const MAX_CACHED_BLOCKS = 128;

/**
 * Reads a remote file through a block cache: HDF5 asks for many small pieces, mostly its own
 * metadata, and asks again. Blocks are fetched together where they are contiguous.
 */
export class RangedFileCache {
  private blocks = new Map<number, Uint8Array>();

  constructor(
    private readRange: SyncRangeReader,
    private size: number,
    private blockBytes = BLOCK_BYTES,
    private maxBlocks = MAX_CACHED_BLOCKS
  ) {}

  /** Copies up to `length` bytes from `position` into `target`, and says how many it copied. */
  read(target: Uint8Array, offset: number, length: number, position: number): number {
    const available = Math.min(length, this.size - position);
    if (available <= 0) return 0;

    const first = Math.floor(position / this.blockBytes);
    const last = Math.floor((position + available - 1) / this.blockBytes);
    // Too much to keep: straight into the target, so it pushes out nothing.
    if (last - first + 1 > this.maxBlocks) {
      target.set(this.readRange(position, position + available), offset);
      return available;
    }

    this.fetchMissing(first, last);
    for (let index = first; index <= last; index += 1) {
      const block = this.touch(index);
      const blockStart = index * this.blockBytes;
      const from = Math.max(position, blockStart);
      const to = Math.min(position + available, blockStart + block.length);
      target.set(block.subarray(from - blockStart, to - blockStart), offset + from - position);
    }
    return available;
  }

  private touch(index: number): Uint8Array {
    const block = this.blocks.get(index);
    if (!block) throw new Error(`Block ${index} was not fetched`);
    this.blocks.delete(index);
    this.blocks.set(index, block);
    return block;
  }

  private fetchMissing(first: number, last: number) {
    let index = first;
    while (index <= last) {
      if (this.blocks.has(index)) {
        index += 1;
      } else {
        let end = index;
        while (end < last && !this.blocks.has(end + 1)) end += 1;
        const start = index * this.blockBytes;
        const stop = Math.min((end + 1) * this.blockBytes, this.size);
        const bytes = this.readRange(start, stop);
        for (let block = index; block <= end; block += 1) {
          const from = (block - index) * this.blockBytes;
          this.blocks.set(block, bytes.slice(from, from + this.blockBytes));
        }
        index = end + 1;
      }
    }
    while (this.blocks.size > this.maxBlocks) {
      const oldest = this.blocks.keys().next().value;
      if (oldest === undefined) break;
      // Never one this read still needs.
      if (oldest >= first && oldest <= last) break;
      this.blocks.delete(oldest);
    }
  }
}

/** What of emscripten's filesystem a ranged file is mounted through. */
export type MountFS = {
  writeFile(path: string, data: Uint8Array): void;
  lookupPath(path: string): {
    node: { usedBytes: number; stream_ops: Record<string, unknown> };
  };
};

/**
 * Makes `name` a file of `size` bytes whose reads go through `readRange`, so HDF5 opens a remote
 * file of any size and fetches only what it reads. Emscripten's own lazy file asks HEAD for the
 * size, which a URL signed for GET refuses.
 */
export function mountRangedFile(
  FS: MountFS,
  name: string,
  size: number,
  readRange: SyncRangeReader
) {
  const cache = new RangedFileCache(readRange, size);
  FS.writeFile(name, new Uint8Array(0));
  const { node } = FS.lookupPath(name);
  node.usedBytes = size;
  node.stream_ops = {
    ...node.stream_ops,
    read: (
      _stream: unknown,
      target: Uint8Array,
      offset: number,
      length: number,
      position: number
    ) => cache.read(target, offset, length, position),
  };
}

function checkPartial(status: number, start: number, end: number) {
  if (status !== 206) {
    throw new Error(`Reading bytes ${start}-${end - 1} of the file failed (HTTP ${status})`);
  }
}

/** A blocking ranged read, which only a worker may do: HDF5 reads synchronously. */
export function xhrRangeReader({ url, headers }: FileRequest): SyncRangeReader {
  return (start, end) => {
    const request = new XMLHttpRequest();
    request.open('GET', url, false);
    request.responseType = 'arraybuffer';
    for (const [key, value] of Object.entries(headers)) {
      request.setRequestHeader(key, value);
    }
    request.setRequestHeader('Range', `bytes=${start}-${end - 1}`);
    request.send();
    checkPartial(request.status, start, end);
    return new Uint8Array(request.response as ArrayBuffer);
  };
}

export async function fetchRange({ url, headers }: FileRequest, start: number, end: number) {
  const response = await fetch(url, {
    headers: { ...headers, Range: `bytes=${start}-${end - 1}` },
  });
  checkPartial(response.status, start, end);
  return response.arrayBuffer();
}

/**
 * The URL a file is finally served from, with no session in it: every ranged read then skips the
 * redirect, and outlives the access token.
 */
export async function resolveRequest(request: FileRequest): Promise<FileRequest> {
  const response = await fetch(request.url, {
    headers: { ...request.headers, Range: 'bytes=0-0' },
  });
  await response.body?.cancel().catch(() => {});
  if (!response.ok) throw new Error(`Opening the file failed (HTTP ${response.status})`);
  return response.url && response.url !== request.url
    ? { url: response.url, headers: {} }
    : request;
}
