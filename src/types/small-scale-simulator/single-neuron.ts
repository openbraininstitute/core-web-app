import { ApiError } from './common';
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
  recordCurrents: boolean;
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

export type UpdateSynapseSimulationProperty = {
  id: number;
  key: keyof SynapseConfig;
  newValue: number | string | number[] | null;
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

export type SimulationStreamData = {
  name: string;
  amplitude?: number;
  frequency?: number;
  recording: string;
  varying_key: string;
  x: Array<number>;
  y: Array<number>;
  variable_name?: string;
  unit?: string;
};

export const isBluenaasError = (obj: Object): obj is ApiError => {
  return 'details' in obj && 'message' in obj && 'error_code' in obj;
};
