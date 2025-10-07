import { z } from 'zod';
import isNil from 'lodash/isNil';

import { DefaultColor } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';

export const StimulationMode = {
  CurrentClamp: {
    label: 'Current Clamp',
    value: 'current_clamp',
    enabled: true,
  },
  VoltageClamp: {
    label: 'Voltage Clamp',
    value: 'voltage_clamp',
    enabled: false,
  },
  Conductance: {
    label: 'Conductance',
    value: 'conductance',
    enabled: false,
  },
} as const;
export type TStimulationModeValue = (typeof StimulationMode)[keyof typeof StimulationMode]['value'];
export const StimulationModeDict = Object.fromEntries(
  Object.entries(StimulationMode).map(([name, value]) => [name, value.value])
) as {
  [K in keyof typeof StimulationMode]: (typeof StimulationMode)[K]['value'];
};

export const StimulusModule = {
  APWaveform: {
    label: 'AP Waveform',
    value: 'ap_waveform',
    enabled: true,
  },
  Idrest: {
    label: 'Idrest',
    value: 'idrest',
    enabled: true,
  },
  IV: {
    label: 'IV',
    value: 'iv',
    enabled: true,
  },
  FirePattern: {
    label: 'Fire Pattern',
    value: 'fire_pattern',
    enabled: true,
  },
} as const;
export type TStimulusModuleValue = (typeof StimulusModule)[keyof typeof StimulusModule]['value'];
export const StimulusModuleDict = Object.fromEntries(
  Object.entries(StimulusModule).map(([name, value]) => [name, value.value])
) as {
  [K in keyof typeof StimulusModule]: (typeof StimulusModule)[K]['value'];
};

export type CurrentInjectionGraphRequest = {
  stimulusProtocol: TStimulusModuleValue;
  amplitudes: Array<number>;
};

export type CurrentInjectionGraphResponse = {
  x: Array<number>;
  y: Array<number>;
  name: string;
  amplitude: number;
};

export type TProtocolDetails = {
  description: string;
  name: TStimulusModuleValue;
  label: string;
  usedBy: Array<TStimulationModeValue>;

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

export const SynapseTypeDictionary = {
  Excitatory: {
    id: 'excitatory',
    labe: '',
    value: 110,
  },
  Inhibitory: {
    id: 'inhibitory',
    label: '',
    value: 10,
  },
} as const;

export type TSynapseTypeValue =
  (typeof SynapseTypeDictionary)[keyof typeof SynapseTypeDictionary]['value'];
export type TSynapseTypeKey =
  (typeof SynapseTypeDictionary)[keyof typeof SynapseTypeDictionary]['id'];
export const SynapseTypeDict = Object.fromEntries(
  Object.entries(SynapseTypeDictionary).map(([name, value]) => [name, value.value])
) as {
  [K in keyof typeof SynapseTypeDictionary]: (typeof SynapseTypeDictionary)[K]['value'];
};

export const ExperimentalSetupConfigurationSchema = z.object({
  celsius: z
    .number({ message: 'Please enter a valid numeric value for Temperature (°C).' })
    .min(0, 'Temperature must be between 0 and 50°C')
    .max(50, 'Temperature must be between 0 and 50°C'),
  vinit: z
    .number({ message: 'Please enter a valid numeric value for initial membrane voltage (mV).' })
    .min(-200, 'Initial voltage must be between -200 and 200 mV')
    .max(200, 'Initial voltage must be between -200 and 200 mV'),
  hypamp: z
    .number({ message: 'Please enter a valid numeric value for holding current (nA).' })
    .min(-20, 'Holding current must be between -20 and 20 nA')
    .max(20, 'Holding current must be between -20 and 20 nA'),
  max_time: z
    .number({ message: 'Please enter a valid numeric value for simulation duration (ms).' })
    .min(0, 'Simulation duration must be between 0 and 3000 ms')
    .max(3000, 'Simulation duration must be between 0 and 3000 ms'),
  time_step: z
    .number({ message: 'Please enter a valid numeric value for time step (ms).' })
    .min(0.001, 'Time step must be between 0.001 and 10 ms')
    .max(10, 'Time step must be between 0.001 and 10 ms'),
  seed: z
    .number({ message: 'Please enter a valid numeric value for random seed.' })
    .int()
    .min(0, 'Seed must be a positive integer')
    .max(Infinity, 'Seed must be a positive integer'),
});

export type SimulationExperimentalSetup = z.infer<typeof ExperimentalSetupConfigurationSchema>;
export type SimulationExperimentalSetupKeys = keyof SimulationExperimentalSetup;

export const StimulusConfigSchema = z.object({
  stimulus_type: z.enum(
    [
      StimulationMode.CurrentClamp.value,
      StimulationMode.VoltageClamp.value,
      StimulationMode.Conductance.value,
    ],
    {
      message:
        'Stimulation mode must be one of the following: Current Clamp, Voltage Clamp, Conductance.',
    }
  ),
  stimulus_protocol: z
    .enum(
      [
        StimulusModule.APWaveform.value,
        StimulusModule.Idrest.value,
        StimulusModule.IV.value,
        StimulusModule.FirePattern.value,
      ],
      {
        message:
          'Stimulus protocol must be one of the following: AP Waveform, Idrest, IV, Fire Pattern',
      }
    )
    .nullable(),
  amplitudes: z.union([z.array(z.number()), z.number()], {
    message: 'Amplitudes must be an array of numbers or a single number',
  }),
});

export type StimulusConfig = z.infer<typeof StimulusConfigSchema>;

export const StimulationConfigurationSchema = z.object({
  id: z.number({ message: 'Id cannot be empty' }),
  config_id: z.string().uuid('Cannot be empty'),
  inject_to: z.string({ message: 'Injection target section cannot be empty' }),
  stimulus: StimulusConfigSchema,
});

export type TStimulationConfiguration = z.infer<typeof StimulationConfigurationSchema>;

export const RecordLocationSchema = z.object({
  section: z.string({ message: 'Recording section name is required' }),
  offset: z
    .number({
      message: 'Recording position offset is required and must be a number between 0 and 1',
    })
    .min(
      0,
      'Recording position offset must be between 0 and 1 (0 = start of section, 1 = end of section)'
    )
    .max(
      1,
      'Recording position offset must be between 0 and 1 (0 = start of section, 1 = end of section)'
    ),
  record_currents: z.boolean(),
});

export type RecordLocation = z.infer<typeof RecordLocationSchema>;

export const RecordLocationArraySchema = z.array(RecordLocationSchema);

export type RecordLocationArray = z.infer<typeof RecordLocationArraySchema>;

export const SynapseConfigSchema = z.object({
  id: z.string(),
  config_id: z.string({ message: 'Synapse configuration ID is required' }),
  delay: z.number({ message: 'Synapse delay (ms) is required and must be a number' }),
  duration: z.number({ message: 'Synapse duration (ms) is required and must be a number' }),
  frequency: z
    .union(
      [
        z
          .number({ message: 'Synapse frequency (Hz) must be a positive number' })
          .min(0, 'Synapse frequency must be a positive number'),
        z.array(
          z
            .number({ message: 'Synapse frequencies must be positive numbers' })
            .min(0, 'Synapse frequencies must be positive numbers')
        ),
      ],
      {
        error: (issue) => {
          if (issue.code === 'invalid_union') {
            return 'Synapse frequency must be a single positive number (Hz) or a list of positive numbers if steps are used';
          }
          return 'Synapse frequency must be a single positive number (Hz) or a list of positive numbers if steps are used';
        },
      }
    )
    .refine((val) => !isNil(val), {
      message: 'Synapse frequency is required',
    }),
  weight_scalar: z.number({ message: 'Synapse weight scalar is required and must be a number' }),
  color: z.string({ message: 'Synapse color is required' }).default(DefaultColor).optional(),
});

export const OverviewConfigurationSchema = z.object({
  name: z
    .string({ message: 'The simulation name cannot be empty.' })
    .nonempty({
      message: 'The simulation name cannot be empty.',
    })
    .min(1, 'Please enter a simulation name (minimum 1 character).'),
  description: z.string().optional(),
});

export type OverviewConfiguration = z.infer<typeof OverviewConfigurationSchema>;

export type SynapseConfiguration = z.infer<typeof SynapseConfigSchema>;

export const SynapseConfigurationArraySchema = z.array(SynapseConfigSchema);
export type SynapseConfigurationArray = z.infer<typeof SynapseConfigurationArraySchema>;

export type AmperageStateType = {
  protocol: TStimulusModuleValue;
  start: number;
  end: number;
  stepValue: number;
  computed: Array<number>;
  error: null | string;
};

export type AmperageActionType = {
  type:
    | 'start'
    | 'end'
    | 'stepValue'
    | 'checkConsistency'
    | 'reset-for-protocol'
    | 'constant-value';
  payload: any;
};

export const SimulationType = {
  SingleNeuron: 'single-neuron-simulation',
  SingleNeuronSynaptome: 'synaptome-simulation',
} as const;

export type TSimulationType = (typeof SimulationType)[keyof typeof SimulationType];

export type PlotDataEntry = {
  x: Array<number>;
  y: Array<number>;
  type: 'scatter';
  name: string;
  recording?: string;
  amplitude?: number;
  frequency?: number;
  varyingKey?: string;
  varyingOrder?: number;
  visible?: boolean;
  line?: { color: string };
};

export type PlotData = PlotDataEntry[];

// Frequency input configuration schema
export const FrequencyInputConfigSchema = z.object({
  constantOrSteps: z.enum(['constant', 'step']),
  stepFrequencyState: z
    .object({
      start: z.number({ message: 'Start frequency (Hz) is required and must be a number' }),
      stop: z.number({ message: 'Stop frequency (Hz) is required and must be a number' }),
      step: z.number({ message: 'Number of frequency steps is required and must be a number' }),
    })
    .nullable()
    .refine((value) => value === null || value.start < value.stop, {
      message: 'Start frequency must be less than stop frequency',
      path: ['stepFrequencyState', 'start'],
    }),
});

export type FrequencyInputConfig = z.infer<typeof FrequencyInputConfigSchema>;

// Base amperage schema without refinements
export const AmperageBaseSchema = z.object({
  protocol: z.enum([
    StimulusModule.APWaveform.value,
    StimulusModule.Idrest.value,
    StimulusModule.IV.value,
    StimulusModule.FirePattern.value,
  ]),
  start: z.number({ message: 'Start current amplitude (nA) is required and must be a number' }),
  end: z.number({ message: 'End current amplitude (nA) is required and must be a number' }),
  stepValue: z.number({
    message: 'Number of current amplitude steps is required and must be a number',
  }),
  computed: z.array(z.number()),
  error: z.string().nullable(),
});

// Amperage state schema with conditional validation
export const AmperageStateSchema = AmperageBaseSchema.refine(
  (data) => {
    // If start equals end, it's a constant value (frequency mode) - this is valid
    if (data.start === data.end) {
      return true;
    }
    // Otherwise, start must be less than end (step mode)
    return data.start < data.end;
  },
  {
    message: 'Start current amplitude must be less than end current amplitude',
    path: ['start'],
  }
);

export type AmperageState = z.infer<typeof AmperageStateSchema>;
