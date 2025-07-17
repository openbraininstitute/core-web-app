import { StepsProps } from 'antd/lib/steps';

import { EntitySlugValue } from '@/entity-configuration/domain/slug';

export type SimulationType = Extract<
  EntitySlugValue,
  'single-neuron-simulation' | 'synaptome-simulation'
>;

export type SimulationStepTitle =
  | 'Experimental setup'
  | 'Synaptic inputs'
  | 'Stimulation protocol'
  | 'Recording'
  | 'Results';

export type SimulationStep = {
  title: SimulationStepTitle;
  status?: StepsProps['status'];
};

export type SimulationStepsTracker = {
  steps: Array<SimulationStep>;
  current: SimulationStep;
};
