import * as Comlink from 'comlink';
import { File } from 'h5wasm';

import { SpikeStore } from '@/features/spike-viewer/spike-store';
import { parseSpikeData } from '@/features/spike-viewer/spike-trace';
import { unlinkFromFS, writeToFS } from '@/utils/h5/fs';

import type { CellGroup } from '@/features/spike-viewer/spike-statistics/statistics';
import type { PsthOptions } from '@/features/spike-viewer/spike-statistics/time-course-figures';
import type { SpikeData } from '@/features/spike-viewer/spike-trace';

/** The file's spikes, kept here to answer the views from once the page has its own. */
const store = new SpikeStore();

/** The buffers behind `arrays`, handed over rather than copied. */
function handOver<T>(value: T, arrays: ArrayBufferView[]): T {
  return Comlink.transfer(
    value,
    arrays.map((array) => array.buffer as ArrayBuffer)
  );
}

const api = {
  async parseSpikeFile(id: string, buffer: ArrayBuffer): Promise<SpikeData> {
    const { filename } = await writeToFS(id, buffer);

    let file: File | null = null;
    try {
      file = new File(filename, 'r');
      const data = parseSpikeData(file);

      // A copy stays: the page is handed the parsed arrays themselves, zero-copy.
      store.load({
        ...data,
        populations: data.populations.map((p) => ({
          ...p,
          nodeIds: p.nodeIds.slice(),
          timestamps: p.timestamps.slice(),
        })),
      });
      return handOver(
        data,
        data.populations.flatMap((p) => [p.timestamps, p.nodeIds])
      );
    } finally {
      file?.close();
      await unlinkFromFS(filename);
    }
  },

  /** Spikes parsed elsewhere, such as a harness's, to answer from. */
  adopt(data: SpikeData) {
    store.load(data);
  },

  kept(name: string, cells: Uint8Array | null, window: [number, number] | null) {
    const kept = store.kept(name, cells, window);
    return handOver(kept, [kept.nodeIds, kept.timestamps]);
  },

  viewer(
    name: string,
    cells: Uint8Array | null,
    window: [number, number] | null,
    timeRange: { min: number; max: number }
  ) {
    const spikes = store.viewer(name, cells, window, timeRange);
    return spikes ? handOver(spikes, [spikes.cellIndices, spikes.times]) : null;
  },

  statistics(name: string, cellCount: number, window: { min: number; max: number }) {
    const statistics = store.statistics(name, cellCount, window);
    return handOver(statistics, Object.values(statistics));
  },

  psth(
    name: string,
    groups: CellGroup[],
    span: [number, number],
    rowCount: number,
    options: PsthOptions
  ) {
    const series = store.psth(name, groups, span, rowCount, options);
    return handOver(series, [series.x, ...series.ys]);
  },

  // Copied rather than handed over: the store keeps the last few, to answer again.
  pca(
    name: string,
    cells: Uint32Array,
    rowCount: number,
    span: [number, number],
    binMs: number | null,
    components: number,
    includePartial: boolean
  ) {
    return store.pca(name, cells, rowCount, span, binMs, components, includePartial);
  },
};

export type SpikeTraceWorkerApi = typeof api;

Comlink.expose(api);
