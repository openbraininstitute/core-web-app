import { Dataset, File, ready } from 'h5wasm';
import { H5Parser } from './h5-parser';

export interface IonChannelRecordingProtocol {
  name: string;
  repetitions: IonChannelRecordingRepetition[];
  stimuli: IonChannelRecordingPlot;
}

export interface IonChannelRecordingRepetition {
  name: string;
  plot: IonChannelRecordingPlot;
}

export interface IonChannelRecordingPlot {
  xAxisLabel: string;
  yAxisLabel: string;
  lines: IonChannelRecordingPlotLine[];
}

export interface IonChannelRecordingPlotLine {
  id: string;
  x: number[];
  y: number[];
}

export class IonChannelRecordingParser extends H5Parser {
  static async create(id: string, nwbArrayBuffer: ArrayBuffer) {
    const { FS } = await ready;

    const filename = `${id}.nwb`;

    try {
      // TODO: Is there a better way to check if the file exists?
      FS.stat(filename);
    } catch (error: any) {
      if (error?.message === 'FS error') {
        FS.writeFile(filename, new Uint8Array(nwbArrayBuffer));
      }
    }

    const file = new File(`${id}.nwb`, 'r');
    const trace = new IonChannelRecordingParser(file);
    return trace;
  }

  public readonly protocols: ReadonlyArray<IonChannelRecordingProtocol>;

  protected constructor(file: File) {
    super(file);

    const protocols: IonChannelRecordingProtocol[] = [];
    const timeseriesPath = ['acquisition', 'timeseries'];
    const timeseriesGroup = this.get(...timeseriesPath);
    const protocolsNames: string[] = this.isGroup(timeseriesGroup) ? timeseriesGroup.keys() : [];
    for (const protocolName of protocolsNames) {
      const protocolPath = [...timeseriesPath, protocolName];
      const protocolGroup = this.get(...protocolPath);
      if (!protocolGroup) continue;

      const protocol: IonChannelRecordingProtocol = {
        name: protocolName,
        repetitions: [],
        stimuli: this.extractStimuli(protocolName),
      };
      const repetitionsPath = [...protocolPath, 'repetitions'];
      const repetitionsGroup = this.get(...repetitionsPath);
      if (!repetitionsGroup || repetitionsGroup instanceof Dataset) continue;

      for (const repetitionName of repetitionsGroup.keys()) {
        const repetitionPath = [...repetitionsPath, repetitionName];
        const repetitionGroup = this.get(...repetitionPath);
        if (!this.isGroup(repetitionGroup)) continue;

        const repetition: IonChannelRecordingRepetition = {
          name: repetitionName,
          plot: {
            xAxisLabel: 'Time (ms)',
            yAxisLabel: 'Current (nA)',
            lines: this.extractPlotLines(repetitionPath),
          },
        };
        protocol.repetitions.push(repetition);
      }
      if (protocol.repetitions.length === 0) continue;

      protocols.push(protocol);
    }
    this.protocols = protocols;
  }

  public findRepetition(
    protocolName: string,
    repetitionName: string
  ): IonChannelRecordingRepetition | undefined {
    const protocol = this.protocols.find((p) => p.name === protocolName);
    if (!protocol) return undefined;

    const repetition = protocol.repetitions.find((r) => r.name === repetitionName);
    return repetition;
  }

  /**
   * `command` for stimuli look like this:
   * `-80:0:-80:40;-90:0:-90:10;-80:0:-80:50;-90:10:80:500;-80:0:-80:100;`
   *
   * Each part is separated by a semicolon. Inside each part there are 4 numbers
   * separated by colons:
   * - lowest voltage (mV)
   * - voltage step
   * - highest voltage (mV)
   * - duration (ms)
   *
   * The parts are in sequence.
   */
  private extractStimuli(protocolName: string): IonChannelRecordingPlot {
    const plot: IonChannelRecordingPlot = {
      xAxisLabel: 'Time (ms)',
      yAxisLabel: 'Voltage (mV)',
      lines: [],
    };
    const commands = this.getArrayString('stimulus', 'presentation', protocolName, 'command');
    if (!commands) return plot;

    const [command] = commands;
    if (!command) return plot;

    const parts = command.split(';');
    let id = 1;
    let start = 0;
    for (const part of parts) {
      const stimulus = part.split(':').map(parseFloat);
      if (!isStimulus(stimulus)) continue;

      const [voltageMin, voltageStep, voltageMax, duration] = stimulus;
      const steps = voltageStep > 0 ? Math.ceil((voltageMax - voltageMin) / voltageStep) + 1 : 1;
      const end = start + duration;
      for (let step = 0; step < steps; step++) {
        const value = Math.min(voltageMin + step * voltageStep, voltageMax);
        plot.lines.push({
          id: `${id++}`,
          x: [start, start, end, end],
          y: [0, value, value, 0],
        });
      }
      start = end;
    }
    return plot;
  }

  private extractPlotLines(path: string[]): IonChannelRecordingPlotLine[] {
    const data = this.extractData(path);
    return data.map((y, i) => ({
      id: this.extractId(path, i),
      x: this.extractTimeAxis(path, i, y.length),
      y,
    }));
  }

  private extractTimeAxis(path: string[], index: number, length: number): number[] {
    const start = (this.getArrayNumber2D(...path, 'x_start') ?? [])[index]?.[0] ?? 0;
    const interval = (this.getArrayNumber2D(...path, 'x_interval') ?? [])[index]?.[0] ?? 1;
    const array: number[] = [];
    for (let i = 0; i < length; i++) {
      // Convert seconds into milliseconds (hence the `* 1e3`)
      array.push((start + interval * i) * 1e3);
    }
    return array;
  }

  private extractData(path: string[]): number[][] {
    const rawData = this.getArrayNumber2D(...path, 'data');
    if (!rawData) return [];

    const data: number[][] = [];
    const count = rawData[0].length;
    for (let i = 0; i < count; i++) {
      const array: number[] = rawData.map((serie) => serie[i]);
      data.push(array);
    }
    return data;
  }

  private extractId(path: string[], index: number): string {
    const dataset = this.getArrayNumber2D(...path, 'trace_ids');
    const id = dataset?.[index]?.[0];
    return id ? `${id}` : `#${index + 1}`;
  }
}

function isStimulus(stimulus: unknown): stimulus is [number, number, number, number] {
  if (!Array.isArray(stimulus)) return false;
  if (stimulus.length < 4) return false;
  for (const value of stimulus) {
    if (typeof value !== 'number') return false;
  }
  return true;
}
