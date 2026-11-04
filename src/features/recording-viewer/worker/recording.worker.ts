import { expose } from 'comlink';
import { File, ready } from 'h5wasm';

import { lttbDownsample } from '@/utils/lttb';

import { openPreprocessedRecording } from './binary-recording';
import { traceEnvelopes } from './envelopes';
import { openNwbRecordings } from './nwb-recording';
import { mountRangedFile, resolveRequest, xhrRangeReader } from './ranged-file';
import { readWindow } from './read-window';

import type {
  DownsampleRequest,
  NodeTraceData,
  PopulationMetadata,
} from '@/features/sonata-viewer/types';
import type { FileRequest, PreprocessedFiles, RecordingInfo, RecordingReader } from '../types';
import type { MountFS } from './ranged-file';

type LoadedWindow = {
  name: string;
  values: Float32Array;
  numChannels: number;
  numFrames: number;
  startTime: number;
  dt: number;
};

export class RecordingWorkerImpl {
  private readers = new Map<string, RecordingReader>();
  private file: File | null = null;
  private loaded: LoadedWindow | null = null;
  /** Which load is the latest: a newer one stops an older one at its next piece. */
  private loadId = 0;
  private loadProgress = 1;

  async openNwb({
    request,
    size,
  }: {
    request: FileRequest;
    size: number;
  }): Promise<RecordingInfo[]> {
    const { FS } = await ready;
    const name = `recording_${Date.now()}.nwb`;
    mountRangedFile(
      FS as unknown as MountFS,
      name,
      size,
      xhrRangeReader(await resolveRequest(request))
    );
    this.file = new File(name, 'r');
    return this.keep(openNwbRecordings(this.file));
  }

  async openPreprocessed(recordings: PreprocessedFiles[]): Promise<RecordingInfo[]> {
    return this.keep(await Promise.all(recordings.map(openPreprocessedRecording)));
  }

  private keep(readers: RecordingReader[]): RecordingInfo[] {
    readers.forEach((reader) => {
      this.readers.set(reader.info.name, reader);
    });
    return readers.map((reader) => reader.info);
  }

  /**
   * Reads a window of a recording, which the plot then draws as a report's whole run. It may be
   * shorter than asked at the end of the recording, and is reduced past what memory should hold.
   */
  async loadWindow(
    recording: string,
    startSeconds: number,
    durationSeconds: number
  ): Promise<PopulationMetadata> {
    const reader = this.readers.get(recording);
    if (!reader) throw new Error(`No recording called ${recording}`);
    const { info } = reader;
    const startFrame = Math.max(
      0,
      Math.min(
        info.numFrames - 1,
        Math.round((startSeconds - info.startTime) * info.samplingFrequency)
      )
    );
    const numFrames = Math.max(
      1,
      Math.min(info.numFrames - startFrame, Math.round(durationSeconds * info.samplingFrequency))
    );
    this.loadId += 1;
    const id = this.loadId;
    this.loadProgress = 0;
    const read = await readWindow(reader, startFrame, numFrames, {
      isCurrent: () => id === this.loadId,
      onProgress: (fraction) => {
        this.loadProgress = fraction;
      },
    });
    const dt = (1 / info.samplingFrequency) * (numFrames / read.numFrames);
    const startTime = info.startTime + startFrame / info.samplingFrequency;
    const name = `${recording} @ ${startTime}+${numFrames}`;
    this.loaded = {
      name,
      values: read.values,
      numChannels: info.numChannels,
      numFrames: read.numFrames,
      startTime,
      dt,
    };
    return {
      name,
      traces: info.channelNames.map((label, nodeId) => ({ nodeId, elementId: null, label })),
      nodeCount: info.numChannels,
      timeConfig: {
        startTime,
        endTime: startTime + (read.numFrames - 1) * dt,
        timeStep: dt,
        units: 's',
      },
      dataUnits: info.units,
    };
  }

  /** How far along the latest window's read is, from 0 to 1. */
  async getLoadProgress() {
    return this.loadProgress;
  }

  private window(name: string): LoadedWindow {
    if (this.loaded?.name !== name) throw new Error(`The window ${name} is not loaded`);
    return this.loaded;
  }

  async getNodeTrace(req: DownsampleRequest): Promise<NodeTraceData> {
    const { values, numChannels, numFrames, startTime, dt } = this.window(req.populationName);
    const xStart = req.zoomRange?.xStart ?? startTime;
    const xEnd = req.zoomRange?.xEnd ?? startTime + (numFrames - 1) * dt;
    const first = Math.max(0, Math.floor((xStart - startTime) / dt));
    const last = Math.min(numFrames - 1, Math.ceil((xEnd - startTime) / dt));
    const length = Math.max(0, last - first + 1);
    const x = new Float64Array(length);
    const y = new Float32Array(length);
    for (let i = 0; i < length; i += 1) {
      x[i] = startTime + (first + i) * dt;
      y[i] = values[(first + i) * numChannels + req.traceIndex];
    }
    return lttbDownsample(x, y, req.desiredPoints);
  }

  /** The window's traces reduced to `width` pixels per channel, for drawing them all at once. */
  async getEnvelopes(name: string, width: number) {
    const { values, numChannels, numFrames } = this.window(name);
    return traceEnvelopes(values, numChannels, numFrames, width);
  }

  async getValueRange(name: string): Promise<[number, number]> {
    const { values } = this.window(name);
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < values.length; i += 1) {
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }
    return min <= max ? [min, max] : [0, 1];
  }

  destroy() {
    this.loaded = null;
    this.readers.clear();
    this.file?.close();
    this.file = null;
  }
}

expose(new RecordingWorkerImpl());
