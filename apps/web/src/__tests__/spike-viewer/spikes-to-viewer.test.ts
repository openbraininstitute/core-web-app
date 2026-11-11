import { describe, expect, it } from 'vitest';

import { spikesToViewer } from '@/features/spike-viewer/spike-replay/spikes-to-viewer';

import type { SpikeData, SpikePopulation } from '@/features/spike-viewer/spike-trace';

/** Time-sorted, as the parser's `sortSpikes` guarantees for real data. */
function population(
  name: string,
  spikes: Array<[timestamp: number, nodeId: number]>
): SpikePopulation {
  const ids = spikes.map(([, id]) => id);
  return {
    name,
    timestamps: Float32Array.from(spikes.map(([t]) => t)),
    nodeIds: Float64Array.from(ids),
    nodeIdRange:
      ids.length > 0 ? { min: Math.min(...ids), max: Math.max(...ids) } : { min: 0, max: 0 },
  };
}

function file(populations: SpikePopulation[], timeRange = { min: 0, max: 1000 }): SpikeData {
  return { populations, timeRange, nodeIdRange: { min: 0, max: 10 } };
}

describe('spikesToViewer', () => {
  it('reads the population the circuit is drawing', () => {
    const data = file([
      population('other', [[10, 9]]),
      population('cortex', [
        [20, 1],
        [30, 2],
      ]),
    ]);

    const spikes = spikesToViewer(data, 'cortex');

    expect(Array.from(spikes?.times ?? [])).toEqual([20, 30]);
    expect(Array.from(spikes?.cellIndices ?? [])).toEqual([1, 2]);
  });

  it('hands the viewer the parser’s own timestamps rather than a copy', () => {
    const data = file([
      population('cortex', [
        [10, 1],
        [20, 2],
      ]),
    ]);

    const spikes = spikesToViewer(data, 'cortex');

    // Both views read the same recording — on a file of millions of spikes a
    // copy here would double what the browser holds for no reader's benefit.
    expect(spikes?.times).toBe(data.populations[0].timestamps);
  });

  it('spans the whole recording, not just the first and last spike', () => {
    // A silent stretch at either end is still part of the simulation, and the
    // raster axis shows it — the playhead has to be able to reach it.
    const data = file([population('cortex', [[500, 0]])], { min: 0, max: 1000 });

    const spikes = spikesToViewer(data, 'cortex');

    expect(spikes?.timeMinInMs).toBe(0);
    expect(spikes?.timeMaxInMs).toBe(1000);
  });

  it('refuses to guess when no population matches', () => {
    const data = file([population('cortex', [[10, 1]])]);

    expect(spikesToViewer(data, 'thalamus')).toBeNull();
  });

  it('has nothing to replay until the circuit says which population it draws', () => {
    const data = file([population('cortex', [[10, 1]])]);

    expect(spikesToViewer(data, undefined)).toBeNull();
  });

  it('parks an unusable node id past the end of any circuit', () => {
    // Uint32Array would wrap -1 to 4294967295 and 2^32 + 5 back onto cell 5,
    // and a fractional id would silently truncate onto a real neighbour.
    const data = file([
      population('cortex', [
        [10, -1],
        [20, 2.5],
        [30, 3],
        [40, 2 ** 32 + 5],
      ]),
    ]);

    const spikes = spikesToViewer(data, 'cortex');

    expect(Array.from(spikes?.cellIndices ?? [])).toEqual([0xffffffff, 0xffffffff, 3, 0xffffffff]);
  });

  it('produces empty arrays for a population that never fired', () => {
    const data = file([population('cortex', [])]);

    const spikes = spikesToViewer(data, 'cortex');

    expect(spikes?.times).toHaveLength(0);
    expect(spikes?.cellIndices).toHaveLength(0);
  });
});
