import { DataType } from '@/constants/explore-section/list-views';

enum VirtualLabPlanType {
  Entry = 'Cellular lab',
  Beginner = 'Circuit lab',
  Intermediate = 'System lab',
}

type MockBilling = {
  organization: string;
  firstname: string;
  lastname: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
};

export enum SimulationType {
  IonChannel = 'ion-channel',
  PairedNeuron = 'paired-neuron',
  BrainRegions = 'brain-regions',
  SingleNeuron = 'single-neuron',
  Microcircuit = 'microcircuit',
  BrainSystems = 'brain-systems',
  Synaptome = 'synaptome',
  NeuroGliaVasculature = 'neuro-glia-vasculature',
  WholeBrain = 'whole-brain',
}

// maps each simulation scope to a data type
const SimulationScopeToDataType = {
  [SimulationType.SingleNeuron]: DataType.SingleNeuronSimulation,
  [SimulationType.IonChannel]: null,
  [SimulationType.PairedNeuron]: null,
  [SimulationType.Synaptome]: DataType.SingleNeuronSynaptomeSimulation,
  [SimulationType.Microcircuit]: null,
  [SimulationType.NeuroGliaVasculature]: null,
  [SimulationType.BrainRegions]: null,
  [SimulationType.BrainSystems]: null,
  [SimulationType.WholeBrain]: null,
};

// Nexus resource `@type` that should be shown in project -> build tab.
const SimulationScopeToModelType = {
  [SimulationType.SingleNeuron]: DataType.CircuitMEModel,
  [SimulationType.Synaptome]: DataType.SingleNeuronSynaptome,
  [SimulationType.IonChannel]: null,
  [SimulationType.PairedNeuron]: null,
  [SimulationType.Microcircuit]: null,
  [SimulationType.NeuroGliaVasculature]: null,
  [SimulationType.BrainRegions]: null,
  [SimulationType.BrainSystems]: null,
  [SimulationType.WholeBrain]: null,
};

interface VirtualLabPlanDefinition {
  id: number;
  name: string;
  features: Record<string, string[]>;
  price: number;
}
