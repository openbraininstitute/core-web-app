import range from 'es-toolkit/compat/range';
import round from 'es-toolkit/compat/round';

import {
  CurrentInjectionSimulationConfig,
  SimulationExperimentalSetup,
  StimulusDropdownInfo,
  StimulusTypeOption,
  ProtocolDetails,
  RecordLocation,
  StimulusConfig,
  StimulusModule,
  SynapseConfig,
} from '@/types/small-scale-simulator/single-neuron';

import type { TSingleNeuronSynaptomeConfiguration } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { SynapseType } from '@/components/neuron-viewer/hooks/events';

export const stimulusTypeParams: StimulusDropdownInfo & {
  options: StimulusTypeOption[];
} = {
  name: 'Type',
  value: 'current_clamp',
  options: [
    { label: 'Current clamp', value: 'current_clamp' },
    // { label: 'Voltage clamp', value: 'voltage_clamp' },
    // { label: 'Conductance', value: 'conductance' },
  ],
};

// These  values are based on discussions in this ticket - https://bbpteam.epfl.ch/project/issues/browse/BBPP134-2099
// The default value for `step` is reduced for some protocols to reduce the number of simulation processes.
export const PROTOCOL_DETAILS: Record<StimulusModule, ProtocolDetails> = {
  idrest: {
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

  ap_waveform: {
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

  iv: {
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

  fire_pattern: {
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

export const DEFAULT_RECORDING_LOCATION: RecordLocation = {
  section: DEFAULT_SECTION,
  offset: 0.5,
  record_currents: false,
};

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
  amplitudes: [40, 80, 120],
};

export const DEFAULT_CURRENT_INJECTION_CONFIG: CurrentInjectionSimulationConfig = {
  id: 0,
  config_id: crypto.randomUUID(),
  inject_to: DEFAULT_SECTION,
  stimulus: DEFAULT_STIMULUS_CONFIG,
};

export const SYNAPSE_CODE_TO_TYPE: Record<number, SynapseType> = {
  110: 'excitatory',
  10: 'inhibitory',
};

export const getDefaultSynapseConfig = (
  synapsePlacementConfig?: Array<TSingleNeuronSynaptomeConfiguration>
): SynapseConfig | null => {
  if (synapsePlacementConfig) {
    return {
      id: synapsePlacementConfig[0].id,
      config_id: crypto.randomUUID(),
      color: synapsePlacementConfig[0].color,
      delay: 100,
      duration: 2000,
      frequency: 20,
      weight_scalar: 1,
    };
  }
  return null;
};

export const SIMULATION_COLORS = [
  '#32C14E',
  '#8AB5FF',
  '#DC51FF',
  '#B3A26E',
  '#F02124',
  '#32D4C1',
  '#814BFF',
  '#E3F750',
  '#D653C5',
  '#AD7A14',
  '#87BB74',
  '#DFC6AE',
  '#5778FF',
  '#81ADE0',
  '#99FF80',
  '#FFCF30',
  '#5193BA',
  '#DD63CF',
];

export function getSimulationColor(index: number) {
  return SIMULATION_COLORS[index % SIMULATION_COLORS.length];
}

// Each amperage starts a new simulation process in the server. To limit resource consumption, we put a maximum threshold on number of amperages a simulation can have.
export const MAX_AMPERAGE_STEPS = 15;

export function calculateRangeOutput(start: number, end: number, step: number) {
  if (step <= 0) return [];
  if (start === end) return [start];

  let values: number[];

  if (step === 1) {
    values = [(start + end) / 2];
  } else if (step === 2) {
    values = [start, end];
  } else {
    const steps = (end - start) / (step - 1);
    values = [...range(start, end, steps), end];
  }

  return values.map((v) => roundToSignificantFigures(v, 4));
}

export function roundToSignificantFigures(num: number, sigFigs: number) {
  if (num === 0) return 0;
  const multiplier = 10 ** (sigFigs - Math.ceil(Math.log10(Math.abs(num))));
  return round(num * multiplier) / multiplier;
}
