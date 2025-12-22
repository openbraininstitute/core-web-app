import { StimulusModule } from './single-neuron';

export type CurrentInjectionGraphRequest = {
  stimulusProtocol: StimulusModule;
  amplitudes: number[];
};

export type CurrentInjectionGraphResponse = {
  x: number[];
  y: number[];
  name: string;
  amplitude: number;
};
