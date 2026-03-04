import { Dataset, File, Group, ready } from 'h5wasm';

export type SpikePopulation = {
  name: string;
  nodeIds: number[];
  timestamps: number[];
  units?: string;
};

export type SpikeData = {
  populations: SpikePopulation[];
  timeRange: { min: number; max: number };
  nodeIdRange: { min: number; max: number };
};

/**
 * SpikeTrace handles SONATA-format spike files.
 *
 * Expected HDF5 structure:
 * /spikes/{population}/node_ids - array of node IDs
 * /spikes/{population}/timestamps - array of spike times
 */
export default class SpikeTrace {
  file: File;
  data: SpikeData | null = null;

  constructor(h5File: File) {
    this.file = h5File;
  }

  public static async create(id: string, arrayBuffer: ArrayBuffer): Promise<SpikeTrace> {
    const { FS } = await ready;
    const filename = `${id}.h5`;

    try {
      FS.stat(filename);
    } catch (error: any) {
      if (error?.message === 'FS error') {
        FS.writeFile(filename, new Uint8Array(arrayBuffer));
      }
    }

    const file = new File(filename, 'r');
    const trace = new SpikeTrace(file);
    trace.init();
    return trace;
  }

  /**
   * Check if an HDF5 file contains spike data in SONATA format.
   */
  public static async isSpikeFile(id: string, arrayBuffer: ArrayBuffer): Promise<boolean> {
    const { FS } = await ready;
    const filename = `${id}_check.h5`;

    try {
      FS.stat(filename);
    } catch (error: any) {
      if (error?.message === 'FS error') {
        FS.writeFile(filename, new Uint8Array(arrayBuffer));
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
  }

  private init(): void {
    const spikesGroup = this.file.get('spikes');
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

      const nodeIds = Array.from(nodeIdsDataset.to_array() as number[]);
      const timestamps = Array.from(timestampsDataset.to_array() as number[]);

      // Get units attribute if available
      let units: string | undefined;
      try {
        units = timestampsDataset.get_attribute('units', true) as string;
      } catch {
        // units attribute is optional
      }

      populations.push({
        name: popName,
        nodeIds,
        timestamps,
        units,
      });

      // Update global ranges
      if (timestamps.length > 0) {
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        globalMinTime = Math.min(globalMinTime, minTime);
        globalMaxTime = Math.max(globalMaxTime, maxTime);
      }

      if (nodeIds.length > 0) {
        const minNodeId = Math.min(...nodeIds);
        const maxNodeId = Math.max(...nodeIds);
        globalMinNodeId = Math.min(globalMinNodeId, minNodeId);
        globalMaxNodeId = Math.max(globalMaxNodeId, maxNodeId);
      }
    }

    this.data = {
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

  public getPopulations(): string[] {
    return this.data?.populations.map((p) => p.name) ?? [];
  }

  public getPopulationData(name: string): SpikePopulation | undefined {
    return this.data?.populations.find((p) => p.name === name);
  }

  public getSpikeData(): SpikeData | null {
    return this.data;
  }

  public destroy(): void {
    this.file.close();
  }
}
