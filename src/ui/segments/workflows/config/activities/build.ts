import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { emSynapseMappingActivityFlag } from '@/features/feature-flags';
import { SchemaNameDict } from '@/features/scan-config/types';
import { buildEmSynapseMappingWorkflow } from '@/features/scan-config/workflow/definitions/build-em-synapse-mapping';
import {
  buildEmDenseMorphologyLoader,
  buildMemodelLoader,
} from '@/features/scan-config/workflow/loaders/em-dense-morphology-loader';
import { EM_DENSE_RECONSTRUCTION_DATASET_TYPE } from '@/ui/segments/workflows/browse/prerequisite/em-dataset-cards.constants';
import { EmSynapseMappingDatasetPrerequisiteCards } from '@/ui/segments/workflows/browse/prerequisite/em-synapse-mapping-dataset-cards';

import { buildEmSynapseMappingConfigureBinding } from '../scan-config-binding';
import { WorkflowBrowseDefaults, WorkflowStagePresets } from '../types';

import type { TBrowsePrerequisite } from '@/ui/segments/workflows/browse/browse-config';
import type { IWorkflowDescriptor } from '../types';

const emSynapseMappingPrerequisite: TBrowsePrerequisite = {
  entityType: EM_DENSE_RECONSTRUCTION_DATASET_TYPE,
  label: 'Choose an em-dense reconstruction dataset',
  required: true,
  shareKey: EM_DENSE_RECONSTRUCTION_DATASET_TYPE,
  autoContinueOnSelect: true,
  presentation: { kind: 'custom', render: EmSynapseMappingDatasetPrerequisiteCards },
};

export const BuildWorkflows: readonly IWorkflowDescriptor[] = [
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.DirectConfigure,
    sourceType: ExtendedEntitiesTypeDict.Memodel,
    targetType: ExtendedEntitiesTypeDict.Memodel,
    order: 1,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.DirectConfigure,
    sourceType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
    order: 2,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.DirectConfigure,
    sourceType: ExtendedEntitiesTypeDict.IonChannelModel,
    targetType: ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
    order: 3,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.MemodelCircuit,
    targetType: ExtendedEntitiesTypeDict.MemodelCircuit,
    order: 4,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
    targetType: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
    hasMultipleSources: true,
    label: 'Electron microscopy circuit (beta)',
    breadcrumb: {
      root: 'Electron microscopy circuit (beta) build',
      steps: {
        prerequisite: 'Select electron microscopy dense reconstruction dataset',
        selection: 'Select entities',
      },
    },
    scanConfig: {
      definition: buildEmSynapseMappingWorkflow,
      schemaName: SchemaNameDict.EMSynapseMappingScanConfig,
      configureBinding: buildEmSynapseMappingConfigureBinding(),
    },
    requireFilters: false,
    requireSpecies: false,
    order: 5,
    configurationInputs: [
      {
        type: ExtendedEntitiesTypeDict.UniversalCellMorphology,
        label: 'Cell morphology',
        required: true,
      },
      {
        type: ExtendedEntitiesTypeDict.Memodel,
        label: 'ME-model',
        required: true,
      },
    ],
    // both inputs are scoped to one EMDenseReconstructionDataset: the shared `shareKey`
    // means the user picks the dataset once and it applies to the cell-morphology and the
    // ME-model tables alike, each type still loads its own rows from that dataset
    browseConfig: {
      [ExtendedEntitiesTypeDict.UniversalCellMorphology]: {
        prerequisite: emSynapseMappingPrerequisite,
        loader: {
          kind: 'custom',
          build: buildEmDenseMorphologyLoader,
        },
      },
      [ExtendedEntitiesTypeDict.Memodel]: {
        prerequisite: emSynapseMappingPrerequisite,
        loader: {
          kind: 'custom',
          build: buildMemodelLoader,
        },
      },
    },
    disabled: false,
    requiredFeatures: [emSynapseMappingActivityFlag.key],
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
    targetType: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
    order: 7,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.SmallMicrocircuit,
    targetType: ExtendedEntitiesTypeDict.SmallMicrocircuit,
    order: 8,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.Microcircuit,
    targetType: ExtendedEntitiesTypeDict.Microcircuit,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.Metabolism,
    targetType: ExtendedEntitiesTypeDict.Metabolism,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.NGVUnit,
    targetType: ExtendedEntitiesTypeDict.NGVUnit,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.NGVCircuit,
    targetType: ExtendedEntitiesTypeDict.NGVCircuit,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.BrainRegion,
    targetType: ExtendedEntitiesTypeDict.BrainRegion,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.BrainSystems,
    targetType: ExtendedEntitiesTypeDict.BrainSystems,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.WholeBrain,
    targetType: ExtendedEntitiesTypeDict.WholeBrain,
    disabled: true,
  },
];
