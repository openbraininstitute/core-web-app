import { circuitMorphologyPath, fetchCircuitViz } from '@/api/one/circuit-visualization';
import { SectionType } from '@/features/circuit-viewer/section-type';
import { SectionsArraySchema } from '@/features/scan-config/types';
import { logError } from '@/utils/logger';

import { buildMorphoTree, buildSonataSectionIdIndex } from './build-morpho-tree';

import type { Sections } from '@/features/scan-config/types';
import type { MorphoViewerSmallCircuitCellData } from '@/morpho-viewer';

/** A loaded cell, plus the SONATA-id index built from the same response. */
export type TLoadedCell = MorphoViewerSmallCircuitCellData & {
  sonataSectionIds: Map<number, string>;
};

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

async function loadCellAsync(
  virtualLabId: string,
  projectId: string,
  path: string,
  cellId: string
) {
  try {
    return await fetchCircuitViz(path, { virtualLabId, projectId });
  } catch (error) {
    logError(`Unable to load cell "${cellId}":`, error);
    return null;
  }
}

/** Everything OBI-One needs to hand back one cell's drawable sections. */
export type TMorphologyRequest = {
  virtualLabId: string;
  projectId: string;
  circuitId: string;
  /** The id the resulting tree carries; see `sources/node-key.ts`. */
  cellId: string;
  /** The morphology's name, as the node's `morphology` column spells it. */
  name: string;
  /** The file it lives in, relative to the circuit's SONATA directory. */
  file: string;
  showAxon: boolean;
};

/** The JSON at `path`, from the cache where it is there. The path doubles as the key: it carries everything that varies. */
function cachedJson(path: string, virtualLabId: string, projectId: string, label: string) {
  const promise =
    morphologiesCache.get(path) ?? loadCellAsync(virtualLabId, projectId, path, label);
  addToCache(path, promise);
  return promise;
}

/** Where one morphology's sections are read: a `/circuit/viz` or `/memodel/viz` path, in a workspace. */
export type TSectionsRequest = { path: string; virtualLabId: string; projectId: string };

/** A morphology's sections, kept an hour in the cache the loaders below share; rejects where they cannot be read. */
export async function loadSections({
  path,
  virtualLabId,
  projectId,
}: TSectionsRequest): Promise<Sections> {
  const json = await cachedJson(path, virtualLabId, projectId, path);
  if (json === null) throw new Error(`Morphology "${path}" could not be loaded.`);
  return SectionsArraySchema.parse(json);
}

async function actualLoad({
  virtualLabId,
  projectId,
  circuitId,
  cellId,
  name,
  file,
  showAxon,
}: TMorphologyRequest): Promise<TLoadedCell> {
  const json = await cachedJson(
    circuitMorphologyPath(circuitId, file, name),
    virtualLabId,
    projectId,
    cellId
  );
  if (json === null) throw new Error(`Morphology "${file}" could not be loaded.`);

  const sections = SectionsArraySchema.parse(json);
  const filtered_sections = sections.filter((s) => showAxon || s.type !== SectionType.Axon);
  return {
    ...buildMorphoTree(filtered_sections, cellId),
    sonataSectionIds: buildSonataSectionIdIndex(filtered_sections),
  };
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
