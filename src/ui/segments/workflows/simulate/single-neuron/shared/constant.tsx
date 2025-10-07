import {
  NeuronLocationOriginDict,
  StimulusModuleDict,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import {
  DefaultColor,
  SimulationColors,
} from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';

import type {
  SimulationExperimentalSetup,
  StimulusConfig,
  TStimulationConfiguration,
  TProtocolDetails,
  TStimulusModuleValue,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';

export const PanelQueryParam = 'panel';
export const WorkflowSimulatePanels = {
  Configuration: 'configuration',
  Results: 'results',
} as const;

export type WorkflowSimulatePanelKeys =
  (typeof WorkflowSimulatePanels)[keyof typeof WorkflowSimulatePanels];

export const threeDVisualizerQueryParam = '3d';
export const threeDVisualizerState = {
  Collapsed: 'collapsed',
  Expanded: 'expanded',
} as const;

export type ThreeDVisualizerQueryParamKeys =
  (typeof threeDVisualizerState)[keyof typeof threeDVisualizerState];

export const PROTOCOL_DETAILS: Record<TStimulusModuleValue, TProtocolDetails> = {
  [StimulusModuleDict.Idrest]: {
    name: 'idrest',
    label: 'Step (Suprathreshold)',
    description: `This protocol is a sequence of depolarizing square pulses. The aim is to get as many APs as possible and make cell firing up to saturation. The firing properties, such as mean AP frequency and interspike intervals, bursting number, etc., are calculated to determine the cell's e-type (electrical firing type).`,
    usedBy: ['current_clamp'],

    defaults: {
      time: {
        delay: 250,
        duration: 1350,
        stop_time: 1850,
      },

      current: {
        value: 1350,
        min: 0.05,
        max: 0.5,
        step: 5,
      },
    },
  },

  [StimulusModuleDict.APWaveform]: {
    name: 'ap_waveform',
    label: 'AP_WAVEFORM',
    description:
      'This protocol is used to check the precise AP waveform. The aim is to get 1-2 APs for higher currents to study the AP properties such as AP amplitude, AP duration, peak time, afterhyperpolarisation, rise-time, fall-time, etc.',
    usedBy: ['current_clamp'],

    defaults: {
      time: {
        delay: 250,
        duration: 50,
        stop_time: 550,
      },

      current: {
        value: 250,
        min: 0.05,
        max: 0.5,
        step: 5,
      },
    },
  },

  [StimulusModuleDict.IV]: {
    name: 'iv',
    label: 'Step (Subthreshold)',
    description:
      'This protocol is used to check the passive properties and the voltage sag. A sequence of current steps, from hyperpolarization to small depolarization, is injected. It is mainly used to calculate the Input resistance of the cell.',
    usedBy: ['current_clamp'],

    defaults: {
      time: {
        delay: 250,
        duration: 3000,
        stop_time: 3500,
      },

      current: {
        value: 3000,
        min: -0.5,
        max: 0.1,
        step: 5,
      },
    },
  },

  [StimulusModuleDict.FirePattern]: {
    name: 'fire_pattern',
    label: 'Step (Fire Pattern)',
    description: `This protocol involves injecting a few long-duration, small and high suprathreshold currents. This protocol and IDREST are used to check cells' electrical firing type (e-type), e.g., continuous, bursting, stuttering and irregular firing.`,
    usedBy: ['current_clamp'],
    defaults: {
      time: {
        delay: 250,
        duration: 3600,
        stop_time: 4100,
      },

      current: {
        value: 3600,
        min: 0.05,
        max: 0.5,
        step: 4,
      },
    },
  },
};

const DEFAULT_SECTION = 'soma[0]';

export function buildDefaultRecordingLocation(color: string = DefaultColor) {
  return {
    section: DEFAULT_SECTION,
    offset: 0.5,
    record_currents: false,
    color,
    origin: NeuronLocationOriginDict.recording,
  };
}

export const DEFAULT_SIMULATION_EXPERIMENTAL_SETUP: SimulationExperimentalSetup = {
  celsius: 34,
  vinit: -73,
  hypamp: 0,
  max_time: 2000,
  time_step: 0.05,
  seed: 100,
};

export const DEFAULT_PROTOCOL = 'idrest';

export const DEFAULT_STIMULUS_CONFIG: StimulusConfig = {
  stimulus_type: 'current_clamp',
  stimulus_protocol: DEFAULT_PROTOCOL,
  amplitudes: [0.05, 0.1625, 0.275, 0.3875, 0.5],
};

export const DEFAULT_CURRENT_INJECTION_CONFIG: TStimulationConfiguration = {
  id: 0,
  config_id: crypto.randomUUID(),
  inject_to: DEFAULT_SECTION,
  stimulus: DEFAULT_STIMULUS_CONFIG,
};

export const PREFIX_STIMULATION_PROTOCOL_CONFIGURATION_SESSION_KEY = 'spc_sk';
export const PREFIX_RECORDING_LOCATION_CONFIGURATION_SESSION_KEY = 'rlc_sk';
export const PREFIX_EXPERIMENTAL_SETUP_CONFIGURATION_SESSION_KEY = 'esc_sk';
export const PREFIX_SYNAPTIC_INPUTS_CONFIGURATION_SESSION_KEY = 'sic_sk';
export const PREFIX_OVERVIEW_CONFIGURATION_SESSION_KEY = 'oc_sk';
export const PREFIX_AMPERAGE_CONFIGURATION_SESSION_KEY = 'ac_sk';
export const PREFIX_FREQUENCY_INPUT_CONFIGURATION_SESSION_KEY = 'fic_sk';

export function getSimulationColor(index: number) {
  return SimulationColors[index % SimulationColors.length];
}

export const SectionTargetMapping = {
  dend: 'Basal dendrites',
  soma: 'Soma',
  apic: 'Apical dendrites',
  basal: 'Basal dendrites',
  axon: 'Axon',
};
