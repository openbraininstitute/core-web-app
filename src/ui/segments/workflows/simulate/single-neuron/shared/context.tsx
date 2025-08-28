'use client';

import { makeStorageAtomFamily, memoryStorage } from '@/ui/hooks/use-storage-atom-with-validation';
import {
  StimulationSimulationConfigSchema,
  SimulationExperimentalSetupSchema,
  RecordLocationArraySchema,
  SynapseConfigArraySchema,
  OverviewConfigSchema,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import {
  DEFAULT_RECORDING_LOCATION,
  DEFAULT_SIMULATION_EXPERIMENTAL_SETUP,
  DEFAULT_CURRENT_INJECTION_CONFIG,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

const safeStorage: Storage = typeof window !== 'undefined' ? sessionStorage : memoryStorage;

export const StimulationProtocolConfigurationAtomFamily = makeStorageAtomFamily(
  StimulationSimulationConfigSchema,
  DEFAULT_CURRENT_INJECTION_CONFIG,
  safeStorage
);

export const ExperimentalSetupConfigurationAtomFamily = makeStorageAtomFamily(
  SimulationExperimentalSetupSchema,
  DEFAULT_SIMULATION_EXPERIMENTAL_SETUP,
  safeStorage
);

export const RecordLocationConfigurationAtomFamily = makeStorageAtomFamily(
  RecordLocationArraySchema,
  [DEFAULT_RECORDING_LOCATION],
  safeStorage
);

export const SynaptomeConfigurationAtomFamily = makeStorageAtomFamily(
  SynapseConfigArraySchema,
  [],
  safeStorage
);

export const OverviewConfigurationAtomFamily = makeStorageAtomFamily(
  OverviewConfigSchema,
  { name: '', description: undefined },
  safeStorage
);
