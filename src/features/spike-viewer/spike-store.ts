import { spikesToViewer } from '@/features/spike-viewer/spike-replay/spikes-to-viewer';
import { cachedSpikePca } from '@/features/spike-viewer/spike-statistics/pca';
import { computeSpikeStatistics } from '@/features/spike-viewer/spike-statistics/statistics';
import { psthSeries } from '@/features/spike-viewer/spike-statistics/time-course-figures';
import { spikeBounds, spikesBetween, spikesByCell } from '@/features/spike-viewer/spike-trace';

import type { CircuitSpikes } from '@/features/circuit-viewer/types';
import type { SpikePca } from '@/features/spike-viewer/spike-statistics/pca';
import type {
  CellGroup,
  SpikeStatistics,
} from '@/features/spike-viewer/spike-statistics/statistics';
import type {
  PsthOptions,
  PsthSeries,
} from '@/features/spike-viewer/spike-statistics/time-course-figures';
import type { SpikeData, SpikePopulation, SpikesByCell } from '@/features/spike-viewer/spike-trace';

/** A population's spikes cut to some of its cells, time-sorted as the file's are. */
export type KeptSpikes = { nodeIds: Float64Array; timestamps: Float32Array };

/**
 * Past this share of a window's spikes, the cells kept are gathered by a sweep
 * over the window rather than through the index: there are few left to skip.
 */
const GATHER_SHARE = 0.25;

const NO_SPIKES: SpikeData = {
  populations: [],
  timeRange: { min: 0, max: 0 },
  nodeIdRange: { min: 0, max: 0 },
};

/**
 * One spike file's spikes, and what the views work out from them: the spikes
 * of the cells on show, the 3D replay's arrays, each cell's statistics, PSTHs
 * and PCAs. It runs in the file's worker, so none of it holds up the page; the
 * page keeps the parsed arrays for the raster, which draws every spike anyway.
 *
 * A population gets a per-cell index the first time a cut asks for one, so
 * the spikes of a few cells cost as much as those spikes rather than the file.
 *
 * Every array it answers with is its own, so the worker can hand it over
 * without a copy and keep its data whole.
 */
export class SpikeStore {
  private data: SpikeData = NO_SPIKES;
  private readonly indices = new Map<string, SpikesByCell>();

  constructor(data?: SpikeData) {
    if (data) this.load(data);
  }

  load(data: SpikeData) {
    this.data = data;
    this.indices.clear();
  }

  /**
   * The spikes of `name`'s cells that `cells` flags by node index, all of them
   * where it is null, from `window[0]` to `window[1]` ms, or over the run.
   */
  kept(name: string, cells: Uint8Array | null, window: [number, number] | null): KeptSpikes {
    const population = this.population(name);
    if (!population) return { nodeIds: new Float64Array(0), timestamps: new Float32Array(0) };
    const { nodeIds, timestamps } = population;
    const [start, end] = window
      ? spikeBounds(timestamps, window[0], window[1])
      : [0, timestamps.length];
    if (!cells) {
      return { nodeIds: nodeIds.slice(start, end), timestamps: timestamps.slice(start, end) };
    }

    const { starts, spikes } = this.index(name, population);
    const cellCount = Math.min(cells.length, starts.length - 1);
    // Each cell's spikes are in time order, so its share of the window is found by bisection.
    const firstAtOrAfter = (from: number, to: number, spike: number) => {
      let lo = from;
      let hi = to;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (spikes[mid] < spike) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };
    const span = (cell: number): [number, number] =>
      window
        ? [
            firstAtOrAfter(starts[cell], starts[cell + 1], start),
            firstAtOrAfter(starts[cell], starts[cell + 1], end),
          ]
        : [starts[cell], starts[cell + 1]];
    let total = 0;
    for (let cell = 0; cell < cellCount; cell++) {
      if (cells[cell] !== 1) continue;
      const [from, to] = span(cell);
      total += to - from;
    }

    const keptIds = new Float64Array(total);
    const keptTimes = new Float32Array(total);
    if (total > (end - start) * GATHER_SHARE) {
      let n = 0;
      for (let i = start; i < end; i++) {
        if (cells[nodeIds[i]] !== 1) continue;
        keptIds[n] = nodeIds[i];
        keptTimes[n] = timestamps[i];
        n += 1;
      }
      return { nodeIds: keptIds, timestamps: keptTimes };
    }
    // Gathered cell by cell, then put back in the file's order, which is time order.
    const picked = new Uint32Array(total);
    let n = 0;
    for (let cell = 0; cell < cellCount; cell++) {
      if (cells[cell] !== 1) continue;
      const [from, to] = span(cell);
      picked.set(spikes.subarray(from, to), n);
      n += to - from;
    }
    picked.sort();
    for (let k = 0; k < total; k++) {
      keptIds[k] = nodeIds[picked[k]];
      keptTimes[k] = timestamps[picked[k]];
    }
    return { nodeIds: keptIds, timestamps: keptTimes };
  }

  /** What the 3D replay plays: the spikes {@link kept} gives, against the whole file's span of time. */
  viewer(
    name: string,
    cells: Uint8Array | null,
    window: [number, number] | null,
    timeRange: { min: number; max: number }
  ): CircuitSpikes | null {
    const population = this.population(name);
    if (!population) return null;
    const kept = this.kept(name, cells, window);
    return spikesToViewer(
      { ...this.data, timeRange, populations: [{ ...population, ...kept }] },
      name
    );
  }

  /** Every cell's statistics over `window`, the run or the raster's zoom. */
  statistics(
    name: string,
    cellCount: number,
    window: { min: number; max: number }
  ): SpikeStatistics {
    const population = this.population(name);
    const within = population && spikesBetween(population, window.min, window.max);
    return computeSpikeStatistics(within, cellCount, window);
  }

  psth(
    name: string,
    groups: CellGroup[],
    span: [number, number],
    rowCount: number,
    options: PsthOptions
  ): PsthSeries {
    return psthSeries(groups, this.population(name), span, rowCount, options);
  }

  /** Kept for the last few cells, spans and bins asked for, as {@link cachedSpikePca} is. */
  pca(
    name: string,
    cells: Uint32Array,
    rowCount: number,
    span: [number, number],
    binMs: number | null,
    components: number,
    includePartial: boolean
  ): SpikePca | null {
    return cachedSpikePca(
      this.population(name),
      cells,
      rowCount,
      span,
      binMs,
      components,
      includePartial
    );
  }

  private population(name: string): SpikePopulation | undefined {
    return this.data.populations.find((p) => p.name === name);
  }

  private index(name: string, population: SpikePopulation): SpikesByCell {
    let index = this.indices.get(name);
    if (!index) {
      index = spikesByCell(population.nodeIds);
      this.indices.set(name, index);
    }
    return index;
  }
}
