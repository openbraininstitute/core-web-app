import { atomFamily, atomWithReset } from 'jotai/utils';

import type { PlotData } from '@/services/bluenaas-single-cell/types';
import { SimulationStep, SimulationStepsTracker } from '@/types/small-scale-simulator/common';

export const defaultSteps: Array<SimulationStep> = [
  { title: 'Experimental setup', status: undefined },
  { title: 'Synaptic inputs', status: undefined },
  { title: 'Stimulation protocol', status: undefined },
  { title: 'Recording', status: undefined },
  { title: 'Results', status: 'wait' },
];

export const simulateStepTrackerAtom = atomWithReset<SimulationStepsTracker>({
  steps: defaultSteps,
  current: { title: 'Experimental setup', status: undefined },
});

export const secNamesAtom = atomWithReset<string[]>([]);

export const simulationStatusAtom = atomWithReset<{
  status: null | 'launched' | 'finished' | 'error';
  description?: string;
} | null>(null);

export const stimulusPreviewPlotDataAtom = atomWithReset<PlotData | null>(null);

export const genericSingleNeuronSimulationPlotDataAtom = atomWithReset<Record<
  string,
  PlotData
> | null>(null);
genericSingleNeuronSimulationPlotDataAtom.debugLabel = 'genericSingleNeuronSimulationPlotDataAtom';

export const genericSingleNeuronSimulationPlotDataAtomFamily = atomFamily((key: string) => {
  const childAtom = atomWithReset<Record<string, PlotData> | null>(null);
  childAtom.debugLabel = `generic-single-neuron-simulation-plot-data-atom-family-${key}`;
  return childAtom;
});

export const simulationStatusAtomFamily = atomFamily((key: string) => {
  const childAtom = atomWithReset<{
    status: null | 'launched' | 'finished' | 'error';
    description?: string;
  } | null>(null);
  childAtom.debugLabel = `simulation-status-atom-family-${key}`;
  return childAtom;
});
