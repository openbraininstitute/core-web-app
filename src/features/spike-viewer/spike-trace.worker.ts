import * as Comlink from 'comlink';
import { Dataset, File, Group, ready } from 'h5wasm';

import type { SpikeData, SpikePopulation } from '@/features/spike-viewer/spike-trace';

/** Convert any TypedArray from h5wasm to Float32Array without unnecessary copies. */
function toFloat32(arr: ArrayLike<number | bigint>): Float32Array {
  if (arr instanceof Float32Array) return arr;
  if (arr instanceof Float64Array || arr instanceof Int32Array || arr instanceof Uint32Array) {
    return new Float32Array(arr);
  }
  const result = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    result[i] = Number(arr[i]);
  }
  return result;
}

/** Loop-based min/max that avoids stack overflow from Math.min/max spread on large arrays. */
function float32MinMax(arr: Float32Array): [number, number] {
  let min = arr[0];
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < min) min = arr[i];
    if (arr[i] > max) max = arr[i];
  }
  return [min, max];
}

function parseSpikeData(file: File): SpikeData {
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

    let units: string | undefined;
    try {
      units = timestampsDataset.get_attribute('units', true) as string;
    } catch {
      // units attribute is optional
    }

    populations.push({ name: popName, nodeIds, timestamps, units });

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

const api = {
  async parseSpikeFile(id: string, buffer: ArrayBuffer): Promise<SpikeData> {
    const { FS } = await ready;
    const filename = `${id}.h5`;

    try {
      FS.stat(filename);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'FS error') {
        FS.writeFile(filename, new Uint8Array(buffer));
      }
    }

    let file: File | null = null;
    try {
      file = new File(filename, 'r');
      const data = parseSpikeData(file);

      // Transfer Float32Array buffers back to main thread (zero-copy)
      const transferables: ArrayBuffer[] = [];
      for (const pop of data.populations) {
        const tsBuf = pop.timestamps.buffer as ArrayBuffer;
        const idBuf = pop.nodeIds.buffer as ArrayBuffer;
        transferables.push(tsBuf, idBuf);
      }

      return Comlink.transfer(data, transferables);
    } finally {
      file?.close();
      try {
        FS.unlink(filename);
      } catch {
        // ignore cleanup errors
      }
    }
  },

  async isSpikeFile(id: string, buffer: ArrayBuffer): Promise<boolean> {
    const { FS } = await ready;
    const filename = `${id}_check.h5`;

    try {
      FS.stat(filename);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'FS error') {
        FS.writeFile(filename, new Uint8Array(buffer));
      }
    }

    try {
      const file = new File(filename, 'r');
      const spikesGroup = file.get('spikes');
      const isSpike = spikesGroup instanceof Group;
      file.close();
      FS.unlink(filename);
      return isSpike;
    } catch {
      try {
        FS.unlink(filename);
      } catch {
        // ignore cleanup errors
      }
      return false;
    }
  },
};

export type SpikeTraceWorkerApi = typeof api;

Comlink.expose(api);
