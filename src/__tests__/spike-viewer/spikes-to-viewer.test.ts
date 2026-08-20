import { describe, expect, it } from 'vitest';

import { spikesToViewer } from '@/features/spike-viewer/spike-replay/spikes-to-viewer';

import type { SpikeData, SpikePopulation } from '@/features/spike-viewer/spike-trace';

function population(
  name: string,
  spikes: Array<[timestamp: number, nodeId: number]>
): SpikePopulation {
  return {
    name,
    timestamps: Float32Array.from(spikes.map(([t]) => t)),
    nodeIds: Float32Array.from(spikes.map(([, id]) => id)),
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
        [30, 2],
        [20, 1],
      ]),
    ]);

    const spikes = spikesToViewer(data, 'cortex');

    expect(Array.from(spikes?.times ?? [])).toEqual([20, 30]);
    expect(Array.from(spikes?.cellIndices ?? [])).toEqual([1, 2]);
  });

  it('sorts by time, keeping each spike with its own cell', () => {
    const data = file([
      population('cortex', [
        [30, 3],
        [10, 1],
        [20, 2],
      ]),
    ]);

    const spikes = spikesToViewer(data, 'cortex');

    expect(Array.from(spikes?.times ?? [])).toEqual([10, 20, 30]);
    expect(Array.from(spikes?.cellIndices ?? [])).toEqual([1, 2, 3]);
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
    // Uint32Array would wrap -1 to 4294967295 anyway, but a fractional id would
    // silently truncate onto a real neighbouring cell.
    const data = file([
      population('cortex', [
        [10, -1],
        [20, 2.5],
        [30, 3],
      ]),
    ]);

    const spikes = spikesToViewer(data, 'cortex');

    expect(Array.from(spikes?.cellIndices ?? [])).toEqual([0xffffffff, 0xffffffff, 3]);
  });

  it('produces empty arrays for a population that never fired', () => {
    const data = file([population('cortex', [])]);

    const spikes = spikesToViewer(data, 'cortex');

    expect(spikes?.times).toHaveLength(0);
    expect(spikes?.cellIndices).toHaveLength(0);
  });
});
