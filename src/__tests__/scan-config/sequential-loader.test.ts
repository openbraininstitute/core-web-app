import { describe, expect, it } from 'vitest';

import {
  SequentialLoader,
  SequentialLoaderClearedError,
} from '@/features/scan-config/components/circuit-viz/sequential-loader';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('SequentialLoader', () => {
  it('runs tasks one at a time in submission order', async () => {
    const order: string[] = [];
    const loader = new SequentialLoader<string, string>(async (input) => {
      order.push(input);
      return input;
    });
    const results = await Promise.all([loader.load('a'), loader.load('b'), loader.load('c')]);
    expect(results).toEqual(['a', 'b', 'c']);
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('rejects queued tasks with SequentialLoaderClearedError on clear()', async () => {
    const gate = deferred<string>();
    const loader = new SequentialLoader<string, string>((input) =>
      input === 'running' ? gate.promise : Promise.resolve(input)
    );
    const running = loader.load('running');
    const queued = loader.load('queued');

    const queuedRejects = expect(queued).rejects.toBeInstanceOf(SequentialLoaderClearedError);
    loader.clear();
    await queuedRejects;

    gate.resolve('done');
    await expect(running).resolves.toBe('done');
  });

  it('keeps accepting new loads after clear()', async () => {
    const gate = deferred<string>();
    const loader = new SequentialLoader<string, string>((input) =>
      input === 'running' ? gate.promise : Promise.resolve(input)
    );
    const running = loader.load('running');
    const dropped = loader.load('dropped');

    const droppedRejects = expect(dropped).rejects.toBeInstanceOf(SequentialLoaderClearedError);
    loader.clear();
    await droppedRejects;

    const afterClear = loader.load('after-clear');
    gate.resolve('done');
    await expect(running).resolves.toBe('done');
    await expect(afterClear).resolves.toBe('after-clear');
  });

  it('propagates a task failure without stalling the queue', async () => {
    const loader = new SequentialLoader<string, string>(async (input) => {
      if (input === 'bad') throw new Error('boom');
      return input;
    });
    await expect(loader.load('bad')).rejects.toThrow('boom');
    await expect(loader.load('good')).resolves.toBe('good');
  });
});
