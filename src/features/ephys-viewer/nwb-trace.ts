/* eslint-disable max-classes-per-file */

import range from 'es-toolkit/compat/range';
import { Dataset, File, Group, ready } from 'h5wasm';

const SMALL_SCALE_SIMULATOR_ID = 'obi_small_scale_simulator_v1';
const ION_CHANNEL_SIMULATION_SESSION_ID = 'vc_hh_seclamp';

enum NWBKey {
  DATA_ORGANIZATION = 'data_organization',
  ACQUISITION = 'acquisition',
  STIMULUS_PRESENTATION = 'stimulus/presentation',
  DATA = 'data',
  STARTING_TIME = 'starting_time',
  GENERAL = 'general',
  WAS_GENERATED_BY = 'was_generated_by',
  TIMESTAMPS = 'timestamps',
  SESSION_ID = 'session_id',
}

export enum RecordingType {
  STIMULUS = 'stimulus',
  RESPONSE = 'response',
}

export type RecordingData = {
  label?: string;
  data: number[];
  unit: string;
  conversionFactor: number;
  timeUnit: string;
  timeRate: number;
};

export type SweepData = Partial<{
  stimulus: RecordingData[];
  response: RecordingData[];
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

  abstract recordingTypes: RecordingType[];

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

    // LNMC complient
    const dataOrganizationGroup = file.get(NWBKey.DATA_ORGANIZATION);
    const hasDataOrganization = dataOrganizationGroup instanceof Group;

    if (hasDataOrganization) return new NWBLNMCTrace(file);

    // TODO: move format detection logic outside

    try {
      // 'vc_hh_seclamp'
      const generalGroup = file.get(NWBKey.GENERAL);
      if (!(generalGroup instanceof Group)) {
        throw new Error('General group not found');
      }

      const sessionIdDataset = generalGroup.get(NWBKey.SESSION_ID);
      if (!(sessionIdDataset instanceof Dataset)) {
        throw new Error('Can not find session_id dataset');
      }

      // TODO: check how to read value correctly, it might be a string
      const sessionId = sessionIdDataset.to_array() as string[];
      if (sessionId[0] === ION_CHANNEL_SIMULATION_SESSION_ID) {
        throw new Error('The file does not seem to be produced by OBI small scale simulator');
      }

      return new IonChannelSimulationTrace(file);
    } catch {}

    // Small scale circuit simulation complient
    try {
      const generalGroup = file.get(NWBKey.GENERAL);
      if (!(generalGroup instanceof Group)) {
        throw new Error('General group not found');
      }

      const wasGeneratedByDataset = generalGroup.get(NWBKey.WAS_GENERATED_BY);
      if (!(wasGeneratedByDataset instanceof Dataset)) {
        throw new Error('Can not find was_generated_by dataset');
      }

      const wasGeneratedBy = wasGeneratedByDataset.to_array() as string[];
      if (!wasGeneratedBy.includes(SMALL_SCALE_SIMULATOR_ID)) {
        throw new Error('The file does not seem to be produced by OBI small scale simulator');
      }

      return new NWBCircuitSimulationTrace(file);
    } catch (error) {
      // Defaulting to Generic NWB Trace
      return new NWBGenericTrace(file);
    }
  }

  abstract init(): void;

  abstract getCellIds(): string[];

  abstract getProtocols(cellId: string): string[];

  abstract getRepetitions(cellId: string, protocol: string): string[];

  abstract getSweeps(cellId: string, protocol: string, repetition: string): string[];

  abstract getSweepRecordingData(
    cellId: string,
    protocol: string,
    repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingData[];

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

  public getSweepData(
    cellId: string,
    protocol: string,
    repetition: string,
    sweep: string
  ): SweepData {
    return this.recordingTypes.reduce(
      (acc, recordingType) => ({
        ...acc,
        [recordingType]: this.getSweepRecordingData(
          cellId,
          protocol,
          repetition,
          sweep,
          recordingType
        ),
      }),
      {}
    );
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
 * Note: not all traces have stimulus data.
 *
 * Key Responsibilities:
 * - Initializes and validates the data organization structure.
 * - Retrieves protocols, repetitions, and sweeps for a specific cell.
 * - Extracts recording data with conversion factors and time information.
 *
 * @class
 * @extends NWBTrace
 */
class NWBLNMCTrace extends NWBTrace {
  recordingTypes: RecordingType[] = [RecordingType.STIMULUS, RecordingType.RESPONSE];

  constructor(nwbFile: File) {
    super(nwbFile);
    this.init();
  }

  public init() {
    const stimulusPresentationGroup = this.getGroup(NWBKey.STIMULUS_PRESENTATION);
    const hasStimulusRecordings = stimulusPresentationGroup.keys().length > 0;

    if (!hasStimulusRecordings) {
      // Override recording types if no stimulus data is present
      this.recordingTypes = [RecordingType.RESPONSE];
    }
  }

  public getCellIds(): string[] {
    const dataOrganizationGroup = this.getGroup(NWBKey.DATA_ORGANIZATION);
    const cellIds = dataOrganizationGroup.keys();
    return cellIds;
  }

  public getProtocols(cellId: string): string[] {
    const protocolGroup = this.getGroup(`${NWBKey.DATA_ORGANIZATION}/${cellId}`);

    const protocols = protocolGroup.keys().sort();
    if (protocols.length === 0) {
      throw new Error('No protocols found');
    }

    return protocols;
  }

  public getRepetitions(cellId: string, protocol: string): string[] {
    const repetitionGroupKey = `${NWBKey.DATA_ORGANIZATION}/${cellId}/${protocol}`;
    const repetitionGroup = this.getGroup(repetitionGroupKey);

    const repetitions = repetitionGroup.keys().sort();
    if (repetitions.length === 0) {
      throw new Error(`No repetitions for ${protocol} found`);
    }

    return repetitions;
  }

  public getSweeps(cellId: string, protocol: string, repetition: string): string[] {
    const sweepGroupKey = `${NWBKey.DATA_ORGANIZATION}/${cellId}/${protocol}/${repetition}`;
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
    cellId: string,
    protocol: string,
    repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingData[] {
    const sweepGroupKey = `${NWBKey.DATA_ORGANIZATION}/${cellId}/${protocol}/${repetition}/${sweep}`;
    const sweepGroup = this.getGroup(sweepGroupKey);

    const recIds = sweepGroup.keys();

    /* Recording IDs are prefixed with:
      - For stimuli:
        - 'ics__' or `ccss__` for current.
        - 'vcs__' for voltage.
      - For responses:
        - 'ic__' or `ccs__` for current.
        - 'vc__' for voltage.
    */

    // TODO: if more prefixes found, consider using the neurodata_type attribute.
    const recRegex =
      recordingType === RecordingType.STIMULUS ? /^(?:ics|ccss|vcs)__/ : /^(?:ic|ccs|vc)__/;

    const recId = recIds.find((id) => id.match(recRegex));

    const datasetKey =
      recordingType === RecordingType.STIMULUS
        ? `${NWBKey.STIMULUS_PRESENTATION}/${recId}/${NWBKey.DATA}`
        : `${NWBKey.ACQUISITION}/${recId}/${NWBKey.DATA}`;

    const dataset = this.getDataset(datasetKey);

    const unit = tryGetAttribute(dataset, 'unit');
    if (typeof unit !== 'string') {
      throw new Error(`Incompatible ${recordingType} unit: ${unit}, expected string`);
    }

    const conversionFactorRaw = tryGetAttribute(dataset, 'conversion');
    const conversionFactor = typeof conversionFactorRaw === 'number' ? conversionFactorRaw : 1;

    const timeDatasetKey =
      recordingType === RecordingType.STIMULUS
        ? `${NWBKey.STIMULUS_PRESENTATION}/${recId}/${NWBKey.STARTING_TIME}`
        : `${NWBKey.ACQUISITION}/${recId}/${NWBKey.STARTING_TIME}`;

    const timeDataset = this.getDataset(timeDatasetKey);

    const timeUnit = tryGetAttribute(timeDataset, 'unit');
    if (typeof timeUnit !== 'string') {
      throw new Error(`Incompatible ${recordingType} time unit: ${timeUnit}, expected string`);
    }

    const timeRate = tryGetAttribute(timeDataset, 'rate');
    if (typeof timeRate !== 'number') {
      throw new Error(`Incompatible ${recordingType} time rate: ${timeRate}, expected number`);
    }

    const data = dataset.to_array() as number[];

    return [
      {
        data,
        unit,
        conversionFactor,
        timeUnit,
        timeRate,
      },
    ];
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
  recordingTypes: RecordingType[] = [RecordingType.STIMULUS, RecordingType.RESPONSE];

  constructor(nwbFile: File) {
    super(nwbFile);
    this.init();
  }

  public init() {}

  public getCellIds(): string[] {
    return ['Default'];
  }

  public getProtocols(): string[] {
    return ['Custom'];
  }

  public getRepetitions(_cellId: string, _protocol: string): string[] {
    return ['Custom'];
  }

  public getSweeps(_cellId: string, _protocol: string, _repetition: string): string[] {
    const acquisitionGroup = this.getGroup(NWBKey.ACQUISITION);
    return range(acquisitionGroup.keys().length).map((idx) => idx.toString());
  }

  private getRecId(sweep: string, recordingType: RecordingType): string {
    const recGroupKey =
      recordingType === RecordingType.STIMULUS ? NWBKey.STIMULUS_PRESENTATION : NWBKey.ACQUISITION;

    const recordingGroup = this.getGroup(recGroupKey);

    return recordingGroup.keys()[parseInt(sweep, 10)];
  }

  public getSweepRecordingData(
    _cellId: string,
    _protocol: string,
    _repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingData[] {
    const recId = this.getRecId(sweep, recordingType);

    const datasetKey =
      recordingType === RecordingType.STIMULUS
        ? `${NWBKey.STIMULUS_PRESENTATION}/${recId}/${NWBKey.DATA}`
        : `${NWBKey.ACQUISITION}/${recId}/${NWBKey.DATA}`;

    const dataset = this.getDataset(datasetKey);

    const unit = tryGetAttribute(dataset, 'unit');
    if (typeof unit !== 'string') {
      throw new Error(`Incompatible ${recordingType} unit: ${unit}, expected string`);
    }

    const conversionFactorRaw = tryGetAttribute(dataset, 'conversion');
    const conversionFactor = typeof conversionFactorRaw === 'number' ? conversionFactorRaw : 1;

    const timeDatasetKey =
      recordingType === RecordingType.STIMULUS
        ? `${NWBKey.STIMULUS_PRESENTATION}/${recId}/${NWBKey.STARTING_TIME}`
        : `${NWBKey.ACQUISITION}/${recId}/${NWBKey.STARTING_TIME}`;

    const timeDataset = this.getDataset(timeDatasetKey);

    const timeUnit = tryGetAttribute(timeDataset, 'unit');
    if (typeof timeUnit !== 'string') {
      throw new Error(`Incompatible ${recordingType} time unit: ${timeUnit}, expected string`);
    }

    const timeRate = tryGetAttribute(timeDataset, 'rate');
    if (typeof timeRate !== 'number') {
      throw new Error(`Incompatible ${recordingType} time rate: ${timeRate}, expected number`);
    }

    const data = dataset.to_array() as number[];

    return [
      {
        data,
        unit,
        conversionFactor,
        timeUnit,
        timeRate,
      },
    ];
  }
}

/**
 * NWBCircuitSimulationTrace represents a voltage report generated by
 * a small scale circuit simulation.
 *
 * This class handles NWB files in a way that all recordings are represented as separate cells
 * each having a single repetition and a single custom protocol. It provides methods to
 * retrieve protocols, repetitions, and sweep recording data from the NWB file.
 */
class NWBCircuitSimulationTrace extends NWBTrace {
  recordingTypes: RecordingType[] = [RecordingType.RESPONSE];

  constructor(nwbFile: File) {
    super(nwbFile);
    this.init();
  }

  public init() {}

  public getCellIds(): string[] {
    const acquisitionGroup = this.getGroup(NWBKey.ACQUISITION);
    return acquisitionGroup.keys().sort();
  }

  public getProtocols(): string[] {
    return ['Custom'];
  }

  public getRepetitions(_cellId: string, _protocol: string): string[] {
    return ['Default'];
  }

  public getSweeps(_cellId: string, _protocol: string, _repetition: string): string[] {
    return ['Default'];
  }

  private getTimeData(cellId: string): { timeUnit: string; timeRate: number } {
    const timeDatasetKey = `${NWBKey.ACQUISITION}/${cellId}/${NWBKey.STARTING_TIME}`;

    let timeDataset;

    try {
      timeDataset = this.getDataset(timeDatasetKey);
    } catch {
      // TODO: consider attempting to read from the "timestamps" dataset as a fallback.
      return { timeUnit: 's', timeRate: 1 };
    }

    const timeUnit = tryGetAttribute(timeDataset, 'unit');
    if (typeof timeUnit !== 'string') {
      throw new Error(`Incompatible time unit: ${timeUnit}, expected string`);
    }

    const timeRate = tryGetAttribute(timeDataset, 'rate');
    if (typeof timeRate !== 'number') {
      throw new Error(`Incompatible time rate: ${timeRate}, expected number`);
    }

    return { timeUnit, timeRate };
  }

  public getSweepRecordingData(
    cellId: string,
    _protocol: string,
    _repetition: string,
    _sweep: string,
    recordingType: RecordingType
  ): RecordingData[] {
    const datasetKey = `${NWBKey.ACQUISITION}/${cellId}/${NWBKey.DATA}`;

    const dataset = this.getDataset(datasetKey);

    const unit = tryGetAttribute(dataset, 'unit');
    if (typeof unit !== 'string') {
      throw new Error(`Incompatible ${recordingType} unit: ${unit}, expected string`);
    }

    const conversionFactorRaw = tryGetAttribute(dataset, 'conversion');
    const conversionFactor = typeof conversionFactorRaw === 'number' ? conversionFactorRaw : 1;

    const { timeUnit, timeRate } = this.getTimeData(cellId);

    const data = dataset.to_array() as number[];

    return [
      {
        data,
        unit,
        conversionFactor,
        timeUnit,
        timeRate,
      },
    ];
  }
}

/**
 * IonChannelSimulationTrace represents a ion channel simulation report.
 *
 * TODO write description
 */
class IonChannelSimulationTrace extends NWBTrace {
  recordingTypes: RecordingType[] = [RecordingType.STIMULUS, RecordingType.RESPONSE];

  constructor(nwbFile: File) {
    super(nwbFile);
    this.init();
  }

  public init() {}

  // stimulusKey: vcss__sweep__000, vcss__sweep__001, etc.
  private parseStimulusKey(key: string): { sweep: string } {
    const [, , sweep] = key.split(/_+/);
    if (!sweep) {
      throw new Error(`Invalid stimulus key: ${key}`);
    }
    return { sweep };
  }

  private createStimulusKey({ sweep }: { sweep: string }): string {
    return `vcss__sweep__${sweep}`;
  }

  // responseKey: vcs__itotal_sweep__000, vcs__itotal_sweep__002, etc.
  private parseResponseKey(key: string): { varName: string; sweep: string } {
    const [, varName, , sweep] = key.split(/_+/);
    if (!varName || !sweep) {
      throw new Error(`Invalid response key: ${key}`);
    }
    return { varName, sweep };
  }

  private createResponseKey({ varName, sweep }: { varName: string; sweep: string }): string {
    return `vcs__${varName}_sweep__${sweep}`;
  }

  private getRecVarNames(): string[] {
    const responseGroup = this.getGroup(NWBKey.ACQUISITION);

    const varNameSet = responseGroup
      .keys()
      .map((responseKey) => this.parseResponseKey(responseKey).varName)
      .reduce((acc, varName) => acc.add(varName), new Set<string>());

    return Array.from(varNameSet).sort();
  }

  public getCellIds(): string[] {
    return ['Default'];
  }

  public getProtocols(): string[] {
    const acquisitionGroup = this.getGroup(NWBKey.ACQUISITION);
    const responseGroupId = acquisitionGroup.keys()[0];

    const datasetKey = `${NWBKey.ACQUISITION}/${responseGroupId}`;

    const responseGroup = this.getGroup(datasetKey);
    const protocol = tryGetAttribute(responseGroup, 'stimulus_description');
    if (typeof protocol !== 'string') {
      throw new Error(`Incompatible protocol: ${protocol}, expected string`);
    }

    return [protocol];
  }

  public getRepetitions(_cellId: string, _protocol: string): string[] {
    return ['SEClamp'];
  }

  public getSweeps(_cellId: string, _protocol: string, _repetition: string): string[] {
    const stimulusPresentationGroup = this.getGroup(NWBKey.STIMULUS_PRESENTATION);

    const sweeps = stimulusPresentationGroup
      .keys()
      .map((stimulusKey) => this.parseStimulusKey(stimulusKey).sweep)
      .sort();

    return sweeps;
  }

  private getTimeData(): { timeUnit: string; timeRate: number } {
    const timeDatasetKey = `${NWBKey.ACQUISITION}/${NWBKey.STARTING_TIME}`;

    let timeDataset;

    try {
      timeDataset = this.getDataset(timeDatasetKey);
    } catch {
      // TODO: consider attempting to read from the "timestamps" dataset as a fallback.
      return { timeUnit: 's', timeRate: 0.000025 };
    }

    const timeUnit = tryGetAttribute(timeDataset, 'unit');
    if (typeof timeUnit !== 'string') {
      throw new Error(`Incompatible time unit: ${timeUnit}, expected string`);
    }

    const timeRate = tryGetAttribute(timeDataset, 'rate');
    if (typeof timeRate !== 'number') {
      throw new Error(`Incompatible time rate: ${timeRate}, expected number`);
    }

    return { timeUnit, timeRate };
  }

  public getSweepRecordingData(
    _cellId: string,
    _protocol: string,
    _repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingData[] {
    const recVarNames =
      recordingType === RecordingType.STIMULUS ? ['default'] : this.getRecVarNames();

    const recordingData = recVarNames.map((varName): RecordingData => {
      const datasetKey =
        recordingType === RecordingType.STIMULUS
          ? `${NWBKey.STIMULUS_PRESENTATION}/${this.createStimulusKey({ sweep })}/${NWBKey.DATA}`
          : `${NWBKey.ACQUISITION}/${this.createResponseKey({ varName, sweep })}/${NWBKey.DATA}`;

      const dataset = this.getDataset(datasetKey);

      const unit = tryGetAttribute(dataset, 'unit');
      if (typeof unit !== 'string') {
        throw new Error(`Incompatible ${recordingType} unit: ${unit}, expected string`);
      }

      let label: string | undefined;

      if (recordingType === RecordingType.RESPONSE) {
        const stimulusGroupKey = `${NWBKey.ACQUISITION}/${this.createResponseKey({ varName, sweep })}`;
        const stimulusGroup = this.getGroup(stimulusGroupKey);
        const description = tryGetAttribute(stimulusGroup, 'description');
        if (typeof description !== 'string') {
          throw new Error(`Incompatible ${recordingType} description: ${unit}, expected string`);
        }

        label = description;
      }

      const conversionFactorRaw = tryGetAttribute(dataset, 'conversion');
      const conversionFactor = typeof conversionFactorRaw === 'number' ? conversionFactorRaw : 1;

      const { timeUnit, timeRate } = this.getTimeData();

      const data = dataset.to_array() as number[];

      return {
        label,
        data,
        unit,
        conversionFactor,
        timeUnit,
        timeRate,
      };
    });

    return recordingData;
  }
}

/**
 * The standard error thrown by `dataset.get_attribute()`
 * does not output the name of the missing attribute.
 *
 * This function does.
 */
function tryGetAttribute(entity: Dataset | Group, name: string) {
  try {
    return entity.get_attribute(name, true);
  } catch {
    const attributesNames = Object.keys(entity.attrs);
    throw new Error(
      `Attribute "${name}" not found in dataset!\n${
        attributesNames.length === 0
          ? 'This dataset has no attribute.'
          : `Available attributes are: ${attributesNames.join(', ')}.`
      }`
    );
  }
}
