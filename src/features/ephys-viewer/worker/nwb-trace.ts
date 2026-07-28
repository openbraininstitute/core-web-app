/* eslint-disable max-classes-per-file */

import range from 'es-toolkit/compat/range';
import { Dataset, File, Group } from 'h5wasm';

import { RecordingType } from '@/features/ephys-viewer/trace-index';
import {
  applyHoldingCurrent,
  correctUnitMixup,
  looksLikeVU,
  orderVUProtocols,
  replaceInitialSamples,
  requiresInitialSampleReplacement,
  toVUAcquisitionName,
  translateVUProtocol,
  trimTrailingNaNs,
} from '@/features/ephys-viewer/vu-nwb';

import type {
  RecordingData,
  RecordingMeta,
  Samples,
  SweepData,
  TraceIndex,
  TraceProtocolIndex,
  TraceRepetitionIndex,
} from '@/features/ephys-viewer/trace-index';
import type { RecordingUnits } from '@/features/ephys-viewer/vu-nwb';

const SMALL_SCALE_SIMULATOR_ID = 'obi_small_scale_simulator_v1';
const CURRENT_REPORT_WRITER_AGENT_ID = 'obi_small_scale_simulator_v1__current_report_writer';

enum NWBKey {
  DATA_ORGANIZATION = 'data_organization',
  ACQUISITION = 'acquisition',
  STIMULUS_PRESENTATION = 'stimulus/presentation',
  DATA = 'data',
  STARTING_TIME = 'starting_time',
  GENERAL = 'general',
  WAS_GENERATED_BY = 'was_generated_by',
  TIMESERIES = 'timeseries',
  BIAS_CURRENT = 'bias_current',
  STIMULUS_DESCRIPTION = 'stimulus_description',
}

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
 * @method open - Static factory method to create an appropriate NWBTrace subclass based on file structure
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

  /**
   * Open a file already present in the Emscripten FS and pick the reader that matches its
   * layout. The download and the FS write are the caller's job — see `fetchToFS`.
   */
  public static open(filename: string): NWBTrace {
    const file = new File(filename, 'r');

    // LNMC complient
    const dataOrganizationGroup = file.get(NWBKey.DATA_ORGANIZATION);
    const hasDataOrganization = dataOrganizationGroup instanceof Group;

    if (hasDataOrganization) return new NWBLNMCTrace(file);

    // TODO: move format detection logic outside

    // VU University Amsterdam compliant
    try {
      const presentationGroup = file.get(NWBKey.STIMULUS_PRESENTATION);
      const acquisitionGroup = file.get(getVUAcquisitionPath(file));

      if (
        presentationGroup instanceof Group &&
        acquisitionGroup instanceof Group &&
        looksLikeVU(presentationGroup.keys(), acquisitionGroup.keys())
      ) {
        return new NWBVUTrace(file);
      }
    } catch {}

    // Both simulation formats identify themselves by the agent that wrote them.
    const writerAgents = readWriterAgents(file);

    // Ion channel simulation complient
    if (writerAgents.includes(CURRENT_REPORT_WRITER_AGENT_ID)) {
      return new IonChannelSimulationTrace(file);
    }

    // Small scale circuit simulation complient
    if (writerAgents.includes(SMALL_SCALE_SIMULATOR_ID)) {
      return new NWBCircuitSimulationTrace(file);
    }

    // Defaulting to Generic NWB Trace
    return new NWBGenericTrace(file);
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

  /**
   * The same recordings `getSweepRecordingData` would return, without their samples.
   *
   * The index is built by reading one sweep of every repetition, and for a VU file reading
   * a sweep in full means materialising a few million samples per channel — so readers must
   * be able to answer this from attributes alone.
   */
  abstract getSweepRecordingMeta(
    cellId: string,
    protocol: string,
    repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingMeta[];

  /**
   * Walk the whole hierarchy once so the main thread can do its structural lookups without
   * talking to the worker. Repetitions whose first sweep can not be read are kept with no
   * recordings rather than dropped, so a single bad sweep does not hide a protocol.
   */
  public buildIndex(): TraceIndex {
    const cells = this.getCellIds().map((id) => ({
      id,
      protocols: this.getProtocols(id).map((name): TraceProtocolIndex => {
        return {
          name,
          repetitions: this.getRepetitions(id, name).map((repetition): TraceRepetitionIndex => {
            const sweeps = this.getSweeps(id, name, repetition);

            return {
              name: repetition,
              sweeps,
              recordings: this.getRepetitionRecordings(id, name, repetition, sweeps),
            };
          }),
        };
      }),
    }));

    const protocolNames = new Set<string>();
    cells.forEach((cell) => {
      cell.protocols.forEach(({ name }) => {
        protocolNames.add(name);
      });
    });

    return {
      recordingTypes: this.recordingTypes,
      protocolOrder: this.orderProtocols([...protocolNames]),
      cells,
    };
  }

  /**
   * How the viewer should list this file's protocols, given the union across its cells.
   *
   * Alphabetical unless a reader says otherwise. Ordering belongs here rather than in the
   * component: the union is taken across cells, so a component that preserved one reader's
   * order would be silently reordering every other format by whichever cell came first.
   */
  protected orderProtocols(protocols: string[]): string[] {
    return [...protocols].sort();
  }

  private getRepetitionRecordings(
    cellId: string,
    protocol: string,
    repetition: string,
    sweeps: string[]
  ): TraceRepetitionIndex['recordings'] {
    const [firstSweep] = sweeps;
    if (firstSweep === undefined) return {};

    return this.recordingTypes.reduce<TraceRepetitionIndex['recordings']>((acc, recordingType) => {
      try {
        acc[recordingType] = this.getSweepRecordingMeta(
          cellId,
          protocol,
          repetition,
          firstSweep,
          recordingType
        );
      } catch {
        // A recording type the file does not carry for this sweep; leave it out.
      }
      return acc;
    }, {});
  }

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

  /**
   * Read a recording's units and timebase off the attributes of its `data` and `starting_time`
   * datasets, without touching the samples.
   */
  protected readMeta(datasetKey: string, timeDatasetKey: string, label?: string): RecordingMeta {
    const dataset = this.getDataset(datasetKey);

    const unit = tryGetAttribute(dataset, 'unit');
    if (typeof unit !== 'string') {
      throw new Error(`Incompatible unit on ${datasetKey}: ${unit}, expected string`);
    }

    const conversionFactorRaw = tryGetAttribute(dataset, 'conversion');
    const conversionFactor = typeof conversionFactorRaw === 'number' ? conversionFactorRaw : 1;

    const timeDataset = this.getDataset(timeDatasetKey);

    const timeUnit = tryGetAttribute(timeDataset, 'unit');
    if (typeof timeUnit !== 'string') {
      throw new Error(`Incompatible time unit on ${timeDatasetKey}: ${timeUnit}, expected string`);
    }

    const timeRate = tryGetAttribute(timeDataset, 'rate');
    if (typeof timeRate !== 'number') {
      throw new Error(`Incompatible time rate on ${timeDatasetKey}: ${timeRate}, expected number`);
    }

    return { label, unit, conversionFactor, timeUnit, timeRate };
  }

  public getSweepData(
    cellId: string,
    protocol: string,
    repetition: string,
    sweep: string
  ): SweepData {
    return this.recordingTypes.reduce<SweepData>((acc, recordingType) => {
      acc[recordingType] = this.getSweepRecordingData(
        cellId,
        protocol,
        repetition,
        sweep,
        recordingType
      );
      return acc;
    }, {});
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

  private getRecordingKeys(
    cellId: string,
    protocol: string,
    repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): { datasetKey: string; timeDatasetKey: string } {
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

    const parentKey =
      recordingType === RecordingType.STIMULUS ? NWBKey.STIMULUS_PRESENTATION : NWBKey.ACQUISITION;

    return {
      datasetKey: `${parentKey}/${recId}/${NWBKey.DATA}`,
      timeDatasetKey: `${parentKey}/${recId}/${NWBKey.STARTING_TIME}`,
    };
  }

  public getSweepRecordingMeta(
    cellId: string,
    protocol: string,
    repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingMeta[] {
    const { datasetKey, timeDatasetKey } = this.getRecordingKeys(
      cellId,
      protocol,
      repetition,
      sweep,
      recordingType
    );

    return [this.readMeta(datasetKey, timeDatasetKey)];
  }

  public getSweepRecordingData(
    cellId: string,
    protocol: string,
    repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingData[] {
    const { datasetKey, timeDatasetKey } = this.getRecordingKeys(
      cellId,
      protocol,
      repetition,
      sweep,
      recordingType
    );

    return [
      {
        ...this.readMeta(datasetKey, timeDatasetKey),
        data: readSamples(this.getDataset(datasetKey)),
      },
    ];
  }
}

/** A sweep of a VU file, indexed once when the file is opened. */
type VUSweep = {
  stimulusKey: string;
  acquisitionKey: string;
  sweepNumber: number;
  description: string;
};

const VU_CELL_ID = 'Default';
const VU_REPETITION = 'Default';

/**
 * NWBVUTrace represents a trace recorded at VU University Amsterdam.
 *
 * These files are flat: `stimulus/presentation` holds one entry per sweep, carried on
 * the IGOR `DA` output channel, and `acquisition` holds the matching response on the
 * `AD` input channel. They describe no hierarchy of their own, so sweeps are grouped
 * into protocols by their `stimulus_description`, under one cell and one repetition:
 *
 * - Default (cell)
 *   └── Protocol (stimulus_description, translated to its BBP name where known)
 *       └── Default (repetition)
 *           └── Sweep (sweep_number)
 *
 * BluePyEfe reads these files to extract features and so drops every sweep it can not
 * map onto a BBP protocol; the viewer keeps them all, falling back to the raw VU name.
 * The per-sweep corrections BluePyEfe applies — unit mixup, NaN padding, holding
 * current and the 90 ms artifact — live in `vu-nwb.ts` and are applied on read.
 *
 * @class
 * @extends NWBTrace
 */
class NWBVUTrace extends NWBTrace {
  recordingTypes: RecordingType[] = [RecordingType.STIMULUS, RecordingType.RESPONSE];

  private acquisitionPath: string = NWBKey.ACQUISITION;

  private protocols: string[] = [];

  private sweepsByProtocol = new Map<string, VUSweep[]>();

  constructor(nwbFile: File) {
    super(nwbFile);
    this.init();
  }

  /**
   * Index every sweep up front. These files hold a few hundred of them, and the viewer
   * asks for protocols and sweeps once per rendered thumbnail, so rescanning the file
   * on each call would be wasteful.
   */
  public init() {
    this.acquisitionPath = getVUAcquisitionPath(this.file);

    const presentationGroup = this.getGroup(NWBKey.STIMULUS_PRESENTATION);
    const acquisitionKeys = new Set(this.getGroup(this.acquisitionPath).keys());

    const descriptions: string[] = [];

    presentationGroup.keys().forEach((stimulusKey, index) => {
      const acquisitionKey = toVUAcquisitionName(stimulusKey);
      if (!acquisitionKeys.has(acquisitionKey)) return;

      const stimulusPath = `${NWBKey.STIMULUS_PRESENTATION}/${stimulusKey}`;
      const description = this.getStimulusDescription(stimulusPath);
      if (description === undefined) return;

      // Empty sweeps have nothing to plot, and BluePyEfe discards them as well.
      const acquisitionPath = `${this.acquisitionPath}/${acquisitionKey}`;
      if (
        !this.getDataset(`${stimulusPath}/${NWBKey.DATA}`).shape?.[0] ||
        !this.getDataset(`${acquisitionPath}/${NWBKey.DATA}`).shape?.[0]
      ) {
        return;
      }

      const sweepNumber = getOptionalAttribute(this.getGroup(stimulusPath), 'sweep_number');
      const protocol = translateVUProtocol(description);
      const sweeps = this.sweepsByProtocol.get(protocol) ?? [];

      sweeps.push({
        stimulusKey,
        acquisitionKey,
        sweepNumber: typeof sweepNumber === 'number' ? sweepNumber : index,
        description,
      });

      this.sweepsByProtocol.set(protocol, sweeps);
      descriptions.push(description);
    });

    this.sweepsByProtocol.forEach((sweeps) => {
      sweeps.sort((a, b) => a.sweepNumber - b.sweepNumber);
    });

    this.protocols = orderVUProtocols(descriptions);
  }

  public getCellIds(): string[] {
    return [VU_CELL_ID];
  }

  public getProtocols(): string[] {
    if (this.protocols.length === 0) {
      throw new Error('No protocols found');
    }

    return this.protocols;
  }

  /** `orderVUProtocols` already put the recognised BBP protocols ahead of the raw VU names. */
  protected override orderProtocols(protocols: string[]): string[] {
    return protocols;
  }

  public getRepetitions(): string[] {
    return [VU_REPETITION];
  }

  public getSweeps(_cellId: string, protocol: string): string[] {
    return this.getProtocolSweeps(protocol).map(({ sweepNumber }) => String(sweepNumber));
  }

  public getSweepRecordingMeta(
    _cellId: string,
    protocol: string,
    _repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingMeta[] {
    const { units, timeUnit, timeRate } = this.readSweepMeta(this.findSweep(protocol, sweep));

    return [toVURecordingMeta(units, timeUnit, timeRate, recordingType)];
  }

  /**
   * Both channels come out of a single read. The base implementation would call
   * `getSweepRecordingData` once per recording type, and each of those reads and corrects
   * the stimulus and the response together — so it would decompress every sweep twice.
   */
  public getSweepData(_cellId: string, protocol: string, _repetition: string, sweep: string) {
    const { current, voltage, units, timeUnit, timeRate } = this.readSweep(
      this.findSweep(protocol, sweep)
    );

    return {
      stimulus: [
        {
          ...toVURecordingMeta(units, timeUnit, timeRate, RecordingType.STIMULUS),
          data: current,
        },
      ],
      response: [
        {
          ...toVURecordingMeta(units, timeUnit, timeRate, RecordingType.RESPONSE),
          data: voltage,
        },
      ],
    };
  }

  /**
   * Not on the live path — the worker reads through `getSweepData`, which this reader overrides
   * so both channels come out of one pass. Delegating to it keeps the channel mapping in one
   * place rather than spelling it out a second time.
   */
  public getSweepRecordingData(
    cellId: string,
    protocol: string,
    repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingData[] {
    return this.getSweepData(cellId, protocol, repetition, sweep)[recordingType] ?? [];
  }

  private getProtocolSweeps(protocol: string): VUSweep[] {
    const sweeps = this.sweepsByProtocol.get(protocol);

    if (!sweeps || sweeps.length === 0) {
      throw new Error(`No sweeps for ${protocol} found`);
    }

    return sweeps;
  }

  private findSweep(protocol: string, sweep: string): VUSweep {
    const sweepNumber = parseInt(sweep, 10);
    const match = this.getProtocolSweeps(protocol).find((s) => s.sweepNumber === sweepNumber);

    if (!match) {
      throw new Error(`Sweep ${sweep} of ${protocol} not found`);
    }

    return match;
  }

  /**
   * The VU protocol name, held as an attribute on the sweep group or, in some files,
   * as a dataset inside it.
   */
  private getStimulusDescription(stimulusPath: string): string | undefined {
    const attribute = getOptionalAttribute(
      this.getGroup(stimulusPath),
      NWBKey.STIMULUS_DESCRIPTION
    );

    if (typeof attribute === 'string') return attribute;

    const dataset = this.file.get(`${stimulusPath}/${NWBKey.STIMULUS_DESCRIPTION}`);
    if (!(dataset instanceof Dataset)) return undefined;

    const value = dataset.to_array();
    const first = Array.isArray(value) ? value[0] : value;

    return typeof first === 'string' ? first : undefined;
  }

  /** The holding current in pA, recorded on the response channel of current clamp sweeps. */
  private getBiasCurrent(acquisitionPath: string): number | undefined {
    const dataset = this.file.get(`${acquisitionPath}/${NWBKey.BIAS_CURRENT}`);
    if (!(dataset instanceof Dataset)) return undefined;

    const value = dataset.to_array();
    const first = Array.isArray(value) ? value[0] : value;

    return typeof first === 'number' ? first : undefined;
  }

  /**
   * Units and timebase of a sweep, read from attributes only.
   *
   * Reading a VU sweep in full means materialising a few million samples per channel, so the
   * index — which only needs the units — must not go through `readSweep`.
   */
  private readSweepMeta(vuSweep: VUSweep): {
    acquisitionPath: string;
    currentDataset: Dataset;
    voltageDataset: Dataset;
    units: RecordingUnits;
    timeUnit: string;
    timeRate: number;
  } {
    const acquisitionPath = `${this.acquisitionPath}/${vuSweep.acquisitionKey}`;
    const stimulusPath = `${NWBKey.STIMULUS_PRESENTATION}/${vuSweep.stimulusKey}`;

    const currentDataset = this.getDataset(`${stimulusPath}/${NWBKey.DATA}`);
    const voltageDataset = this.getDataset(`${acquisitionPath}/${NWBKey.DATA}`);

    const units = correctUnitMixup({
      voltageConversion: getConversionFactor(voltageDataset),
      currentConversion: getConversionFactor(currentDataset),
      voltageUnit: getUnit(voltageDataset),
      currentUnit: getUnit(currentDataset),
    });

    // BluePyEfe times VU sweeps off the response channel.
    const startingTimeDataset = this.getDataset(`${acquisitionPath}/${NWBKey.STARTING_TIME}`);

    const timeUnit = tryGetAttribute(startingTimeDataset, 'unit');
    if (typeof timeUnit !== 'string') {
      throw new Error(`Incompatible time unit: ${timeUnit}, expected string`);
    }

    const timeRate = tryGetAttribute(startingTimeDataset, 'rate');
    if (typeof timeRate !== 'number') {
      throw new Error(`Incompatible time rate: ${timeRate}, expected number`);
    }

    return {
      acquisitionPath,
      currentDataset,
      voltageDataset,
      units,
      timeUnit,
      timeRate,
    };
  }

  /**
   * Read both channels of a sweep and correct them, in the order BluePyEfe does.
   *
   * Both are always read, even when only one was asked for: the NaN padding is
   * detected on the stimulus but has to be trimmed off the response as well, or the
   * two would no longer line up.
   */
  private readSweep(vuSweep: VUSweep): {
    current: Samples;
    voltage: Samples;
    units: RecordingUnits;
    timeUnit: string;
    timeRate: number;
  } {
    const { acquisitionPath, currentDataset, voltageDataset, units, timeUnit, timeRate } =
      this.readSweepMeta(vuSweep);

    const { current, voltage } = trimTrailingNaNs(
      getSamples(currentDataset),
      getSamples(voltageDataset)
    );

    applyHoldingCurrent(current, this.getBiasCurrent(acquisitionPath), units.currentConversion);

    if (requiresInitialSampleReplacement(vuSweep.description)) {
      replaceInitialSamples(current, voltage, timeRate);
    }

    return { current, voltage, units, timeUnit, timeRate };
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

  private getRecordingKeys(
    sweep: string,
    recordingType: RecordingType
  ): { datasetKey: string; timeDatasetKey: string } {
    const parentKey =
      recordingType === RecordingType.STIMULUS ? NWBKey.STIMULUS_PRESENTATION : NWBKey.ACQUISITION;

    const recId = this.getGroup(parentKey).keys()[parseInt(sweep, 10)];

    return {
      datasetKey: `${parentKey}/${recId}/${NWBKey.DATA}`,
      timeDatasetKey: `${parentKey}/${recId}/${NWBKey.STARTING_TIME}`,
    };
  }

  public getSweepRecordingMeta(
    _cellId: string,
    _protocol: string,
    _repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingMeta[] {
    const { datasetKey, timeDatasetKey } = this.getRecordingKeys(sweep, recordingType);

    return [this.readMeta(datasetKey, timeDatasetKey)];
  }

  public getSweepRecordingData(
    _cellId: string,
    _protocol: string,
    _repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingData[] {
    const { datasetKey, timeDatasetKey } = this.getRecordingKeys(sweep, recordingType);

    return [
      {
        ...this.readMeta(datasetKey, timeDatasetKey),
        data: readSamples(this.getDataset(datasetKey)),
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

    let timeDataset: Dataset;

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

  public getSweepRecordingMeta(
    cellId: string,
    _protocol: string,
    _repetition: string,
    _sweep: string,
    _recordingType: RecordingType
  ): RecordingMeta[] {
    const dataset = this.getDataset(`${NWBKey.ACQUISITION}/${cellId}/${NWBKey.DATA}`);

    const unit = tryGetAttribute(dataset, 'unit');
    if (typeof unit !== 'string') {
      throw new Error(`Incompatible unit for ${cellId}: ${unit}, expected string`);
    }

    const conversionFactorRaw = tryGetAttribute(dataset, 'conversion');
    const conversionFactor = typeof conversionFactorRaw === 'number' ? conversionFactorRaw : 1;

    const { timeUnit, timeRate } = this.getTimeData(cellId);

    return [{ unit, conversionFactor, timeUnit, timeRate }];
  }

  public getSweepRecordingData(
    cellId: string,
    protocol: string,
    repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingData[] {
    const dataset = this.getDataset(`${NWBKey.ACQUISITION}/${cellId}/${NWBKey.DATA}`);

    return this.getSweepRecordingMeta(cellId, protocol, repetition, sweep, recordingType).map(
      (meta) => ({ ...meta, data: readSamples(dataset) })
    );
  }
}

/**
 * IonChannelSimulationTrace represents a voltage clamp report generated by
 * an ion channel simulation (session ID: `vc_hh_seclamp`).
 *
 * This class handles NWB files where all recordings belong to a single cell
 * under a single SEClamp repetition. Sweeps and variable names are read from
 * the `sweep_number` and `description` attributes of each group inside
 * `acquisition` and `stimulus/presentation`, allowing stimuli and responses
 * to be matched without relying on key naming conventions.
 *
 * Key Responsibilities:
 * - Reads `sweep_number` and `description` attributes to identify sweeps and variables.
 * - Returns one `RecordingData` per recorded variable for response data.
 * - Reads the protocol name from the `stimulus_description` attribute of the first acquisition entry.
 *
 * @class
 * @extends NWBTrace
 */
class IonChannelSimulationTrace extends NWBTrace {
  recordingTypes: RecordingType[] = [RecordingType.STIMULUS, RecordingType.RESPONSE];

  constructor(nwbFile: File) {
    super(nwbFile);
    this.init();
  }

  public init() {}

  private getGroupEntries(
    parentKey: string
  ): { key: string; description: string | undefined; sweepNumber: number }[] {
    const parent = this.getGroup(parentKey);
    return parent.keys().map((key) => {
      const group = this.getGroup(`${parentKey}/${key}`);
      const description = tryGetAttribute(group, 'description');
      const sweepNumber = tryGetAttribute(group, 'sweep_number');
      if (typeof sweepNumber !== 'number') {
        throw new Error(`Missing sweep_number on ${parentKey}/${key}`);
      }
      return {
        key,
        description: typeof description === 'string' ? description : undefined,
        sweepNumber,
      };
    });
  }

  private findGroupKey(parentKey: string, sweepNumber: number, description?: string): string {
    const entries = this.getGroupEntries(parentKey);
    const match = entries.find(
      (e) =>
        e.sweepNumber === sweepNumber &&
        (description === undefined || e.description === description)
    );
    if (!match) {
      throw new Error(
        `No group found in ${parentKey} with sweep_number=${sweepNumber}${description !== undefined ? ` and description=${description}` : ''}`
      );
    }
    return match.key;
  }

  private getRecVarNames(): string[] {
    const entries = this.getGroupEntries(NWBKey.ACQUISITION);
    return Array.from(
      new Set(entries.map((e) => e.description).filter((d): d is string => d !== undefined))
    ).sort();
  }

  public getCellIds(): string[] {
    return ['SEClamp'];
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
    const entries = this.getGroupEntries(NWBKey.STIMULUS_PRESENTATION);
    const sweepNumbers = Array.from(new Set(entries.map((e) => e.sweepNumber))).sort(
      (a, b) => a - b
    );
    return sweepNumbers.map(String);
  }

  /**
   * The group holding each recording of a sweep, paired with the variable name it records.
   * Stimuli carry a single unlabelled recording; responses carry one per recorded variable.
   */
  private getRecordingGroups(
    sweep: string,
    recordingType: RecordingType
  ): { parentKey: string; groupKey: string; label?: string }[] {
    const sweepNumber = parseInt(sweep, 10);

    const parentKey =
      recordingType === RecordingType.STIMULUS ? NWBKey.STIMULUS_PRESENTATION : NWBKey.ACQUISITION;

    if (recordingType === RecordingType.STIMULUS) {
      return [{ parentKey, groupKey: this.findGroupKey(parentKey, sweepNumber) }];
    }

    return this.getRecVarNames().map((label) => ({
      parentKey,
      groupKey: this.findGroupKey(parentKey, sweepNumber, label),
      label,
    }));
  }

  public getSweepRecordingMeta(
    _cellId: string,
    _protocol: string,
    _repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingMeta[] {
    return this.getRecordingGroups(sweep, recordingType).map(({ parentKey, groupKey, label }) =>
      this.readMeta(
        `${parentKey}/${groupKey}/${NWBKey.DATA}`,
        `${parentKey}/${groupKey}/${NWBKey.STARTING_TIME}`,
        label
      )
    );
  }

  public getSweepRecordingData(
    _cellId: string,
    _protocol: string,
    _repetition: string,
    sweep: string,
    recordingType: RecordingType
  ): RecordingData[] {
    return this.getRecordingGroups(sweep, recordingType).map(({ parentKey, groupKey, label }) => {
      const datasetKey = `${parentKey}/${groupKey}/${NWBKey.DATA}`;

      return {
        ...this.readMeta(datasetKey, `${parentKey}/${groupKey}/${NWBKey.STARTING_TIME}`, label),
        data: readSamples(this.getDataset(datasetKey)),
      };
    });
  }
}

/**
 * VU sweeps carry the commanded current on the stimulus channel and the recorded voltage on
 * the response channel, so which half of the corrected unit pair applies depends on the side
 * being asked for.
 */
function toVURecordingMeta(
  units: RecordingUnits,
  timeUnit: string,
  timeRate: number,
  recordingType: RecordingType
): RecordingMeta {
  const isStimulus = recordingType === RecordingType.STIMULUS;

  return {
    unit: isStimulus ? units.currentUnit : units.voltageUnit,
    conversionFactor: isStimulus ? units.currentConversion : units.voltageConversion,
    timeUnit,
    timeRate,
  };
}

/**
 * The agents recorded in `general/was_generated_by`, which is how the two simulation
 * formats identify themselves. Empty for any file that does not carry it.
 */
function readWriterAgents(file: File): string[] {
  const generalGroup = file.get(NWBKey.GENERAL);
  if (!(generalGroup instanceof Group)) return [];

  const dataset = generalGroup.get(NWBKey.WAS_GENERATED_BY);
  if (!(dataset instanceof Dataset)) return [];

  try {
    return dataset.to_array() as string[];
  } catch {
    return [];
  }
}

/**
 * VU recordings sit directly under `acquisition`, but BluePyEfe also supports them
 * being nested under `acquisition/timeseries`.
 */
function getVUAcquisitionPath(file: File): string {
  const timeseriesPath = `${NWBKey.ACQUISITION}/${NWBKey.TIMESERIES}`;

  return file.get(timeseriesPath) instanceof Group ? timeseriesPath : NWBKey.ACQUISITION;
}

/**
 * A dataset's samples, avoiding the per-sample boxing `to_array()` does.
 *
 * `to_array()` reads through `json_value`, which spreads the typed array into a plain
 * `number[]` — a second copy at 8 bytes a sample, allocated and discarded on every read.
 * `dataset.value` stops one step earlier and hands back the buffer itself. Multi-dimensional
 * and non-float datasets keep the old path, where `to_array()` also does the reshaping.
 */
function readSamples(dataset: Dataset): Samples | number[] {
  if ((dataset.shape?.length ?? 1) <= 1) {
    const { value } = dataset;
    if (value instanceof Float32Array || value instanceof Float64Array) return value;
  }

  return dataset.to_array() as number[];
}

/** Narrow a dataset to its raw sample buffer, without boxing it into a `number[]`. */
function getSamples(dataset: Dataset): Samples {
  const { value } = dataset;

  if (!(value instanceof Float32Array) && !(value instanceof Float64Array)) {
    throw new Error(`Expected float samples, got ${value?.constructor.name ?? 'nothing'}`);
  }

  return value;
}

function getUnit(dataset: Dataset): string {
  const unit = tryGetAttribute(dataset, 'unit');

  if (typeof unit !== 'string') {
    throw new Error(`Incompatible unit: ${unit}, expected string`);
  }

  return unit;
}

function getConversionFactor(dataset: Dataset): number {
  const conversionFactor = getOptionalAttribute(dataset, 'conversion');

  return typeof conversionFactor === 'number' ? conversionFactor : 1;
}

/** Like `tryGetAttribute`, but for attributes that are not expected on every file. */
function getOptionalAttribute(entity: Dataset | Group, name: string) {
  try {
    return entity.get_attribute(name, true);
  } catch {
    return undefined;
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
