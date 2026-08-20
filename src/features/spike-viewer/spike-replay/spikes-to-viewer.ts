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

  const count = Math.min(population.timestamps.length, population.nodeIds.length);
  // The viewer binary-searches this, so it has to be ascending. SONATA says it
  // already is and nothing in the format enforces it, so check rather than
  // trust — and rather than sort, which on a recording of millions of spikes
  // costs an index array larger than the spikes themselves.
  const { timestamps, nodeIds } = isAscending(population.timestamps, count)
    ? population
    : sortByTimestamp(population.timestamps, population.nodeIds, count);

  const cellIndices = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    // A negative or fractional id cannot be a row index. Uint32Array would
    // wrap it into a plausible-looking one, so park it past the end of every
    // circuit instead and let the viewer skip it.
    const nodeId = nodeIds[i];
    cellIndices[i] = Number.isInteger(nodeId) && nodeId >= 0 ? nodeId : OUT_OF_RANGE_NODE_ID;
  }

  return {
    cellIndices,
    // Shared rather than copied when the file was already in order — the viewer
    // only ever reads it, as does the raster this came from.
    times: count === timestamps.length ? timestamps : timestamps.slice(0, count),
    // The whole file's range, not this population's, so the playhead lines up
    // with the raster axis — which spans every population.
    timeMinInMs: data.timeRange.min,
    timeMaxInMs: data.timeRange.max,
  };
}

function isAscending(timestamps: Float32Array, count: number): boolean {
  for (let i = 1; i < count; i++) {
    if (timestamps[i] < timestamps[i - 1]) return false;
  }
  return true;
}

/** Reorder both arrays by time, keeping each spike with the cell that fired it. */
function sortByTimestamp(
  timestamps: Float32Array,
  nodeIds: Float32Array,
  count: number
): { timestamps: Float32Array; nodeIds: Float32Array } {
  const order = new Uint32Array(count);
  for (let i = 0; i < count; i++) order[i] = i;
  order.sort((a, b) => timestamps[a] - timestamps[b]);

  const sortedTimestamps = new Float32Array(count);
  const sortedNodeIds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    sortedTimestamps[i] = timestamps[order[i]];
    sortedNodeIds[i] = nodeIds[order[i]];
  }
  return { timestamps: sortedTimestamps, nodeIds: sortedNodeIds };
}

/** Larger than any circuit the small-scale viewer will ever draw. */
const OUT_OF_RANGE_NODE_ID = 0xffffffff;
