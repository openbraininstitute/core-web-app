import { z } from 'zod';

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
    .number({ message: 'Temperature is required' })
    .min(0, 'Temperature must be between 0 and 50°C')
    .max(50, 'Temperature must be between 0 and 50°C'),
  vinit: z
    .number({ message: 'Initial voltage is required' })
    .min(-200, 'Initial voltage must be between -200 and 200 mV')
    .max(200, 'Initial voltage must be between -200 and 200 mV'),
  hypamp: z
    .number({ message: 'Holding current is required' })
    .min(-20, 'Holding current must be between -20 and 20 nA')
    .max(20, 'Holding current must be between -20 and 20 nA'),
  max_time: z
    .number({ message: 'Simulation duration is required' })
    .min(0, 'Simulation duration must be between 0 and 3000 ms')
    .max(3000, 'Simulation duration must be between 0 and 3000 ms'),
  time_step: z
    .number({ message: 'Time step is required' })
    .min(0.001, 'Time step must be between 0.001 and 10 ms')
    .max(10, 'Time step must be between 0.001 and 10 ms'),
  seed: z
    .number({ message: 'Seed is required' })
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
        'Stimulation mode must be one of the following: Current Clamp, Voltage Clamp, Conductance',
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
  section: z.string({ message: 'Section cannot be empty' }),
  offset: z
    .number({ message: 'Offset must be a positive number' })
    .min(0, 'Offset must be a positive number')
    .max(1, 'Offset must be between 0 and 1'),
  record_currents: z.boolean(),
});

export type RecordLocation = z.infer<typeof RecordLocationSchema>;

export const RecordLocationArraySchema = z.array(RecordLocationSchema);

export type RecordLocationArray = z.infer<typeof RecordLocationArraySchema>;

export const SynapseConfigSchema = z.object({
  id: z.string(),
  config_id: z.string(),
  delay: z.number(),
  duration: z.number(),
  frequency: z.union([z.number(), z.array(z.number())]),
  weight_scalar: z.number(),
  color: z.string(),
});

export const OverviewConfigurationSchema = z.object({
  name: z.string({ message: 'Name is required' }).min(1, 'Name is required'),
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
      start: z.number(),
      stop: z.number(),
      step: z.number(),
    })
    .nullable(),
});

export type FrequencyInputConfig = z.infer<typeof FrequencyInputConfigSchema>;

// Amperage state schema - minimal addition for persistence
export const AmperageStateSchema = z.object({
  protocol: z.enum([
    StimulusModule.APWaveform.value,
    StimulusModule.Idrest.value,
    StimulusModule.IV.value,
    StimulusModule.FirePattern.value,
  ]),
  start: z.number(),
  end: z.number(),
  stepValue: z.number(),
  computed: z.array(z.number()),
  error: z.string().nullable(),
});

export type AmperageState = z.infer<typeof AmperageStateSchema>;
