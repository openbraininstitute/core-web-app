import { getCircuits } from '@/api/entitycore/queries/model/circuit';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { extracellularRecordingArrayBuildFlag } from '@/features/feature-flags/flags';
import { SchemaNameDict } from '@/features/scan-config/types';
import { buildCircuitSynapticPhysiologyWorkflow } from '@/features/scan-config/workflow/definitions/build-circuit-synaptic-physiology';
import { buildEmSynapseMappingWorkflow } from '@/features/scan-config/workflow/definitions/build-em-synapse-mapping';
import { createExtracellularRecordingArrayWorkflow } from '@/features/scan-config/workflow/definitions/create-extracellular-recording-array';
import {
  buildEmDenseMorphologyLoader,
  buildMemodelLoader,
} from '@/features/scan-config/workflow/loaders/em-dense-morphology-loader';
import { EM_DENSE_RECONSTRUCTION_DATASET_TYPE } from '@/ui/segments/workflows/browse/prerequisite/em-dataset-cards.constants';
import { EmSynapseMappingDatasetPrerequisiteCards } from '@/ui/segments/workflows/browse/prerequisite/em-synapse-mapping-dataset-cards';

import {
  buildCircuitSynapticPhysiologyConfigureBinding,
  buildEmSynapseMappingConfigureBinding,
  createExtracellularRecordingArrayConfigureBinding,
} from '../scan-config-binding';
import { WorkflowBrowseDefaults, WorkflowStagePresets } from '../types';

import type {
  TBrowsePrerequisite,
  TWorkflowBrowseConfig,
} from '@/ui/segments/workflows/browse/browse-config';
import type { IWorkflowDescriptor } from '../types';

const emSynapseMappingPrerequisite: TBrowsePrerequisite = {
  entityType: EM_DENSE_RECONSTRUCTION_DATASET_TYPE,
  label: 'Choose an em-dense reconstruction dataset',
  required: true,
  shareKey: EM_DENSE_RECONSTRUCTION_DATASET_TYPE,
  autoContinueOnSelect: true,
  presentation: { kind: 'custom', render: EmSynapseMappingDatasetPrerequisiteCards },
};

// circuit scales offered as the source of scale-capped circuit builds (extracellular recording
// array, circuit synaptic physiology): limited to single-neuron up to small microcircuit.
// stays aligned with the ScanConfigBuildWorkflow scale filter dropdown in
// `entity-configuration/definitions/fields-defs/model.tsx`.
const SMALL_SCALE_CIRCUIT_BUILD_SCALES: string[] = [
  CircuitScaleDictionary.Single,
  CircuitScaleDictionary.PairNeuron,
  CircuitScaleDictionary.SmallMicrocircuit,
];

/**
 * resolves `scale__in` for a scale-capped circuit browse: honour scales the user picked in the
 * filter panel but keep them within the allowed set; otherwise fall back to the full allowed set
 * keeps the workflow's scale ceiling while letting the user narrow within it
 */
function resolveSmallScaleCircuitBuildScales(filters: Record<string, unknown>): string[] {
  const requested = filters.scale__in;
  if (Array.isArray(requested)) {
    const within = requested.filter(
      (scale): scale is string =>
        typeof scale === 'string' && SMALL_SCALE_CIRCUIT_BUILD_SCALES.includes(scale)
    );
    if (within.length > 0) return within;
  }
  return SMALL_SCALE_CIRCUIT_BUILD_SCALES;
}

/** browse config for a circuit input capped to single → small-microcircuit scales */
const smallScaleCircuitBrowseConfig = {
  [ExtendedEntitiesTypeDict.Circuit]: {
    loader: {
      kind: 'custom' as const,
      build:
        () =>
        ({ filters, withFacets, context }) =>
          getCircuits({
            context,
            withFacets,
            filters: { ...filters, scale__in: resolveSmallScaleCircuitBuildScales(filters) },
          }),
      facets: {
        build:
          () =>
          ({ filters, context }) =>
            getCircuits({
              context,
              withFacets: true,
              filters: { ...filters, scale__in: resolveSmallScaleCircuitBuildScales(filters) },
            }).then((response) => response?.facets),
      },
    },
  },
} satisfies TWorkflowBrowseConfig;

export const BuildWorkflows: readonly IWorkflowDescriptor[] = [
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.DirectConfigure,
    sourceType: ExtendedEntitiesTypeDict.IonChannelModel,
    targetType: ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
    order: 1,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.DirectConfigure,
    sourceType: ExtendedEntitiesTypeDict.Memodel,
    targetType: ExtendedEntitiesTypeDict.Memodel,
    order: 2,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
    targetType: ExtendedEntitiesTypeDict.EmSynapseMappingCampaign,
    hasMultipleSources: true,
    label: 'Electron microscopy circuit',
    breadcrumb: {
      root: 'Electron microscopy circuit build',
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
    order: 3,
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
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.Circuit,
    targetType: ExtendedEntitiesTypeDict.ExtracellularRecordingArrayCampaign,
    label: 'Extracellular recording array',
    breadcrumb: {
      root: 'Extracellular recording array build',
      steps: {
        selection: 'Select a circuit',
      },
    },
    scanConfig: {
      definition: createExtracellularRecordingArrayWorkflow,
      schemaName: SchemaNameDict.ExtracellularRecordingArrayScanConfig,
      configureBinding: createExtracellularRecordingArrayConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Circuit }],
    requireFilters: true,
    // source circuits are limited to single-neuron up to small-microcircuit scale; a user scale
    // filter is honoured but constrained to that allowed set (see resolveSmallScaleCircuitBuildScales)
    browseConfig: smallScaleCircuitBrowseConfig,
    order: 4,
    disabled: false,
    requiredFeatures: [extracellularRecordingArrayBuildFlag.key],
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.Circuit,
    targetType: ExtendedEntitiesTypeDict.CircuitSynapticPhysiologyCampaign,
    label: 'Circuit synaptic physiology',
    breadcrumb: {
      root: 'Circuit synaptic physiology build',
      steps: {
        selection: 'Select a circuit',
      },
    },
    scanConfig: {
      definition: buildCircuitSynapticPhysiologyWorkflow,
      schemaName: SchemaNameDict.SynapseParameterizationScanConfig,
      configureBinding: buildCircuitSynapticPhysiologyConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Circuit }],
    requireFilters: true,
    // source circuits are limited to single-neuron up to small-microcircuit scale; a user scale
    // filter is honoured but constrained to that allowed set (see resolveSmallScaleCircuitBuildScales)
    browseConfig: smallScaleCircuitBrowseConfig,
    order: 5,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.DirectConfigure,
    sourceType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
    order: 6,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.MemodelCircuit,
    targetType: ExtendedEntitiesTypeDict.MemodelCircuit,
    order: 7,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
    targetType: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
    order: 8,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.SmallMicrocircuit,
    targetType: ExtendedEntitiesTypeDict.SmallMicrocircuit,
    order: 9,
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
