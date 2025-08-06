// TODO: this types should be renamed to "ExtendedTypes"
// TODO: rename the old ones to entity core naming and update virtual-lab-api in the same time
// NOTE: There are now various nested types associated with a single parent type in EntityCore.
// We should enable selection and data manipulation for both the nested types and those directly defined in EntityCore.
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
  SmallMicrocircuit = 'SmallMicroCircuit',
  Microcircuit = 'MicroCircuit',
  PairedNeuronCircuit = 'PairedNeuronCircuit',
  PairedNeuronCircuitSimulation = 'PairedNeuronCircuitSimulation',
  SmallMicrocircuitSimulation = 'SmallMicrocircuitSimulation',
}

export type TDataType = `${DataType}`;

export const DEFAULT_CHECKLIST_RENDER_LENGTH = 8;
export const PAGE_SIZE = 30;
export const PAGE_NUMBER = 1;
