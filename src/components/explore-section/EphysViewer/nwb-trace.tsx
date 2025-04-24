/* eslint-disable max-classes-per-file */
import { File, Group, Dataset, ready } from 'h5wasm';
import range from 'lodash/range';

enum NWBKey {
  DATA_ORGANIZATION = 'data_organization',
  ACQUISITION = 'acquisition',
  STIMULUS_PRESENTATIONON = 'stimulus/presentation',
  DATA = 'data',
  STARTING_TIME = 'starting_time',
}

export enum RecordingType {
  STIMULUS = 'stimulus',
  RESPONSE = 'response',
}

type RecordingData = {
  data: number[];
  unit: string;
  conversionFactor: number;
  timeUnit: string;
  timeRate: number;
};

export type SweepData = {
  stimulus: RecordingData;
  response: RecordingData;
};

/**
 * NwbTrace class for handling NWB (Neurodata Without Borders) files containing electrophysiology data.
 * See https://www.nwb.org/ for more information about the format.
 *
 * This class provides methods to:
 * - Load and initialize NWB files using h5wasm
 * - Extract cell protocols, repetitions, and sweeps from the NWB file structure
 * - Retrieve stimulus and response data for specific sweeps
 *
 * The class follows the NWB file organization where:
 * - Each file contains data for a single cell (cellId)
 * - Each cell has multiple protocols
 * - Each protocol has multiple repetitions
 * - Each repetition has multiple sweeps
 * - Each sweep contains stimulus and response recordings
 */
export default abstract class NWBTrace {
  file: File;

  constructor(nwbFile: File) {
    this.file = nwbFile;
  }

  public static async create(id: string, nwbArrayBuffer: ArrayBuffer) {
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

    const dataOrganizationGroup = file.get(NWBKey.DATA_ORGANIZATION);
    const hasDataOrganization = dataOrganizationGroup instanceof Group;

    const Cls = hasDataOrganization ? NWBLNMCTrace : NWBGenericTrace;

    return new Cls(file);
  }

  abstract init(): void;

  abstract getProtocols(): string[];

  abstract getRepetitions(protocol: string): string[];

  abstract getSweeps(protocol: string, repetition: string): string[];

  abstract getSweepRecordingData(
    protocol: string,
    repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingData;

  public getGroup(key: string): Group {
    const group = this.file.get(key);
    if (!(group instanceof Group)) {
      throw new Error(`Group ${key} not found`);
    }
    return group;
  }

  public getDataset(key: string): Dataset {
    const dataset = this.file.get(key);
    if (!(dataset instanceof Dataset)) {
      throw new Error(`Dataset ${key} not found`);
    }
    return dataset;
  }

  public getSweepData(protocol: string, repetition: string, sweep: string): SweepData {
    return {
      stimulus: this.getSweepRecordingData(protocol, repetition, sweep, RecordingType.STIMULUS),
      response: this.getSweepRecordingData(protocol, repetition, sweep, RecordingType.RESPONSE),
    };
  }

  public destroy() {
    this.file.close();
  }
}

class NWBLNMCTrace extends NWBTrace {
  private cellId: string | null = null;

  constructor(nwbFile: File) {
    super(nwbFile);
    this.init();
  }

  public init() {
    const dataOrganizationGroup = this.getGroup(NWBKey.DATA_ORGANIZATION);
    const cellIds = dataOrganizationGroup.keys();

    if (cellIds.length === 0) {
      throw new Error('No cell IDs found');
    } else if (cellIds.length > 1) {
      throw new Error('Multiple cell IDs found');
    }

    const [cellId] = cellIds;
    this.cellId = cellId;
  }

  public getProtocols(): string[] {
    const protocolGroup = this.getGroup(`${NWBKey.DATA_ORGANIZATION}/${this.cellId}`);

    const protocols = protocolGroup.keys().sort();
    if (protocols.length === 0) {
      throw new Error('No protocols found');
    }

    return protocols;
  }

  public getRepetitions(protocol: string): string[] {
    const repetitionGroupKey = `${NWBKey.DATA_ORGANIZATION}/${this.cellId}/${protocol}`;
    const repetitionGroup = this.getGroup(repetitionGroupKey);

    const repetitions = repetitionGroup.keys().sort();
    if (repetitions.length === 0) {
      throw new Error(`No repetitions for ${protocol} found`);
    }

    return repetitions;
  }

  public getSweeps(protocol: string, repetition: string): string[] {
    const sweepGroupKey = `${NWBKey.DATA_ORGANIZATION}/${this.cellId}/${protocol}/${repetition}`;
    const sweepGroup = this.getGroup(sweepGroupKey);
    if (!(sweepGroup instanceof Group)) {
      throw new Error(`Sweep group for ${repetition} not found`);
    }

    const sweeps = sweepGroup.keys().sort();
    if (sweeps.length === 0) {
      throw new Error(`No sweeps for ${repetition} found`);
    }

    return sweeps;
  }

  public getSweepRecordingData(
    protocol: string,
    repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingData {
    const sweepGroupKey = `${NWBKey.DATA_ORGANIZATION}/${this.cellId}/${protocol}/${repetition}/${sweep}`;
    const sweepGroup = this.getGroup(sweepGroupKey);

    const recIds = sweepGroup.keys();

    /* Recording IDs are prefixed with:
      - For stimuli:
        - 'ics__' for current.
        - 'vcs__' for voltage.
      - For responses:
        - 'ic__' for current.
        - 'vc__' for voltage.
    */

    const recRegex = recordingType === RecordingType.STIMULUS ? /^\w\ws__/ : /^\w\w__/;
    const recId = recIds.find((id) => id.match(recRegex));

    const datasetKey =
      recordingType === RecordingType.STIMULUS
        ? `${NWBKey.STIMULUS_PRESENTATIONON}/${recId}/${NWBKey.DATA}`
        : `${NWBKey.ACQUISITION}/${recId}/${NWBKey.DATA}`;

    const dataset = this.getDataset(datasetKey);

    const unit = dataset.get_attribute('unit', true);
    if (typeof unit !== 'string') {
      throw new Error(`Incompatible ${recordingType} unit: ${unit}, expected string`);
    }

    const conversionFactorRaw = dataset.get_attribute('conversion', true);
    const conversionFactor = typeof conversionFactorRaw === 'number' ? conversionFactorRaw : 1;

    const timeDatasetKey =
      recordingType === RecordingType.STIMULUS
        ? `${NWBKey.STIMULUS_PRESENTATIONON}/${recId}/${NWBKey.STARTING_TIME}`
        : `${NWBKey.ACQUISITION}/${recId}/${NWBKey.STARTING_TIME}`;

    const timeDataset = this.getDataset(timeDatasetKey);

    const timeUnit = timeDataset.get_attribute('unit', true);
    if (typeof timeUnit !== 'string') {
      throw new Error(`Incompatible ${recordingType} time unit: ${timeUnit}, expected string`);
    }

    const timeRate = timeDataset.get_attribute('rate', true);
    if (typeof timeRate !== 'number') {
      throw new Error(`Incompatible ${recordingType} time rate: ${timeRate}, expected number`);
    }

    const data = dataset.to_array() as number[];

    return {
      data,
      unit,
      conversionFactor,
      timeUnit,
      timeRate,
    };
  }
}

class NWBGenericTrace extends NWBTrace {
  public init() {}

  public getProtocols(): string[] {
    return ['Custom'];
  }

  public getRepetitions(_protocol: string): string[] {
    return ['Custom'];
  }

  public getSweeps(_protocol: string, _repetition: string): string[] {
    const acquisitionGroup = this.getGroup(NWBKey.ACQUISITION);
    return range(acquisitionGroup.keys().length).map((idx) => idx.toString());
  }

  private getRecId(sweep: string, recordingType: RecordingType): string {
    const recGroupKey =
      recordingType === RecordingType.STIMULUS
        ? NWBKey.STIMULUS_PRESENTATIONON
        : NWBKey.ACQUISITION;

    const recordingGroup = this.getGroup(recGroupKey);

    return recordingGroup.keys()[parseInt(sweep, 10)];
  }

  public getSweepRecordingData(
    _protocol: string,
    _repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingData {
    const recId = this.getRecId(sweep, recordingType);

    const datasetKey =
      recordingType === RecordingType.STIMULUS
        ? `${NWBKey.STIMULUS_PRESENTATIONON}/${recId}/${NWBKey.DATA}`
        : `${NWBKey.ACQUISITION}/${recId}/${NWBKey.DATA}`;

    const dataset = this.getDataset(datasetKey);

    const unit = dataset.get_attribute('unit', true);
    if (typeof unit !== 'string') {
      throw new Error(`Incompatible ${recordingType} unit: ${unit}, expected string`);
    }

    const conversionFactorRaw = dataset.get_attribute('conversion', true);
    const conversionFactor = typeof conversionFactorRaw === 'number' ? conversionFactorRaw : 1;

    const timeDatasetKey =
      recordingType === RecordingType.STIMULUS
        ? `${NWBKey.STIMULUS_PRESENTATIONON}/${recId}/${NWBKey.STARTING_TIME}`
        : `${NWBKey.ACQUISITION}/${recId}/${NWBKey.STARTING_TIME}`;

    const timeDataset = this.getDataset(timeDatasetKey);

    const timeUnit = timeDataset.get_attribute('unit', true);
    if (typeof timeUnit !== 'string') {
      throw new Error(`Incompatible ${recordingType} time unit: ${timeUnit}, expected string`);
    }

    const timeRate = timeDataset.get_attribute('rate', true);
    if (typeof timeRate !== 'number') {
      throw new Error(`Incompatible ${recordingType} time rate: ${timeRate}, expected number`);
    }

    const data = dataset.to_array() as number[];

    return {
      data,
      unit,
      conversionFactor,
      timeUnit,
      timeRate,
    };
  }
}
