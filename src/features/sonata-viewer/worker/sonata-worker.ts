import { expose } from 'comlink';
import { Dataset, File, Group, ready } from 'h5wasm';

import { lttbDownsample } from '@/utils/lttb';

import { buildTraceLabels, expandToColumns } from './column-mapping';

import type {
  DownsampleRequest,
  NodeTraceData,
  PopulationMetadata,
  SonataReportMetadata,
  TimeConfig,
} from '../types';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

class SonataWorkerImpl {
  private file: File | null = null;
  private filename: string | null = null;
  private populationDataCache = new Map<string, Float32Array>();
  private shapes = new Map<string, { numTimesteps: number; numColumns: number }>();
  private timeAxisCache = new Map<string, Float64Array>();
  private metadata: SonataReportMetadata | null = null;

  async loadFile(buffer: ArrayBuffer): Promise<SonataReportMetadata> {
    if (buffer.byteLength > MAX_FILE_SIZE) {
      throw new Error(
        `File size (${Math.round(buffer.byteLength / 1024 / 1024)}MB) exceeds the 100MB limit.`
      );
    }

    const { FS } = await ready;
    const filename = `sonata_${Date.now()}.h5`;

    try {
      FS.writeFile(filename, new Uint8Array(buffer));
    } catch (error) {
      throw new Error(`Failed to load HDF5 file: ${error}`);
    }

    const file = new File(filename, 'r');
    this.file = file;
    this.filename = filename;

    const reportGroup = file.get('report');
    if (!(reportGroup instanceof Group)) {
      this.destroy();
      throw new Error('Invalid SONATA report file: /report group not found.');
    }

    const populations: PopulationMetadata[] = [];

    for (const popName of reportGroup.keys()) {
      const popGroup = reportGroup.get(popName);
      if (!(popGroup instanceof Group)) continue;

      const mappingGroup = popGroup.get('mapping');
      if (!(mappingGroup instanceof Group)) continue;

      const dataDataset = popGroup.get('data');
      if (!(dataDataset instanceof Dataset)) continue;

      const nodeIdsDataset = mappingGroup.get('node_ids');
      const indexPointersDataset = mappingGroup.get('index_pointers');
      const timeDataset = mappingGroup.get('time');

      if (
        !(nodeIdsDataset instanceof Dataset) ||
        !(indexPointersDataset instanceof Dataset) ||
        !(timeDataset instanceof Dataset)
      ) {
        continue;
      }

      const nodeIds = Array.from(nodeIdsDataset.to_array() as number[]);
      const indexPointers = Array.from(indexPointersDataset.to_array() as number[]);
      const timeValues = Array.from(timeDataset.to_array() as number[]);

      if (nodeIds.length === 0) continue;

      let dataUnits = 'mV';
      try {
        const rawUnits = dataDataset.attrs.units;
        if (rawUnits) dataUnits = String(rawUnits.value ?? rawUnits);
      } catch {
        // Default to mV
      }

      let timeUnits = 'ms';
      try {
        const rawTimeUnits = timeDataset.attrs.units;
        if (rawTimeUnits) timeUnits = String(rawTimeUnits.value ?? rawTimeUnits);
      } catch {
        // Default to ms
      }

      if (timeValues.length < 3) continue;

      const timeConfig: TimeConfig = {
        startTime: timeValues[0],
        endTime: timeValues[1],
        timeStep: timeValues[2],
        units: timeUnits,
      };

      const [numTimesteps, numColumns] = dataDataset.shape;
      if (!numTimesteps || !numColumns) continue;

      const columnNodeIds = expandToColumns(nodeIds, indexPointers, numColumns);
      this.shapes.set(popName, { numTimesteps, numColumns });

      populations.push({
        name: popName,
        traceLabels: buildTraceLabels(columnNodeIds),
        nodeCount: new Set(columnNodeIds).size,
        timeConfig,
        dataUnits,
      });
    }

    if (populations.length === 0) {
      this.destroy();
      throw new Error('No valid populations found in the SONATA report file.');
    }

    this.metadata = { populations };
    return this.metadata;
  }

  private getPopulationData(populationName: string): Float32Array {
    const cached = this.populationDataCache.get(populationName);
    if (cached) return cached;

    if (!this.file) throw new Error('No file loaded.');

    const dataDataset = this.file.get(`report/${populationName}/data`);
    if (!(dataDataset instanceof Dataset)) {
      throw new Error(`Dataset not found for population "${populationName}".`);
    }

    const rawData = dataDataset.value;
    const flat =
      rawData instanceof Float32Array ? rawData : Float32Array.from(rawData as ArrayLike<number>);

    this.populationDataCache.set(populationName, flat);
    return flat;
  }

  async getNodeTrace(req: DownsampleRequest): Promise<NodeTraceData> {
    if (!this.metadata || !this.file) {
      throw new Error('No file loaded. Call loadFile first.');
    }

    const pop = this.metadata.populations.find((p) => p.name === req.populationName);
    const shape = this.shapes.get(req.populationName);
    if (!pop || !shape) throw new Error(`Population "${req.populationName}" not found.`);

    const { numTimesteps, numColumns } = shape;
    if (req.traceIndex < 0 || req.traceIndex >= numColumns) {
      throw new Error(`Trace ${req.traceIndex} is out of range in "${req.populationName}".`);
    }

    const { startTime, endTime, timeStep } = pop.timeConfig;
    const flatData = this.getPopulationData(req.populationName);

    const columnData = new Float32Array(numTimesteps);
    for (let t = 0; t < numTimesteps; t += 1) {
      columnData[t] = flatData[t * numColumns + req.traceIndex];
    }

    const timeData = this.getTimeAxis(req.populationName, pop.timeConfig, numTimesteps);

    let xSlice: ArrayLike<number> = timeData;
    let ySlice: ArrayLike<number> = columnData;
    if (req.zoomRange?.xStart !== undefined || req.zoomRange?.xEnd !== undefined) {
      const xStart = req.zoomRange.xStart ?? startTime;
      const xEnd = req.zoomRange.xEnd ?? endTime;
      const startIdx = Math.max(0, Math.floor((xStart - startTime) / timeStep));
      const endIdx = Math.min(numTimesteps, Math.ceil((xEnd - startTime) / timeStep) + 1);
      xSlice = timeData.subarray(startIdx, endIdx);
      ySlice = columnData.subarray(startIdx, endIdx);
    }

    const downsampled = lttbDownsample(xSlice, ySlice, req.desiredPoints);

    return {
      populationName: req.populationName,
      x: downsampled.x,
      y: downsampled.y,
      units: pop.dataUnits,
    };
  }

  /** The time axis is identical for every column of a population, so build it once. */
  private getTimeAxis(name: string, time: TimeConfig, numTimesteps: number): Float64Array {
    const cached = this.timeAxisCache.get(name);
    if (cached) return cached;

    const axis = new Float64Array(numTimesteps);
    for (let t = 0; t < numTimesteps; t += 1) axis[t] = time.startTime + t * time.timeStep;

    this.timeAxisCache.set(name, axis);
    return axis;
  }

  destroy(): void {
    this.file?.close();
    this.file = null;
    this.populationDataCache.clear();
    this.shapes.clear();
    this.timeAxisCache.clear();
    this.metadata = null;

    if (this.filename) {
      ready.then(({ FS }) => {
        try {
          if (this.filename) FS.unlink(this.filename);
        } catch {
          // Ignore cleanup errors
        }
      });
      this.filename = null;
    }
  }
}

const worker = new SonataWorkerImpl();
expose(worker);

export type { SonataWorkerImpl };
