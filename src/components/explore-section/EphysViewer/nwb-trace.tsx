import { File, Group, Dataset, ready } from 'h5wasm';

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
export default class NWBTrace {
  public ready: Promise<void>;

  private file: File | null = null;

  private cellId: string | null = null;

  constructor(id: string, nwbArrayBuffer: ArrayBuffer) {
    this.ready = this.init(id, nwbArrayBuffer);
  }

  private async init(id: string, nwbArrayBuffer: ArrayBuffer) {
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

    this.file = new File(`${id}.nwb`, 'r');

    const dataOrganizationGroup = this.file.get(NWBKey.DATA_ORGANIZATION);
    if (!(dataOrganizationGroup instanceof Group)) {
      throw new Error('Data organization group not found');
    }

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
    if (!this.file || !this.cellId) {
      throw new Error('File or cell ID not initialized');
    }

    const protocolGroup = this.file.get(`${NWBKey.DATA_ORGANIZATION}/${this.cellId}`);
    if (!(protocolGroup instanceof Group)) {
      throw new Error('Protocol group not found');
    }

    const protocols = protocolGroup.keys().sort();
    if (protocols.length === 0) {
      throw new Error('No protocols found');
    }

    return protocols;
  }

  public getRepetitions(protocol: string): string[] {
    if (!this.file || !this.cellId) {
      throw new Error('File or cell ID not initialized');
    }

    const repetitionGroupKey = `${NWBKey.DATA_ORGANIZATION}/${this.cellId}/${protocol}`;
    const repetitionGroup = this.file.get(repetitionGroupKey);
    if (!(repetitionGroup instanceof Group)) {
      throw new Error(`Repetition group for protocol ${protocol} not found`);
    }

    const repetitions = repetitionGroup.keys().sort();
    if (repetitions.length === 0) {
      throw new Error(`No repetitions for ${protocol} found`);
    }

    return repetitions;
  }

  public getSweeps(protocol: string, repetition: string): string[] {
    if (!this.file || !this.cellId) {
      throw new Error('File or cell ID not initialized');
    }

    const sweepGroupKey = `${NWBKey.DATA_ORGANIZATION}/${this.cellId}/${protocol}/${repetition}`;
    const sweepGroup = this.file.get(sweepGroupKey);
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
    if (!this.file || !this.cellId) {
      throw new Error('File or cell ID not initialized');
    }

    const sweepGroupKey = `${NWBKey.DATA_ORGANIZATION}/${this.cellId}/${protocol}/${repetition}/${sweep}`;
    const sweepGroup = this.file.get(sweepGroupKey);
    if (!(sweepGroup instanceof Group)) {
      throw new Error(`Sweep dataset for ${sweep} not found`);
    }

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

    const dataset = this.file.get(datasetKey);
    if (!(dataset instanceof Dataset)) {
      throw new Error(`${recordingType} dataset for ${recId} not found`);
    }

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

    const timeDataset = this.file.get(timeDatasetKey);
    if (!(timeDataset instanceof Dataset)) {
      throw new Error(`${recordingType} starting time dataset for ${recId} not found`);
    }

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

  public getSweepData(protocol: string, repetition: string, sweep: string): SweepData {
    if (!this.file || !this.cellId) {
      throw new Error('File or cell ID not initialized');
    }

    return {
      stimulus: this.getSweepRecordingData(protocol, repetition, sweep, RecordingType.STIMULUS),
      response: this.getSweepRecordingData(protocol, repetition, sweep, RecordingType.RESPONSE),
    };
  }

  public destroy() {
    if (this.file) {
      this.file.close();
      this.file = null;
    }
  }
}
