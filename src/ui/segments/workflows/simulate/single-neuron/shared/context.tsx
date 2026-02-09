'use client';

import { atomWithReset } from 'jotai/utils';
import { atomFamily } from 'jotai-family';

import type { PlotData } from '@/services/bluenaas-single-cell/types';

import { getSimulationColor } from '@/constants/simulate/single-neuron';
import {
  makeStorageAtomWithValidationFamily,
  safeStorage,
} from '@/ui/hooks/use-storage-atom-with-validation';
import {
  buildDefaultRecordingLocation,
  DEFAULT_CURRENT_INJECTION_CONFIG,
  DEFAULT_SIMULATION_EXPERIMENTAL_SETUP,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import {
  AmperageStateSchema,
  ExperimentalSetupConfigurationSchema,
  FrequencyInputConfigSchema,
  NeuronLocationArraySchema,
  OverviewConfigurationSchema,
  StimulationConfigurationSchema,
  SynapseConfigurationArraySchema,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/types';

export const StimulationConfigurationAtomFamily = makeStorageAtomWithValidationFamily(
  StimulationConfigurationSchema,
  DEFAULT_CURRENT_INJECTION_CONFIG,
  safeStorage
);

export const ExperimentalSetupConfigurationAtomFamily = makeStorageAtomWithValidationFamily(
  ExperimentalSetupConfigurationSchema,
  DEFAULT_SIMULATION_EXPERIMENTAL_SETUP,
  safeStorage
);

export const RecordLocationConfigurationAtomFamily = makeStorageAtomWithValidationFamily(
  NeuronLocationArraySchema,
  [buildDefaultRecordingLocation(getSimulationColor(0))],
  safeStorage
);

export const SynaptomeConfigurationAtomFamily = makeStorageAtomWithValidationFamily(
  SynapseConfigurationArraySchema,
  [],
  safeStorage
);

export const OverviewConfigurationAtomFamily = makeStorageAtomWithValidationFamily(
  OverviewConfigurationSchema,
  { name: '', description: undefined },
  safeStorage
);

export const FrequencyInputConfigurationAtomFamily = makeStorageAtomWithValidationFamily(
  FrequencyInputConfigSchema,
  { constantOrSteps: 'constant', stepFrequencyState: null },
  safeStorage
);

export const AmperageStateAtomFamily = makeStorageAtomWithValidationFamily(
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
