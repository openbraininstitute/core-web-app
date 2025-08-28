'use client';

export const ExperimentStep = {
  Info: 'info',
  SynapticInputs: 'synaptic-inputs',
  ExperimentalSetup: 'experimental-setup',
  StimulationProtocol: 'stimulation-protocol',
  Recording: 'recording',
} as const;

export type ExperimentStepKeys = (typeof ExperimentStep)[keyof typeof ExperimentStep];
