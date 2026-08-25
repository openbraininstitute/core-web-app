import { Dataset, type File, Group } from 'h5wasm';

/** Convert any TypedArray from h5wasm to Float32Array without unnecessary copies. */
function toFloat32(arr: ArrayLike<number | bigint>): Float32Array {
  if (arr instanceof Float32Array) return arr;
  if (arr instanceof Float64Array || arr instanceof Int32Array || arr instanceof Uint32Array) {
    return new Float32Array(arr);
  }
  // Handle BigInt64Array / BigUint64Array from int64/uint64 HDF5 datasets
  const result = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    result[i] = Number(arr[i]);
  }
  return result;
}

/**
 * Convert any TypedArray from h5wasm to Float64Array, keeping node ids exact.
 *
 * Float32 rounds integers above 2^24 — sixteen million cells — onto their
 * neighbours, and a node id is a row index: off by one is the wrong neuron.
 */
function toFloat64(arr: ArrayLike<number | bigint>): Float64Array {
  if (arr instanceof Float64Array) return arr;
  if (arr instanceof Float32Array || arr instanceof Int32Array || arr instanceof Uint32Array) {
    return new Float64Array(arr);
  }
  // Handle BigInt64Array / BigUint64Array from int64/uint64 HDF5 datasets
  const result = new Float64Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    result[i] = Number(arr[i]);
  }
  return result;
}

/** Loop-based min/max that avoids stack overflow from Math.min/max spread on large arrays. */
function minMax(arr: Float32Array | Float64Array): [number, number] {
  let min = arr[0];
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < min) min = arr[i];
    if (arr[i] > max) max = arr[i];
  }
  return [min, max];
}

export type SpikePopulation = {
  name: string;
  /**
   * Two columns of one spike table: `nodeIds[i]` fired at `timestamps[i]`.
   * {@link sortSpikes} has already time-sorted the pair and cut it to matching
   * lengths, so every consumer — the raster's hover lookup, the replay's glow
   * walk — binary-searches these arrays exactly as they are.
   *
   * Ids are Float64 to stay exact: a node id is a row index, and Float32
   * rounds ids above 2^24 onto their neighbours — the wrong cell, silently.
   */
  nodeIds: Float64Array;
  timestamps: Float32Array;
  units?: string;
  /** This population's own ids — node ids are per-population row indices, not a shared scale. */
  nodeIdRange: { min: number; max: number };
};

export type SpikeData = {
  populations: SpikePopulation[];
  timeRange: { min: number; max: number };
  nodeIdRange: { min: number; max: number };
};

/**
 * Parse SONATA-format spike data from an h5wasm File.
 *
 * Expected HDF5 structure:
 * /spikes/{population}/node_ids - array of node IDs
 * /spikes/{population}/timestamps - array of spike times
 */
export function parseSpikeData(file: File): SpikeData {
  const spikesGroup = file.get('spikes');
  if (!(spikesGroup instanceof Group)) {
    throw new Error('Invalid spike file: /spikes group not found');
  }

  const populations: SpikePopulation[] = [];
  let globalMinTime = Infinity;
  let globalMaxTime = -Infinity;
  let globalMinNodeId = Infinity;
  let globalMaxNodeId = -Infinity;

  for (const popName of spikesGroup.keys()) {
    const popGroup = spikesGroup.get(popName);
    if (!(popGroup instanceof Group)) continue;

    const nodeIdsDataset = popGroup.get('node_ids');
    const timestampsDataset = popGroup.get('timestamps');

    if (!(nodeIdsDataset instanceof Dataset) || !(timestampsDataset instanceof Dataset)) {
      continue;
    }

    const rawNodeIds = nodeIdsDataset.to_array();
    const rawTimestamps = timestampsDataset.to_array();
    if (!rawNodeIds || !rawTimestamps) continue;

    const { timestamps, nodeIds } = sortSpikes(
      toFloat32(rawTimestamps as ArrayLike<number | bigint>),
      toFloat64(rawNodeIds as ArrayLike<number | bigint>)
    );

    // Get units attribute if available
    let units: string | undefined;
    try {
      units = timestampsDataset.get_attribute('units', true) as string;
    } catch {
      // units attribute is optional
    }

    const [minNodeId, maxNodeId] = nodeIds.length > 0 ? minMax(nodeIds) : [0, 0];
    populations.push({
      name: popName,
      nodeIds,
      timestamps,
      units,
      nodeIdRange: { min: minNodeId, max: maxNodeId },
    });

    if (timestamps.length > 0) {
      // Sorted above, so the ends are the range.
      globalMinTime = Math.min(globalMinTime, timestamps[0]);
      globalMaxTime = Math.max(globalMaxTime, timestamps[timestamps.length - 1]);
    }
    if (nodeIds.length > 0) {
      globalMinNodeId = Math.min(globalMinNodeId, minNodeId);
      globalMaxNodeId = Math.max(globalMaxNodeId, maxNodeId);
    }
  }

  return {
    populations,
    timeRange: {
      min: globalMinTime === Infinity ? 0 : globalMinTime,
      max: globalMaxTime === -Infinity ? 0 : globalMaxTime,
    },
    nodeIdRange: {
      min: globalMinNodeId === Infinity ? 0 : globalMinNodeId,
      max: globalMaxNodeId === -Infinity ? 0 : globalMaxNodeId,
    },
  };
}

/**
 * Pair a population's `timestamps` with its `node_ids`, time-sorted.
 *
 * SONATA says the file is already sorted and nothing enforces it, so the
 * common case is one scan and no copy. This runs where the file is parsed —
 * in the worker — so a multi-million-spike recording never sorts on the main
 * thread, and it runs once: everything downstream reads the arrays as they
 * are. Arrays that disagree in length are cut to the pairs that exist — a
 * spike with no cell, or a cell with no time, is not a spike.
 */
export function sortSpikes(
  timestamps: Float32Array,
  nodeIds: Float64Array
): { timestamps: Float32Array; nodeIds: Float64Array } {
  const count = Math.min(timestamps.length, nodeIds.length);

  let ascending = true;
  for (let i = 1; i < count; i++) {
    if (timestamps[i] < timestamps[i - 1]) {
      ascending = false;
      break;
    }
  }
  if (ascending) {
    return {
      timestamps: count === timestamps.length ? timestamps : timestamps.slice(0, count),
      nodeIds: count === nodeIds.length ? nodeIds : nodeIds.slice(0, count),
    };
  }

  const order = new Uint32Array(count);
  for (let i = 0; i < count; i++) order[i] = i;
  order.sort((a, b) => timestamps[a] - timestamps[b]);

  const sortedTimestamps = new Float32Array(count);
  const sortedNodeIds = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    sortedTimestamps[i] = timestamps[order[i]];
    sortedNodeIds[i] = nodeIds[order[i]];
  }
  return { timestamps: sortedTimestamps, nodeIds: sortedNodeIds };
}
