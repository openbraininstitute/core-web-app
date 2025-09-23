'use client';

import { makeStorageAtomFamily, memoryStorage } from '@/ui/hooks/use-storage-atom-with-validation';
import {
  StimulationConfigurationSchema,
  ExperimentalSetupConfigurationSchema,
  RecordLocationArraySchema,
  SynapseConfigurationArraySchema,
  OverviewConfigurationSchema,
  FrequencyInputConfigSchema,
  AmperageStateSchema,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import {
  DEFAULT_RECORDING_LOCATION,
  DEFAULT_SIMULATION_EXPERIMENTAL_SETUP,
  DEFAULT_CURRENT_INJECTION_CONFIG,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

const safeStorage: Storage = typeof window !== 'undefined' ? sessionStorage : memoryStorage;

export const StimulationConfigurationAtomFamily = makeStorageAtomFamily(
  StimulationConfigurationSchema,
  DEFAULT_CURRENT_INJECTION_CONFIG,
  safeStorage
);

export const ExperimentalSetupConfigurationAtomFamily = makeStorageAtomFamily(
  ExperimentalSetupConfigurationSchema,
  DEFAULT_SIMULATION_EXPERIMENTAL_SETUP,
  safeStorage
);

export const RecordLocationConfigurationAtomFamily = makeStorageAtomFamily(
  RecordLocationArraySchema,
  [DEFAULT_RECORDING_LOCATION],
  safeStorage
);

export const SynaptomeConfigurationAtomFamily = makeStorageAtomFamily(
  SynapseConfigurationArraySchema,
  [],
  safeStorage
);

export const OverviewConfigurationAtomFamily = makeStorageAtomFamily(
  OverviewConfigurationSchema,
  { name: '', description: undefined },
  safeStorage
);

export const FrequencyInputConfigurationAtomFamily = makeStorageAtomFamily(
  FrequencyInputConfigSchema,
  { constantOrSteps: 'constant', stepFrequencyState: null },
  safeStorage
);

export const AmperageStateAtomFamily = makeStorageAtomFamily(
  AmperageStateSchema,
  {
    protocol: 'idrest',
    start: 40,
    end: 120,
    stepValue: 3,
    computed: [40, 80, 120],
    error: null,
  },
  safeStorage
);
