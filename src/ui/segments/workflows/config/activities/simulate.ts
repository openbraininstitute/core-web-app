import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { brainRegionSimulationFlag } from '@/features/feature-flags/flags';
import { SchemaNameDict } from '@/features/scan-config/types';
import { simulateIonChannelWorkflow } from '@/features/scan-config/workflow/definitions/simulate-ion-channel';
import { simulateMEModelWithSynapsesCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-me-model-with-synapses-circuit';
import { simulateMemodelCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-memodel-circuit';
import { simulateMicrocircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-microcircuit';
import { simulatePairedNeuronCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-paired-neuron-circuit';
import { simulateRegionCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-region-circuit';
import { simulateSmallMicrocircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-small-microcircuit';
import { simulateWholeBrainCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-whole-brain-circuit';

import {
  circuitSimulationConfigureBinding,
  ionChannelSimulationConfigureBinding,
  memodelCircuitSimulationConfigureBinding,
  wholeBrainCircuitSimulationConfigureBinding,
} from '../scan-config-binding';
import { WorkflowBrowseDefaults, WorkflowStagePresets } from '../types';

import type { IWorkflowDescriptor } from '../types';

const simulatableCircuitFilters = { has_electrical_cell_models: true } as const;

/**
 * Array order drives the grouped type filter dropdown; `order` drives the flat type carousel.
 * Both are kept in sync, and the two superseded single-neuron/synaptome workflows sort last so
 * they stay at the end of their (Cellular) group as well as at the end of the carousel.
 */
export const SimulateWorkflows: readonly IWorkflowDescriptor[] = [
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.IonChannelModel,
    targetType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
    breadcrumb: {
      root: 'Ion channel simulation',
      steps: { selection: 'Select ion channel' },
    },
    scanConfig: {
      definition: simulateIonChannelWorkflow,
      schemaName: SchemaNameDict.IonChannelModelSimulationScanConfig,
      configureBinding: ionChannelSimulationConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.IonChannelModel }],
    order: 1,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.MemodelCircuit,
    targetType: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
    breadcrumb: {
      root: 'Single neuron simulation',
      steps: { selection: 'Select single neuron' },
    },
    scanConfig: {
      definition: simulateMemodelCircuitWorkflow,
      schemaName: SchemaNameDict.MEModelSimulationScanConfig,
      configureBinding: memodelCircuitSimulationConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.MemodelCircuit }],
    order: 2,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.SingleNeuronCircuit,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
    breadcrumb: {
      root: 'Synaptome simulation',
      steps: { selection: 'Select synaptome' },
    },
    scanConfig: {
      definition: simulateMEModelWithSynapsesCircuitWorkflow,
      schemaName: SchemaNameDict.MEModelWithSynapsesCircuitSimulationScanConfig,
      configureBinding: circuitSimulationConfigureBinding(
        ExtendedEntitiesTypeDict.SingleNeuronCircuit
      ),
    },
    configurationInputs: [
      {
        type: ExtendedEntitiesTypeDict.SingleNeuronCircuit,
        filters: simulatableCircuitFilters,
      },
    ],
    order: 3,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
    targetType: ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
    breadcrumb: {
      root: 'Paired neurons simulation',
      steps: { selection: 'Select paired neurons' },
    },
    scanConfig: {
      definition: simulatePairedNeuronCircuitWorkflow,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
      configureBinding: circuitSimulationConfigureBinding(
        ExtendedEntitiesTypeDict.PairedNeuronCircuit
      ),
    },
    configurationInputs: [
      {
        type: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
        filters: simulatableCircuitFilters,
      },
    ],
    order: 4,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.SmallMicrocircuit,
    targetType: ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
    breadcrumb: {
      root: 'Small microcircuit simulation',
      steps: { selection: 'Select small microcircuit' },
    },
    scanConfig: {
      definition: simulateSmallMicrocircuitWorkflow,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
      configureBinding: circuitSimulationConfigureBinding(
        ExtendedEntitiesTypeDict.SmallMicrocircuit
      ),
    },
    configurationInputs: [
      {
        type: ExtendedEntitiesTypeDict.SmallMicrocircuit,
        filters: simulatableCircuitFilters,
      },
    ],
    order: 5,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.Microcircuit,
    targetType: ExtendedEntitiesTypeDict.MicrocircuitSimulation,
    breadcrumb: {
      root: 'Microcircuit simulation',
      steps: { selection: 'Select microcircuit' },
    },
    scanConfig: {
      definition: simulateMicrocircuitWorkflow,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
      configureBinding: circuitSimulationConfigureBinding(ExtendedEntitiesTypeDict.Microcircuit),
    },
    configurationInputs: [
      {
        type: ExtendedEntitiesTypeDict.Microcircuit,
        filters: simulatableCircuitFilters,
      },
    ],
    order: 6,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.BrainRegion,
    targetType: ExtendedEntitiesTypeDict.RegionCircuitSimulation,
    breadcrumb: {
      root: 'Brain region simulation',
      steps: { selection: 'Select brain region' },
    },
    scanConfig: {
      definition: simulateRegionCircuitWorkflow,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
      configureBinding: circuitSimulationConfigureBinding(ExtendedEntitiesTypeDict.BrainRegion),
    },
    configurationInputs: [
      {
        type: ExtendedEntitiesTypeDict.BrainRegion,
        filters: simulatableCircuitFilters,
      },
    ],
    requiredFeatures: [brainRegionSimulationFlag.key],
    order: 7,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.WholeBrain,
    targetType: ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation,
    breadcrumb: {
      root: 'Whole brain simulation',
      steps: { selection: 'Select whole brain' },
    },
    scanConfig: {
      definition: simulateWholeBrainCircuitWorkflow,
      // Default schema/endpoint; Brian2 is selected from `target_simulator` at configure time.
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
      configureBinding: wholeBrainCircuitSimulationConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.WholeBrain }],
    order: 8,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.BrowseFirst,
    sourceType: ExtendedEntitiesTypeDict.Memodel,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
    breadcrumb: {
      root: 'Single neuron (legacy) simulation',
      steps: { selection: 'Select single neuron (legacy)' },
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Memodel }],
    // Memodel is only superseded on Simulate: the MemodelCircuit *build* workflow is still
    // disabled, so Build keeps the plain `Single neuron` label from the entity catalog.
    label: 'Single neuron (legacy)',
    order: 9,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.BrowseFirst,
    sourceType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
    breadcrumb: {
      root: 'Synaptome (legacy) simulation',
      steps: { selection: 'Select synaptome (legacy)' },
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.SingleNeuronSynaptome }],
    order: 10,
    disabled: false,
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
    sourceType: ExtendedEntitiesTypeDict.BrainSystems,
    targetType: ExtendedEntitiesTypeDict.BrainSystems,
    disabled: true,
  },
];
