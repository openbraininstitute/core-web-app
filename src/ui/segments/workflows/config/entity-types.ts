import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import { EntityGroupDict } from './types';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TEntityTypeMeta } from './types';

/**
 * Presentation metadata for every extended entity type that participates in a
 * workflow. Adding a new type here is the first step before registering a
 * workflow for it in `activities/*.ts`.
 */
export const EntityTypeCatalog: Partial<Record<TExtendedEntitiesTypeDict, TEntityTypeMeta>> = {
  [ExtendedEntitiesTypeDict.IonChannelModel]: {
    value: ExtendedEntitiesTypeDict.IonChannelModel,
    group: EntityGroupDict.Subcellular,
    label: 'Ion channel',
  },
  [ExtendedEntitiesTypeDict.IonChannelModelingCampaign]: {
    value: ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
    group: EntityGroupDict.Subcellular,
    label: 'Ion channel modeling campaign',
  },
  [ExtendedEntitiesTypeDict.IonChannelModelSimulation]: {
    value: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
    group: EntityGroupDict.Subcellular,
    label: 'Ion channel simulation',
  },
  [ExtendedEntitiesTypeDict.Metabolism]: {
    value: ExtendedEntitiesTypeDict.Metabolism,
    group: EntityGroupDict.Subcellular,
    label: 'Metabolism',
  },
  [ExtendedEntitiesTypeDict.NGVUnit]: {
    value: ExtendedEntitiesTypeDict.NGVUnit,
    group: EntityGroupDict.Subcellular,
    label: 'NGV unit',
  },
  [ExtendedEntitiesTypeDict.Memodel]: {
    value: ExtendedEntitiesTypeDict.Memodel,
    group: EntityGroupDict.Cellular,
    label: 'Single neuron',
    title: 'Single neuron',
  },
  [ExtendedEntitiesTypeDict.SingleNeuronSimulation]: {
    value: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
    group: EntityGroupDict.Cellular,
    label: 'Single neuron simulation (legacy)',
    legacy: true,
  },
  [ExtendedEntitiesTypeDict.SingleNeuronSynaptome]: {
    value: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
    group: EntityGroupDict.Cellular,
    label: 'Synaptome (legacy)',
    title: 'Synaptome (legacy)',
    legacy: true,
  },
  [ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation]: {
    value: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
    group: EntityGroupDict.Cellular,
    label: 'Synaptome simulation (legacy)',
    legacy: true,
  },
  [ExtendedEntitiesTypeDict.MemodelCircuit]: {
    value: ExtendedEntitiesTypeDict.MemodelCircuit,
    group: EntityGroupDict.Cellular,
    label: 'Single neuron',
  },
  [ExtendedEntitiesTypeDict.MemodelCircuitSimulation]: {
    value: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
    group: EntityGroupDict.Cellular,
    label: 'Single neuron simulation',
  },
  [ExtendedEntitiesTypeDict.SingleNeuronCircuit]: {
    value: ExtendedEntitiesTypeDict.SingleNeuronCircuit,
    group: EntityGroupDict.Cellular,
    label: 'Synaptome',
  },
  [ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation]: {
    value: ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
    group: EntityGroupDict.Cellular,
    label: 'Synaptome simulation',
  },
  [ExtendedEntitiesTypeDict.PairedNeuronCircuit]: {
    value: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
    group: EntityGroupDict.Circuit,
    label: 'Paired neurons',
  },
  [ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation]: {
    value: ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
    group: EntityGroupDict.Circuit,
    label: 'Paired neurons simulation',
  },
  [ExtendedEntitiesTypeDict.SmallMicrocircuit]: {
    value: ExtendedEntitiesTypeDict.SmallMicrocircuit,
    group: EntityGroupDict.Circuit,
    label: 'Small microcircuit',
  },
  [ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation]: {
    value: ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
    group: EntityGroupDict.Circuit,
    label: 'Small microcircuit simulation',
  },
  [ExtendedEntitiesTypeDict.Microcircuit]: {
    value: ExtendedEntitiesTypeDict.Microcircuit,
    group: EntityGroupDict.Circuit,
    label: 'Microcircuit',
  },
  [ExtendedEntitiesTypeDict.MicrocircuitSimulation]: {
    value: ExtendedEntitiesTypeDict.MicrocircuitSimulation,
    group: EntityGroupDict.Circuit,
    label: 'Microcircuit simulation',
  },
  [ExtendedEntitiesTypeDict.NGVCircuit]: {
    value: ExtendedEntitiesTypeDict.NGVCircuit,
    group: EntityGroupDict.Circuit,
    label: 'NGV circuit',
  },
  [ExtendedEntitiesTypeDict.Circuit]: {
    value: ExtendedEntitiesTypeDict.Circuit,
    group: EntityGroupDict.Circuit,
    label: 'Circuit',
  },
  [ExtendedEntitiesTypeDict.CircuitExtractionCampaign]: {
    value: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
    group: EntityGroupDict.Circuit,
    label: 'Circuit extraction campaign',
  },
  [ExtendedEntitiesTypeDict.EmSynapseMappingCampaign]: {
    value: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
    group: EntityGroupDict.Circuit,
    label: 'Electron Microscopy Circuit',
    title: 'Electron Microscopy Circuit',
    description: 'Build a circuit campaign from an electron-microscopy cell morphology.',
  },
  [ExtendedEntitiesTypeDict.EMCellMesh]: {
    value: ExtendedEntitiesTypeDict.EMCellMesh,
    group: EntityGroupDict.Cellular,
    label: 'EM mesh',
  },
  [ExtendedEntitiesTypeDict.SkeletonizationCampaign]: {
    value: ExtendedEntitiesTypeDict.SkeletonizationCampaign,
    group: EntityGroupDict.Cellular,
    label: 'Skeletonization campaign',
  },
  [ExtendedEntitiesTypeDict.BrainRegion]: {
    value: ExtendedEntitiesTypeDict.BrainRegion,
    group: EntityGroupDict.System,
    label: 'Brain region',
  },
  [ExtendedEntitiesTypeDict.BrainSystems]: {
    value: ExtendedEntitiesTypeDict.BrainSystems,
    group: EntityGroupDict.System,
    label: 'Brain system',
  },
  [ExtendedEntitiesTypeDict.WholeBrain]: {
    value: ExtendedEntitiesTypeDict.WholeBrain,
    group: EntityGroupDict.System,
    label: 'Whole brain',
  },
};
