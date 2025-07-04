import { ExploreResource, MEModelSynaptome } from '../explore-section/es';
import { SynaptomeModelResource } from '../explore-section/delta-model';
import { MEModelResource } from '../me-model';
import { DataType } from '@/constants/explore-section/list-views';
import { PlotData } from '@/services/bluenaas-single-cell/types';

export enum SimulationTypeNames {
  SYNAPTOME_SIMULATION = 'synaptome-simulation',
  SINGLE_NEURON_SIMULATION = 'single-neuron-simulation',
}

export type StimulusType = 'current_clamp' | 'voltage_clamp' | 'conductance';
export type StimulusModule = 'ap_waveform' | 'idrest' | 'iv' | 'fire_pattern';

export type StimulusTypeOption = {
  label: string;
  value: StimulusType;
};

type FunctionParameterNumber = {
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit: string;
};

type StimulusParameter = Record<'params', FunctionParameterNumber>;

type ConditionalStimulusParamsTypes = Record<StimulusModule, StimulusParameter>;

export type StimulusDropdownInfo = {
  name: string;
  value: string;
};

export type SynaptomeConfig = SynapseConfig[];
export interface CurrentInjectionSimulationConfig {
  id: number;
  config_id: string;
  inject_to: string;
  stimulus: StimulusConfig;
}

export type SimulationExperimentalSetup = {
  celsius: number;
  vinit: number;
  hypamp: number;
  max_time: number;
  time_step: number;
  seed: number;
};

export type RecordLocation = {
  section: string;
  offset: number;
};

export interface SimulationConfiguration {
  record_from: RecordLocation[];
  current_injection: CurrentInjectionSimulationConfig[];
  conditions: SimulationExperimentalSetup;
  synapses?: SynaptomeConfig;
}

export type SynapseConfig = {
  id: string;
  config_id: string;
  delay: number;
  duration: number;
  frequency: number | number[];
  weight_scalar: number;
  color: string;
};

type SingleModelSimConfig = SimulationConfiguration & {
  direct_stimulation: CurrentInjectionSimulationConfig[];
  synapses: null;
};

type SynapseModelSimConfig = SimulationConfiguration & {
  synapses: SynaptomeConfig;
};

export type StimulusConfig = {
  stimulus_type: StimulusType;
  stimulus_protocol: StimulusModule | null;
  amplitudes: number[] | number;
};

export interface SingleNeuronModelSimulationConfig {
  record_from: RecordLocation[];
  conditions: SimulationExperimentalSetup;
  current_injection: CurrentInjectionSimulationConfig;
  synaptome?: Array<SynapseConfig>;
}

export interface SimulationPayload {
  config: SingleNeuronModelSimulationConfig;
  simulation: Record<string, PlotData>;
  stimulus: PlotData | null;
}

export type SelectedSingleNeuronModel = {
  type: DataType;
  self: string;
  source: ExploreResource;
};

type SelectedSynaptomeModel = SelectedSingleNeuronModel & {
  source: MEModelSynaptome;
};

type ModelResource = MEModelResource | SynaptomeModelResource;

const isSynaptomModel = (model: ModelResource | null): model is SynaptomeModelResource => {
  if (!model) {
    return false;
  }

  const type = Array.isArray(model['@type']) ? model['@type'] : [model['@type']];
  return type.includes(DataType.SingleNeuronSynaptome) && 'distribution' in model;
};

export type UpdateSynapseSimulationProperty = {
  id: number;
  key: keyof SynapseConfig;
  newValue: number | string | number[] | null;
};

type UpdateSynapseSimulationProperties = {
  id: number;
  entries: Array<{
    key: keyof SynapseConfig;
    newValue: number | string | null | number[];
  }>;
};

export type ProtocolDetails = {
  description: string;
  name: StimulusModule;
  label: string;
  usedBy: StimulusType[];

  defaults: {
    time: {
      delay: number;
      duration: number;
      stop_time: number;
    };

    current: {
      value: number;
      min: number;
      max: number;
      step: number;
    };
  };
};

type BluenaasError = {
  details: string;
  message: string;
  error_code: string;
};

type StreamSimulationEvent = 'init' | 'info' | 'data' | 'error';
type StreamSimulationStatus = 'pending' | 'started' | 'success' | 'failure';

export type SimulationStreamData = {
  name: string;
  amplitude?: number;
  frequency?: number;
  recording: string;
  varying_key: string;
  x: Array<number>;
  y: Array<number>;
};

type StreamSimulationResponse = {
  task_id: string;
  description: string;
  event: StreamSimulationEvent;
  state: StreamSimulationStatus;
  data: SimulationStreamData;
};

export const isBluenaasError = (obj: Object): obj is BluenaasError => {
  return 'details' in obj && 'message' in obj && 'error_code' in obj;
};

const isBluenaasSimulationError = (obj: StreamSimulationResponse) => obj.event === 'error';
