// TODO: this types should be removed for the new entity configuration types
export enum DataType {
  ExperimentalBoutonDensity = `ExperimentalBoutonDensity`,
  ExperimentalNeuronDensity = `ExperimentalNeuronDensity`,
  ExperimentalElectroPhysiology = `ExperimentalElectroPhysiology`,
  ExperimentalSynapsePerConnection = `ExperimentalSynapsePerConnection`,
  ExperimentalNeuronMorphology = `ExperimentalNeuronMorphology`,
  SimulationCampaign = `SimulationCampaign`,
  CircuitEModel = 'CircuitEModel',
  CircuitMEModel = 'CircuitMEModel',
  SingleNeuronSimulation = 'SingleNeuronSimulation',
  SingleNeuronSynaptome = 'SingleNeuronSynaptome',
  SingleNeuronSynaptomeSimulation = 'SynaptomeSimulation',
  Circuit = 'Circuit',
}

export type TDataType = `${DataType}`;

export const DEFAULT_CHECKLIST_RENDER_LENGTH = 8;
export const PAGE_SIZE = 30;
export const PAGE_NUMBER = 1;
