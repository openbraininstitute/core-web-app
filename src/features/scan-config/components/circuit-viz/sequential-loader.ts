import authFetch from '@/auth-fetch';
import { config } from '@/config';
import { type MorphoViewerSmallCircuitCellData, MorphoViewerTreeItemType } from '@/morpho-viewer';
import { logError } from '@/utils/logger';

import { SectionsArraySchema } from '../../types';
import { buildMorphoTree } from './circuit-viz';

class SequentialLoader<Input, Output> {
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

  clear() {
    this.queue = [];
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
    const res = await authFetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'virtual-lab-id': virtualLabId,
        'project-id': projectId,
      },
    });

    const json = await res.json();
    return json;
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
  const sections = SectionsArraySchema.parse(json);
  const filtered_sections = sections.filter(
    (s) => showAxon || s.type !== MorphoViewerTreeItemType.Axon
  );
  return buildMorphoTree(filtered_sections, cellId);
}

const morphologiesCache = new Map<string, Promise<MorphoViewerSmallCircuitCellData | null>>();
const morphologiesCacheGarbageCollector = new Map<string, NodeJS.Timeout>();

const ONE_HOUR = 60 * 60 * 1000;

function addToCache(key: string, promise: Promise<MorphoViewerSmallCircuitCellData | null>) {
  morphologiesCache.set(key, promise);
  const pendingId = morphologiesCacheGarbageCollector.get(key);
  if (pendingId) globalThis.clearTimeout(pendingId);
  const id = globalThis.setTimeout(() => morphologiesCache.delete(key), ONE_HOUR);
  morphologiesCacheGarbageCollector.set(key, id);
}

export const sequentialCellLoader = new SequentialLoader(actualLoad);
