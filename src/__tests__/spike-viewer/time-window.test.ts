import { describe, expect, it } from 'vitest';

import { withSimulationTimeWindow } from '@/features/spike-viewer/time-window';

import type { SpikeData } from '@/features/spike-viewer/spike-trace';

function file(min: number, max: number): SpikeData {
  return {
    populations: [
      {
        name: 'cortex',
        timestamps: Float32Array.from([min, max]),
        nodeIds: Float32Array.from([0, 1]),
      },
    ],
    timeRange: { min, max },
    nodeIdRange: { min: 0, max: 1 },
  };
}

describe('withSimulationTimeWindow', () => {
  it('spans the run rather than the spikes in it', () => {
    const data = withSimulationTimeWindow(file(11, 940), { tstop: 1000 });

    expect(data.timeRange).toEqual({ min: 0, max: 1000 });
  });

  it('starts at 0 with no config to read', () => {
    const data = withSimulationTimeWindow(file(11, 940), null);

    expect(data.timeRange).toEqual({ min: 0, max: 940 });
  });

  it('takes a run that does not start at 0 from the config', () => {
    const data = withSimulationTimeWindow(file(220, 940), { tstart: 200, tstop: 1000 });

    expect(data.timeRange).toEqual({ min: 200, max: 1000 });
  });

  it('keeps every spike inside the window when the config disagrees with the file', () => {
    const data = withSimulationTimeWindow(file(11, 1400), { tstop: 1000 });

    expect(data.timeRange).toEqual({ min: 0, max: 1400 });
  });
});
