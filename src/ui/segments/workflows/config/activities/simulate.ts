import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { IWorkflowDescriptor } from '../types';

export const SimulateWorkflows: readonly IWorkflowDescriptor[] = [
  {
    sourceType: ExtendedEntitiesTypeDict.Memodel,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Memodel }],
    order: 1,
    disabled: false,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.SingleNeuronSynaptome }],
    order: 2,
    disabled: false,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.IonChannelModel,
    targetType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.IonChannelModel }],
    label: 'Ion channel (beta)',
    order: 3,
    disabled: false,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.MemodelCircuit,
    targetType: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.MemodelCircuit }],
    order: 4,
    disabled: false,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.SingleNeuronCircuit,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.SingleNeuronCircuit }],
    order: 5,
    disabled: false,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
    targetType: ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.PairedNeuronCircuit }],
    order: 6,
    disabled: false,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.SmallMicrocircuit,
    targetType: ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.SmallMicrocircuit }],
    order: 7,
    disabled: false,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.Microcircuit,
    targetType: ExtendedEntitiesTypeDict.MicrocircuitSimulation,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Microcircuit }],
    disabled: false,
    order: 8,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.BrainRegion,
    targetType: ExtendedEntitiesTypeDict.RegionCircuitSimulation,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.BrainRegion }],
    disabled: false,
    order: 9,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.Metabolism,
    targetType: ExtendedEntitiesTypeDict.Metabolism,
    disabled: true,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.NGVUnit,
    targetType: ExtendedEntitiesTypeDict.NGVUnit,
    disabled: true,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.NGVCircuit,
    targetType: ExtendedEntitiesTypeDict.NGVCircuit,
    disabled: true,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.BrainSystems,
    targetType: ExtendedEntitiesTypeDict.BrainSystems,
    disabled: true,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.WholeBrain,
    targetType: ExtendedEntitiesTypeDict.WholeBrain,
    disabled: true,
  },
];
