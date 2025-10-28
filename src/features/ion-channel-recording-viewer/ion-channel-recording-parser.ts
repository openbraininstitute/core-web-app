import { TgdColor } from '@tolokoban/tgd';
import { Dataset, File, ready } from 'h5wasm';
import range from 'es-toolkit/compat/range';

import { H5Parser } from './h5-parser';
import { createPalette } from './colors';

import APWaveform_50KHz from './APWaveform_50KHz.json';
import { isType } from '@/util/type-guards';

import APWaveform_50KHz from './APWaveform_50KHz.json';
import { isType } from '@/util/type-guards';

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
  color?: string;
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

      const repetitions: IonChannelRecordingRepetition[] = [];
      const repetitionsPath = [...protocolPath, 'repetitions'];
      const repetitionsGroup = this.get(...repetitionsPath);
      if (!repetitionsGroup || repetitionsGroup instanceof Dataset) continue;

      let maxLinesPerPlot = 0;
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
        maxLinesPerPlot = Math.max(maxLinesPerPlot, repetition.plot.lines.length);
        repetitions.push(repetition);
      }
      const protocol: IonChannelRecordingProtocol = {
        name: protocolName,
        repetitions,
        stimuli: this.extractStimuli(protocolName, maxLinesPerPlot),
      };

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
  private extractStimuli(protocolName: string, linesPerPlot: number): IonChannelRecordingPlot {
    const plot: IonChannelRecordingPlot = {
      xAxisLabel: 'Time (ms)',
      yAxisLabel: 'Voltage (mV)',
      lines: [],
    };
    const commands = this.getArrayString('stimulus', 'presentation', protocolName, 'command');
    if (!commands) return plot;

    const [command] = commands;
    if (!command) return plot;

    const palette = createPalette(linesPerPlot);
    if (command === 'APWaveform_50KHz' && isCoordinates(APWaveform_50KHz)) {
      // Special case. We have a constant plot for that.
      plot.lines.push({
        ...APWaveform_50KHz,
        id: '0',
        color: palette[0],
      });
      return plot;
    }

    const stimuli = parseStimuli(command);
    if (stimuli.length === 0) return plot;

    const timings: number[] = [];
    const voltages: number[][] = [];
    const voltagesTmp: number[] = [];
    let time = 0;
    for (const [voltageMin, voltageStep, voltageMax, duration] of stimuli) {
      timings.push(time);
      time += duration;
      timings.push(time);
      if (voltageStep > 0) {
        for (const value of range(
          voltageMin,
          Math.round(voltageMax + voltageStep / 2),
          voltageStep
        )) {
          voltages.push([...voltagesTmp, value, value]);
        }
      } else if (voltages.length > 0) {
        for (const voltage of voltages) {
          voltage.push(voltageMin, voltageMax);
        }
      } else {
        voltagesTmp.push(voltageMin, voltageMax);
      }
    }
    if (voltages.length === 0) voltages.push(voltagesTmp);
    let id = 0;
    for (const voltage of voltages) {
      plot.lines.push({
        id: `${id}`,
        x: timings,
        y: voltage,
        color: TgdColor.fromPaletteClosest(
          id / Math.max(1, voltages.length - 1),
          palette
        ).toString(),
      });
      id++;
    }
    return plot;
  }

  private extractPlotLines(path: string[]): IonChannelRecordingPlotLine[] {
    const data = this.extractData(path);
    const palette = createPalette(data.length);
    return data.map((y, i) => ({
      id: `${i}`,
      x: this.extractTimeAxis(path, i, y.length),
      y,
      color: palette[i],
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
}

type Stimulus = [coltageMin: number, voltageStep: number, voltageMax: number, duration: number];

function isStimulus(stimulus: unknown): stimulus is Stimulus {
  if (!Array.isArray(stimulus)) return false;
  if (stimulus.length < 4) return false;
  for (const value of stimulus) {
    if (typeof value !== 'number') return false;
  }
  return true;
}

function parseStimuli(command: string): Stimulus[] {
  const stimuli: Stimulus[] = [];
  const parts = command.split(';');
  for (const part of parts) {
    const stimulus = part.split(':').map(parseFloat);
    if (!isStimulus(stimulus)) continue;

    stimuli.push(stimulus);
  }
  return stimuli;
}

function isCoordinates(data: unknown): data is { x: number[]; y: number[] } {
  return isType(data, { x: ['array', 'number'], y: ['array', 'number'] });
}
