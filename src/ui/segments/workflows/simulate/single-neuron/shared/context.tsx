'use client';

import { atomFamily, atomWithReset } from 'jotai/utils';

import { makeStorageAtomFamily, memoryStorage } from '@/ui/hooks/use-storage-atom-with-validation';
import {
  StimulationConfigurationSchema,
  ExperimentalSetupConfigurationSchema,
  NeuronLocationArraySchema,
  SynapseConfigurationArraySchema,
  OverviewConfigurationSchema,
  FrequencyInputConfigSchema,
  AmperageStateSchema,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';
import {
  buildDefaultRecordingLocation,
  DEFAULT_SIMULATION_EXPERIMENTAL_SETUP,
  DEFAULT_CURRENT_INJECTION_CONFIG,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { getSimulationColor } from '@/constants/simulate/single-neuron';

import type { PlotData } from '@/services/bluenaas-single-cell/types';

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
  NeuronLocationArraySchema,
  [buildDefaultRecordingLocation(getSimulationColor(0))],
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
    start: 0.05,
    end: 0.5,
    stepValue: 5,
    computed: [0.05, 0.1625, 0.275, 0.3875, 0.5],
    error: null,
  },
  safeStorage
);

export const neuronSectionNamesAtomFamily = atomFamily((key: string) => {
  const childAtom = atomWithReset<string[]>([]);
  childAtom.debugLabel = `morphology-section-atom-${key}`;
  return childAtom;
});

export const genericSingleNeuronSimulationPlotDataAtomFamily = atomFamily((key: string) => {
  const childAtom = atomWithReset<Record<string, PlotData> | null>(null);
  childAtom.debugLabel = `generic-single-neuron-simulation-plot-data-atom-family-${key}`;
  return childAtom;
});

export const SimulationStatus = {
  LAUNCHED: 'launched',
  EXECUTED: 'executed',
  SAVING: 'saving',
  SAVED: 'saved',
  ERROR: 'error',
} as const;

export type TSimulationStatus = (typeof SimulationStatus)[keyof typeof SimulationStatus];

export const simulationStatusAtomFamily = atomFamily((key: string) => {
  const childAtom = atomWithReset<{
    status: TSimulationStatus | null;
    description?: string;
  } | null>(null);
  childAtom.debugLabel = `simulation-status-atom-family-${key}`;
  return childAtom;
});
