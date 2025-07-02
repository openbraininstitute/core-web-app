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

export type SweepData = Partial<{
  stimulus: RecordingData;
  response: RecordingData;
}>;

/**
 * Abstract base class representing a trace from a Neurodata Without Borders (NWB) file.
 *
 * @abstract
 * @class NWBTrace
 * @description Provides a common interface for parsing and extracting electrophysiological data
 * from NWB file formats, supporting different data organization structures.
 *
 * @property {File} file - The H5 file object representing the loaded NWB file
 *
 * @method create - Static factory method to create an appropriate NWBTrace subclass based on file structure
 * @method init - Abstract method to initialize trace data
 * @method getProtocols - Abstract method to retrieve available protocols
 * @method getRepetitions - Abstract method to retrieve repetitions for a given protocol
 * @method getSweeps - Abstract method to retrieve sweeps for a specific protocol and repetition
 * @method getSweepRecordingData - Abstract method to extract recording data for a specific sweep
 * @method getGroup - Utility method to retrieve a group from the NWB file
 */
export default abstract class NWBTrace {
  file: File;

  abstract readonly recordingTypes: RecordingType[];

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
    return this.recordingTypes.reduce(
      (acc, recordingType) => ({
        ...acc,
        [recordingType]: this.getSweepRecordingData(protocol, repetition, sweep, recordingType),
      }),
      {}
    );

    // return {
    //   stimulus: this.getSweepRecordingData(protocol, repetition, sweep, RecordingType.STIMULUS),
    //   response: this.getSweepRecordingData(protocol, repetition, sweep, RecordingType.RESPONSE),
    // };
  }

  public destroy() {
    this.file.close();
  }
}

/**
 * NWBLNMCTrace represents a specialized trace handler for the files produced by LNMC@EPFL.
 *
 * This class manages the hierarchical data organization of electro-physiological recording data
 * with the following structure:
 *
 * Data Organization Hierarchy:
 * - Cell ID (top-level identifier)
 *   ├── Protocol (experimental protocol)
 *     ├── Repetition (repeated measurements of the same protocol)
 *       └── Sweep (individual recording instances)
 *
 * Key Responsibilities:
 * - Initializes and validates the data organization structure
 * - Retrieves protocols, repetitions, and sweeps for a specific cell
 * - Extracts recording data with conversion factors and time information
 *
 * @class
 * @extends NWBTrace
 */
class NWBLNMCTrace extends NWBTrace {
  private cellId: string | null = null;

  recordingTypes: RecordingType[] = [RecordingType.STIMULUS, RecordingType.RESPONSE];

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

/**
 * NWBGenericTrace represents a generic trace from a Neurodata Without Borders (NWB) file
 * with an unknown organizational structure.
 *
 * This class handles NWB files in a way that all recordings are represented as sweeps
 * of a single repetition within a single custom protocol. It provides methods to
 * retrieve protocols, repetitions, and sweep recording data from the NWB file.
 */
class NWBGenericTrace extends NWBTrace {
  recordingTypes: RecordingType[];

  constructor(nwbFile: File) {
    super(nwbFile);

    const stimulusPresentationGroup = this.file.get(NWBKey.STIMULUS_PRESENTATIONON);
    const hasStimulus =
      !(stimulusPresentationGroup instanceof Group) || stimulusPresentationGroup.keys().length > 0;

    this.recordingTypes = hasStimulus
      ? [RecordingType.STIMULUS, RecordingType.RESPONSE]
      : [RecordingType.RESPONSE];
  }

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

  private getTimeData(
    recId: string,
    recordingType: RecordingType
  ): { timeUnit: string; timeRate: number } {
    const timeDatasetKey =
      recordingType === RecordingType.STIMULUS
        ? `${NWBKey.STIMULUS_PRESENTATIONON}/${recId}/${NWBKey.STARTING_TIME}`
        : `${NWBKey.ACQUISITION}/${recId}/${NWBKey.STARTING_TIME}`;

    let timeDataset;

    try {
      timeDataset = this.getDataset(timeDatasetKey);
    } catch {
      return { timeUnit: 's', timeRate: 1 };
    }

    const timeUnit = timeDataset.get_attribute('unit', true);
    if (typeof timeUnit !== 'string') {
      throw new Error(`Incompatible ${recordingType} time unit: ${timeUnit}, expected string`);
    }

    const timeRate = timeDataset.get_attribute('rate', true);
    if (typeof timeRate !== 'number') {
      throw new Error(`Incompatible ${recordingType} time rate: ${timeRate}, expected number`);
    }

    return { timeUnit, timeRate };
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

    const { timeUnit, timeRate } = this.getTimeData(recId, recordingType);

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
