import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { IWorkflowDescriptor } from '../types';

/**
 * Workflows available under the Build activity. Each descriptor's `sourceType`
 * is the entity the user is building; `targetType` is what gets produced (for
 * most entities this is the same, except for Ion channel whose build produces
 * an IonChannelModelingCampaign).
 *
 * Build workflows usually don't require picking an existing entity at the
 * configuration step, so `configurationInputs` is left empty.
 */
export const BuildWorkflows: readonly IWorkflowDescriptor[] = [
  {
    sourceType: ExtendedEntitiesTypeDict.Memodel,
    targetType: ExtendedEntitiesTypeDict.Memodel,
    order: 1,
    disabled: false,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
    order: 2,
    disabled: false,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.IonChannelModel,
    targetType: ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
    order: 3,
    disabled: false,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.UniversalCellMorphology,
    targetType: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
    label: 'Electron Microscopy Synaptome',
    needsBrowse: true,
    order: 4,
    configurationInputs: [
      {
        type: ExtendedEntitiesTypeDict.UniversalCellMorphology,
        required: true,
        multiple: false,
        filters: {
          has_segmented_spines: true,
        },
      },
    ],
    disabled: false,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.MemodelCircuit,
    targetType: ExtendedEntitiesTypeDict.MemodelCircuit,
    order: 5,
    disabled: true,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.SingleNeuronCircuit,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronCircuit,
    order: 6,
    disabled: false,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
    targetType: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
    order: 7,
    disabled: true,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.SmallMicrocircuit,
    targetType: ExtendedEntitiesTypeDict.SmallMicrocircuit,
    order: 8,
    disabled: true,
  },
  {
    sourceType: ExtendedEntitiesTypeDict.Microcircuit,
    targetType: ExtendedEntitiesTypeDict.Microcircuit,
    disabled: true,
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
    sourceType: ExtendedEntitiesTypeDict.BrainRegion,
    targetType: ExtendedEntitiesTypeDict.BrainRegion,
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
