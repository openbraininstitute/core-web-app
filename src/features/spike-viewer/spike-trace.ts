import { Dataset, type File, Group } from 'h5wasm';

/** Convert any TypedArray from h5wasm to Float32Array without unnecessary copies. */
export function toFloat32(arr: ArrayLike<number | bigint>): Float32Array {
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

/** Loop-based min/max that avoids stack overflow from Math.min/max spread on large arrays. */
export function float32MinMax(arr: Float32Array): [number, number] {
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
  nodeIds: Float32Array;
  timestamps: Float32Array;
  units?: string;
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

    const nodeIds = toFloat32(rawNodeIds as ArrayLike<number | bigint>);
    const timestamps = toFloat32(rawTimestamps as ArrayLike<number | bigint>);

    // Get units attribute if available
    let units: string | undefined;
    try {
      units = timestampsDataset.get_attribute('units', true) as string;
    } catch {
      // units attribute is optional
    }

    populations.push({ name: popName, nodeIds, timestamps, units });

    // Update global ranges using loop-based min/max (spread operator crashes on large arrays)
    if (timestamps.length > 0) {
      const [minTime, maxTime] = float32MinMax(timestamps);
      globalMinTime = Math.min(globalMinTime, minTime);
      globalMaxTime = Math.max(globalMaxTime, maxTime);
    }

    if (nodeIds.length > 0) {
      const [minNodeId, maxNodeId] = float32MinMax(nodeIds);
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
