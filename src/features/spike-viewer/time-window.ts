import type { SimulationRun } from '@/features/spike-viewer/simulation-context';
import type { SpikeData } from '@/features/spike-viewer/spike-trace';

/**
 * Re-read a parsed `spikes.h5` against the window its simulation ran for.
 *
 * Nothing in a SONATA spike report says when the run started or stopped, so the
 * parser can only report the range of the spikes themselves — which on a circuit
 * whose first cell fires at 11 ms is an axis starting at 11 ms, and a replay
 * that skips the silence before it. The run block of `simulation_config.json`
 * has the window; from here down `timeRange` means that window rather than the
 * data's own range, which is what every reader of it — axis, transport,
 * playhead, replay clock — actually wants.
 *
 * Without a config the left edge is still 0: simulated time starts there by
 * definition. Only the right edge falls back to the last spike.
 */
export function withSimulationTimeWindow(data: SpikeData, run: SimulationRun | null): SpikeData {
  const { min, max } = data.timeRange;

  const start = run?.tstart ?? 0;
  // `max` rather than `tstop` alone: a config that disagrees with the file it
  // describes must not push spikes off the end of the axis.
  const stop = run?.tstop === undefined ? max : Math.max(run.tstop, max);
  const timeRange = { min: Math.min(start, min), max: stop };

  if (timeRange.min === min && timeRange.max === max) return data;

  return { ...data, timeRange };
}
