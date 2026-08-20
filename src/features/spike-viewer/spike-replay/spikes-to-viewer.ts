import type { SpikeData } from '@/features/spike-viewer/spike-trace';
import type { MorphoViewerSmallCircuitSpikes } from '@/morpho-viewer';

/**
 * Turn a parsed `spikes.h5` into the flat arrays the 3D viewer replays.
 *
 * A SONATA `node_id` is a row index in its node population, and the viewer is
 * handed one cell per node in that same file order — so a `node_id` *is* the
 * index of the cell that fired, with no lookup table in between. That only
 * holds while both sides mean the same population, which is why this returns
 * `null` rather than guessing when the names do not line up: animating one
 * population's spikes over another's nodes would look plausible and be wrong.
 */
export function spikesToViewer(
  data: SpikeData,
  populationName: string | undefined
): MorphoViewerSmallCircuitSpikes | null {
  if (!populationName) return null;

  const population = data.populations.find((p) => p.name === populationName);
  if (!population) return null;

  const { timestamps, nodeIds } = population;
  const count = Math.min(timestamps.length, nodeIds.length);
  // Sorted by time because the viewer binary-searches it. SONATA says spikes
  // are already ordered, but nothing in the format enforces it and the raster
  // does not trust it either.
  const order = Array.from({ length: count }, (_, i) => i).sort(
    (a, b) => timestamps[a] - timestamps[b]
  );

  const times = new Float32Array(count);
  const cellIndices = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    const source = order[i];
    times[i] = timestamps[source];
    // A negative or fractional id cannot be a row index. Uint32Array would
    // wrap it into a plausible-looking one, so park it past the end of every
    // circuit instead and let the viewer skip it.
    const nodeId = nodeIds[source];
    cellIndices[i] = Number.isInteger(nodeId) && nodeId >= 0 ? nodeId : OUT_OF_RANGE_NODE_ID;
  }

  return {
    cellIndices,
    times,
    // The whole file's range, not this population's, so the playhead lines up
    // with the raster axis — which spans every population.
    timeMinInMs: data.timeRange.min,
    timeMaxInMs: data.timeRange.max,
  };
}

/** Larger than any circuit the small-scale viewer will ever draw. */
const OUT_OF_RANGE_NODE_ID = 0xffffffff;
