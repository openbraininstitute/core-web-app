import { describe, expect, it } from 'vitest';

import { spikePca } from '@/features/spike-viewer/spike-statistics/pca';
import { computeSpikeStatistics } from '@/features/spike-viewer/spike-statistics/statistics';
import { psthSeries } from '@/features/spike-viewer/spike-statistics/time-course-figures';
import { SpikeStore } from '@/features/spike-viewer/spike-store';
import { spikesBetween } from '@/features/spike-viewer/spike-trace';

import type { SpikeData, SpikePopulation } from '@/features/spike-viewer/spike-trace';

const CELLS = 50;

/** Time-sorted spikes over 1 s from 50 cells, with an id past the cells, a negative and a fractional one among them. */
function recording(): SpikeData {
  let seed = 7;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const pairs: [number, number][] = [];
  for (let i = 0; i < 2000; i++) pairs.push([random() * 1000, Math.floor(random() * CELLS)]);
  pairs.push([100, 60], [200, -1], [300, 3.5]);
  pairs.sort((a, b) => a[0] - b[0]);
  const population: SpikePopulation = {
    name: 'cortex',
    timestamps: Float32Array.from(pairs, ([t]) => t),
    nodeIds: Float64Array.from(pairs, ([, id]) => id),
    nodeIdRange: { min: -1, max: 60 },
  };
  return {
    populations: [population],
    timeRange: { min: 0, max: 1000 },
    nodeIdRange: { min: -1, max: 60 },
  };
}

/** What a cut has to come to: every spike of a flagged cell in the window, in the file's order. */
function cut(population: SpikePopulation, cells: Uint8Array, [from, to]: [number, number]) {
  const ids: number[] = [];
  const times: number[] = [];
  population.timestamps.forEach((t, i) => {
    if (t >= from && t <= to && cells[population.nodeIds[i]] === 1) {
      ids.push(population.nodeIds[i]);
      times.push(t);
    }
  });
  return { ids, times };
}

function flags(...cells: number[]): Uint8Array {
  const flagged = new Uint8Array(CELLS);
  for (const cell of cells) flagged[cell] = 1;
  return flagged;
}

describe('SpikeStore', () => {
  const data = recording();
  const [population] = data.populations;
  const store = new SpikeStore(data);

  it.each([
    ['a few cells, gathered through the index', flags(3, 17)],
    ['most cells, swept', flags(...Array.from({ length: 45 }, (_, i) => i))],
  ])('keeps the spikes of %s, in time order', (_, cells) => {
    for (const window of [null, [200, 700]] as const) {
      const kept = store.kept('cortex', cells, window ? [...window] : null);
      const expected = cut(population, cells, window ? [...window] : [0, 1000]);
      expect(Array.from(kept.nodeIds)).toEqual(expected.ids);
      expect(Array.from(kept.timestamps)).toEqual(expected.times);
    }
  });

  it('keeps every spike in the window where no cells are named', () => {
    const kept = store.kept('cortex', null, [200, 700]);
    const within = spikesBetween(population, 200, 700);
    expect(kept.timestamps).toEqual(within.timestamps);
    expect(kept.nodeIds).toEqual(within.nodeIds);
  });

  it('answers in arrays of its own, which can be handed over without emptying it', () => {
    const kept = store.kept('cortex', null, null);
    expect(kept.timestamps.buffer).not.toBe(population.timestamps.buffer);
    kept.timestamps.fill(0);
    expect(store.kept('cortex', null, null).timestamps).toEqual(population.timestamps);
  });

  it('hands the replay the cells kept, against the whole file’s span', () => {
    const cells = flags(3, 17);
    const spikes = store.viewer('cortex', cells, null, { min: 0, max: 1000 });
    const expected = cut(population, cells, [0, 1000]);
    expect(Array.from(spikes?.cellIndices ?? [])).toEqual(expected.ids);
    expect(Array.from(spikes?.times ?? [])).toEqual(expected.times);
    expect(spikes).toMatchObject({ timeMinInMs: 0, timeMaxInMs: 1000 });
    expect(store.viewer('thalamus', null, null, { min: 0, max: 1000 })).toBeNull();
  });

  it('works out the statistics over a window from the window’s spikes alone', () => {
    const window = { min: 250, max: 750 };
    expect(store.statistics('cortex', CELLS, window)).toEqual(
      computeSpikeStatistics(spikesBetween(population, 250, 750), CELLS, window)
    );
    // A population the file lacks fired nothing.
    expect(store.statistics('thalamus', 2, window).count).toEqual(new Float64Array(2));
  });

  it('bins the PSTHs and finds the PCA as they are found on their own', () => {
    const groups = [
      { name: 'low', cells: Uint32Array.from({ length: 25 }, (_, i) => i) },
      { name: 'high', cells: Uint32Array.from({ length: 25 }, (_, i) => 25 + i) },
    ];
    const options = { binMs: 30, sigmaMs: 0 };
    expect(store.psth('cortex', groups, [0, 1000], CELLS, options)).toEqual(
      psthSeries(groups, population, [0, 1000], CELLS, options)
    );
    const cells = Uint32Array.from({ length: CELLS }, (_, i) => i);
    const found = store.pca('cortex', cells, CELLS, [0, 1000], 50, 2, false);
    expect(found?.explained).toEqual(
      spikePca(population, cells, CELLS, [0, 1000], 50, 2)?.explained
    );
  });
});
