import { describe, expect, it } from 'vitest';

import { sortSpikes } from '@/features/spike-viewer/spike-trace';

describe('sortSpikes', () => {
  it('returns the arrays themselves when the file is already in order', () => {
    const timestamps = Float32Array.from([10, 20, 20, 30]);
    const nodeIds = Float64Array.from([3, 1, 2, 0]);

    const sorted = sortSpikes(timestamps, nodeIds);

    // No copy: SONATA says files arrive sorted, so on a recording of millions
    // of spikes a copy here would double what every consumer then holds.
    expect(sorted.timestamps).toBe(timestamps);
    expect(sorted.nodeIds).toBe(nodeIds);
  });

  it('sorts by time, keeping each spike with the cell that fired it', () => {
    const sorted = sortSpikes(Float32Array.from([30, 10, 20]), Float64Array.from([3, 1, 2]));

    expect(Array.from(sorted.timestamps)).toEqual([10, 20, 30]);
    expect(Array.from(sorted.nodeIds)).toEqual([1, 2, 3]);
  });

  it('cuts arrays that disagree in length to the pairs that exist', () => {
    // A spike with no cell, or a cell with no time, is not a spike.
    const sorted = sortSpikes(Float32Array.from([10, 20, 30]), Float64Array.from([1, 2]));

    expect(Array.from(sorted.timestamps)).toEqual([10, 20]);
    expect(Array.from(sorted.nodeIds)).toEqual([1, 2]);
  });
});
