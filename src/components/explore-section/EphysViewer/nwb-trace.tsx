import { timeHours } from 'd3';
import { File, Group, Dataset, ready } from 'h5wasm';

enum NWBKey {
  DATA_ORGANIZATION = 'data_organization',
  ACQUISITION = 'acquisition',
  STIMULUS_PRESENTATIONON = 'stimulus/presentation',
  DATA = 'data',
  STARTING_TIME = 'starting_time',
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

  public getSweepData(protocol: string, repetition: string, sweep: string): SweepData {
    if (!this.file || !this.cellId) {
      throw new Error('File or cell ID not initialized');
    }

    const sweepGroupKey = `${NWBKey.DATA_ORGANIZATION}/${this.cellId}/${protocol}/${repetition}/${sweep}`;
    const sweepGroup = this.file.get(sweepGroupKey);
    if (!(sweepGroup instanceof Group)) {
      throw new Error(`Sweep dataset for ${sweep} not found`);
    }

    const recIds = sweepGroup.keys();

    /* Stimulus recording IDs are prefixed with:
      - 'ics__' for current.
      - 'vcs__' for voltage.
     */
    const stimRecId = recIds.find((id) => id.match(/^\w\ws__/));

    /* Response recording IDs are prefixed with:
      - 'ic__' for current.
      - 'vc__' for voltage.
     */
    const resRecId = recIds.find((id) => id.match(/^\w\w__/));

    if (!stimRecId || !resRecId) {
      throw new Error(`Stimulus or response recording ID(s) not found among ${recIds.join(', ')}`);
    }

    // Gathering stimulus data
    const stimDatasetKey = `${NWBKey.STIMULUS_PRESENTATIONON}/${stimRecId}/${NWBKey.DATA}`;
    const stimDataset = this.file.get(stimDatasetKey);
    if (!(stimDataset instanceof Dataset)) {
      debugger;
      throw new Error(`Stimulus dataset for ${stimRecId} not found`);
    }

    const stimUnit = stimDataset.get_attribute('unit', true);
    if (typeof stimUnit !== 'string') {
      throw new Error(`Incompatible stimulus unit: ${stimUnit}, expected string`);
    }

    const stimConversionFactor = stimDataset.get_attribute('conversion', true) ?? 1;

    const stimTimeDatasetKey = `${NWBKey.STIMULUS_PRESENTATIONON}/${stimRecId}/${NWBKey.STARTING_TIME}`;
    const stimTimeDataset = this.file.get(stimTimeDatasetKey);
    if (!(stimTimeDataset instanceof Dataset)) {
      throw new Error(`Stimulus starting time dataset for ${stimRecId} not found`);
    }

    const stimTimeUnit = stimTimeDataset.get_attribute('unit', true);
    if (typeof stimTimeUnit !== 'string') {
      throw new Error(`Incompatible stimulus time unit: ${stimTimeUnit}, expected string`);
    }

    const stimTimeRate = stimTimeDataset.get_attribute('rate', true);
    if (typeof stimTimeRate !== 'number') {
      throw new Error(`Incompatible stimulus time rate: ${stimTimeRate}, expected number`);
    }

    const stimData = stimDataset.to_array() as number[];

    // Gathering response data
    const resDatasetKey = `${NWBKey.ACQUISITION}/${resRecId}/${NWBKey.DATA}`;
    const resDataset = this.file.get(resDatasetKey);
    if (!(resDataset instanceof Dataset)) {
      throw new Error(`Response dataset for ${resRecId} not found`);
    }

    const resUnit = resDataset.get_attribute('unit', true);
    if (typeof resUnit !== 'string') {
      throw new Error(`Incompatible response unit: ${resUnit}, expected string`);
    }

    const resConversionFactor = resDataset.get_attribute('conversion', true) ?? 1;

    const resTimeDatasetKey = `${NWBKey.ACQUISITION}/${resRecId}/${NWBKey.STARTING_TIME}`;
    const resTimeDataset = this.file.get(resTimeDatasetKey);
    if (!(resTimeDataset instanceof Dataset)) {
      throw new Error(`Response starting time dataset for ${resRecId} not found`);
    }

    const resTimeUnit = resTimeDataset.get_attribute('unit', true);
    if (typeof resTimeUnit !== 'string') {
      throw new Error(`Incompatible response time unit: ${resTimeUnit}, expected string`);
    }

    const resTimeRate = resTimeDataset.get_attribute('rate', true);
    if (typeof resTimeRate !== 'number') {
      throw new Error(`Incompatible response time rate: ${resTimeRate}, expected number`);
    }

    const resData = resDataset.to_array() as number[];

    const sweepData: SweepData = {
      stimulus: {
        data: stimData,
        unit: stimUnit,
        conversionFactor: stimConversionFactor,
        timeUnit: stimTimeUnit,
        timeRate: stimTimeRate,
      },
      response: {
        data: resData,
        unit: resUnit,
        conversionFactor: resConversionFactor,
        timeUnit: resTimeUnit,
        timeRate: resTimeRate,
      },
    };

    return sweepData;
  }

  public destroy() {
    if (this.file) {
      this.file.close();
      this.file = null;
    }
  }
}
