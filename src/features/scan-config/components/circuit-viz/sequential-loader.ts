import { config } from '@/config';
import { MorphoViewerTreeItemType, SectionsArraySchema } from '@/features/scan-config/types';
import { logError } from '@/utils/logger';

import { buildMorphoTree } from './build-morpho-tree';
import { fetchObiOneJson } from './obi-one-fetch';

/** Settles a task dropped by {@link SequentialLoader.clear}; callers filter it out. */
export class SequentialLoaderClearedError extends Error {
  constructor() {
    super('Load cancelled: the queue was cleared.');
    this.name = 'SequentialLoaderClearedError';
  }
}

export class SequentialLoader<Input, Output> {
  private isLoading = false;
  private queue: {
    input: Input;
    resolve: (output: Output) => void;
    reject: (error: unknown) => void;
  }[] = [];

  constructor(private readonly actualLoad: (input: Input) => Promise<Output>) {}

  public load(input: Input): Promise<Output> {
    return new Promise((resolve, reject) => {
      this.queue.push({ input, resolve, reject });
      if (!this.isLoading) this.processNextTask();
    });
  }

  /** Drop queued tasks, rejecting each with {@link SequentialLoaderClearedError}. */
  clear() {
    const dropped = this.queue;
    this.queue = [];
    for (const task of dropped) task.reject(new SequentialLoaderClearedError());
  }

  private async processNextTask() {
    this.isLoading = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;

      const { input, resolve, reject } = task;
      try {
        const output = await this.actualLoad(input);
        resolve(output);
      } catch (error) {
        reject(error);
      }
    }
    this.isLoading = false;
  }
}

async function loadCellAsync(virtualLabId: string, projectId: string, url: string, cellId: string) {
  try {
    return await fetchObiOneJson(url, { virtualLabId, projectId });
  } catch (error) {
    logError(`Unable to load cell "${cellId}":`, error);
    return null;
  }
}

async function actualLoad({
  virtualLabId,
  projectId,
  circuitId,
  cellId,
  name,
  file,
  showAxon,
}: {
  virtualLabId: string;
  projectId: string;
  circuitId: string;
  cellId: string;
  name: string;
  file: string;
  showAxon: boolean;
}) {
  const nameParam = name ? `?name=${encodeURIComponent(name)}` : '';
  const url = `${config.OBI_ONE_URL}/circuit/viz/${circuitId}/morphologies/${encodeURIComponent(file)}${nameParam}`;
  const key = url;
  const promise = morphologiesCache.get(key) ?? loadCellAsync(virtualLabId, projectId, url, cellId);
  addToCache(key, promise);
  const json = await promise;
  if (json === null) throw new Error(`Morphology "${file}" could not be loaded.`);

  const sections = SectionsArraySchema.parse(json);
  const filtered_sections = sections.filter(
    (s) => showAxon || s.type !== MorphoViewerTreeItemType.Axon
  );
  return buildMorphoTree(filtered_sections, cellId);
}

const morphologiesCache = new Map<string, Promise<unknown>>();
const morphologiesCacheGarbageCollector = new Map<string, NodeJS.Timeout>();

const ONE_HOUR = 60 * 60 * 1000;

function addToCache(key: string, promise: Promise<unknown>) {
  morphologiesCache.set(key, promise);
  // A failed load must not poison the cache for an hour — evict so the next call retries.
  promise.then(
    (json) => {
      if (json === null) evictFromCache(key, promise);
    },
    () => evictFromCache(key, promise)
  );
  const pendingId = morphologiesCacheGarbageCollector.get(key);
  if (pendingId) globalThis.clearTimeout(pendingId);
  const id = globalThis.setTimeout(() => morphologiesCache.delete(key), ONE_HOUR);
  morphologiesCacheGarbageCollector.set(key, id);
}

function evictFromCache(key: string, promise: Promise<unknown>) {
  if (morphologiesCache.get(key) !== promise) return;

  morphologiesCache.delete(key);
  const pendingId = morphologiesCacheGarbageCollector.get(key);
  if (pendingId) globalThis.clearTimeout(pendingId);
  morphologiesCacheGarbageCollector.delete(key);
}

export const sequentialCellLoader = new SequentialLoader(actualLoad);

/** Synapse projection's own queue: shares the URL cache, unaffected by the axon-toggle clear(). */
export const projectionCellLoader = new SequentialLoader(actualLoad);
