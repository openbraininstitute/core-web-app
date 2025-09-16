import { atomWithReset } from 'jotai/utils';

import { PlotData } from '@/services/bluenaas-single-cell/types';
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
