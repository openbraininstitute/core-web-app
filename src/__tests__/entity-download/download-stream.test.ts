import { Readable } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { createDownloadStream } from '@/features/entity-download/download-stream';

import { drainDownloadStream, readArchivePaths, type StubHandler, textEntry } from './fixtures';

const { handlers } = vi.hoisted(() => ({ handlers: {} as Record<string, StubHandler> }));

vi.mock('@/features/entity-download/file-handlers', () => ({ getEntityFilesHandlerMap: handlers }));
vi.mock('@/utils/logger', () => ({ logError: vi.fn(), logInfo: vi.fn() }));

const ticket = {
  kind: 'entity-batch' as const,
  entityType: EntityTypeDict.CellMorphology,
  entityIds: ['x'],
};

function stub(handler: StubHandler) {
  handlers[EntityTypeDict.CellMorphology] = handler;
}

describe('createDownloadStream', () => {
  it('ends the archive with an error and no unhandled rejection when an entry dies', async () => {
    const unhandled: unknown[] = [];
    const record = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', record);

    try {
      stub(async function* () {
        yield textEntry('a.txt', 'aaa');
        yield {
          path: 'b.bin',
          size: 10,
          stream: Readable.from(
            (async function* () {
              yield Buffer.from('bb');
              throw new TypeError('terminated');
            })()
          ),
        };
      });

      const stream = await createDownloadStream(ticket);

      await expect(drainDownloadStream(stream)).rejects.toThrow();
      // node reports an unhandled rejection on the next macrotask, so give it one
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });

      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', record);
    }
  });

  it('ends the archive with a manifest of the assets the handler could not open', async () => {
    stub(async function* (_ids, _ctx, _signal, failed) {
      yield textEntry('kept.txt', 'kept');
      failed?.push('data/0/gone.h5', 'data/0/also-gone.h5');
    });

    const paths = await readArchivePaths(await createDownloadStream(ticket));

    expect(paths).toEqual(['kept.txt', 'download-errors.txt']);
  });

  it('writes no manifest when every asset opened', async () => {
    stub(async function* () {
      yield textEntry('kept.txt', 'kept');
    });

    const paths = await readArchivePaths(await createDownloadStream(ticket));

    expect(paths).toEqual(['kept.txt']);
  });

  it('aborts the handler, releases its stream and stops opening entries once the client cancels', async () => {
    const opened: Readable[] = [];
    let generatorClosed = false;

    stub(async function* (_ids, _ctx, signal) {
      try {
        while (!signal?.aborted) {
          // never-ending body: stands in for an S3 socket still delivering bytes
          const stream = new Readable({
            read() {
              this.push(Buffer.alloc(64 * 1024));
            },
          });
          opened.push(stream);
          yield { path: `f${opened.length}.bin`, size: 10 * 1024 * 1024, stream };
        }
      } finally {
        generatorClosed = true;
      }
    });

    const stream = await createDownloadStream(ticket);
    const reader = stream.getReader();
    await reader.read();
    await reader.cancel();

    await vi.waitFor(() => {
      expect(generatorClosed).toBe(true);
      expect(opened.every((s) => s.destroyed)).toBe(true);
    });

    const openedAtCancel = opened.length;
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(opened).toHaveLength(openedAtCancel);
  });

  it('aborts an in-flight open when the client disconnects between entries', async () => {
    let aborted = false;
    let released!: () => void;
    const openingNextEntry = new Promise<void>((resolve) => {
      released = resolve;
    });

    stub(async function* (_ids, _ctx, signal) {
      yield textEntry('a.txt', 'aaa');
      // stands in for a slow asset open: nothing is written to the tar while this runs
      released();
      await new Promise<void>((resolve) => {
        signal?.addEventListener('abort', () => {
          aborted = true;
          resolve();
        });
      });
    });

    const stream = await createDownloadStream(ticket);
    const reader = stream.getReader();
    await reader.read();
    await openingNextEntry;

    expect(aborted).toBe(false);
    await reader.cancel();

    await vi.waitFor(() => expect(aborted).toBe(true));
  });

  it('aborts the handler when the request signal fires, without the client closing the stream', async () => {
    let aborted = false;
    const request = new AbortController();

    stub(async function* (_ids, _ctx, signal) {
      yield textEntry('a.txt', 'aaa');
      await new Promise<void>((resolve) => {
        signal?.addEventListener('abort', () => {
          aborted = true;
          resolve();
        });
      });
    });

    const stream = await createDownloadStream(ticket, request.signal);
    await stream.getReader().read();

    request.abort();

    await vi.waitFor(() => expect(aborted).toBe(true));
  });

  it('destroys every source stream once the archive is written', async () => {
    const bodies = ['one', 'two', 'three'];
    const sources = bodies.map((body) => Readable.from(Buffer.from(body)));

    stub(async function* () {
      for (const [i, body] of bodies.entries()) {
        yield { path: `f${i}.txt`, size: body.length, stream: sources[i] };
      }
    });

    await drainDownloadStream(await createDownloadStream(ticket));

    expect(sources.map((s) => s.destroyed)).toEqual([true, true, true]);
  });
});
