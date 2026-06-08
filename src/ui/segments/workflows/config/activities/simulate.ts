import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { wholeBrainSimulationFlag } from '@/features/feature-flags/flags';
import { SchemaNameDict } from '@/features/scan-config/types';
import { simulateIonChannelWorkflow } from '@/features/scan-config/workflow/definitions/simulate-ion-channel';
import { simulateMemodelCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-memodel-circuit';
import { simulateMicrocircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-microcircuit';
import { simulatePairedNeuronCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-paired-neuron-circuit';
import { simulateRegionCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-region-circuit';
import { simulateSingleNeuronCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-single-neuron-circuit';
import { simulateSmallMicrocircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-small-microcircuit';
import { simulateWholeBrainCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-whole-brain-circuit';

import {
  circuitSimulationConfigureBinding,
  ionChannelSimulationConfigureBinding,
  memodelCircuitSimulationConfigureBinding,
  wholeBrainBrian2SimulationConfigureBinding,
} from '../scan-config-binding';
import { WorkflowBrowseDefaults, WorkflowStagePresets } from '../types';

import type { IWorkflowDescriptor } from '../types';

const simulatableCircuitFilters = { has_electrical_cell_models: true } as const;

export const SimulateWorkflows: readonly IWorkflowDescriptor[] = [
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.BrowseFirst,
    sourceType: ExtendedEntitiesTypeDict.Memodel,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
    breadcrumb: {
      root: 'Single neuron simulation',
      steps: { selection: 'Select single neuron' },
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Memodel }],
    order: 1,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.BrowseFirst,
    sourceType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
    breadcrumb: {
      root: 'Synaptome simulation',
      steps: { selection: 'Select synaptome' },
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.SingleNeuronSynaptome }],
    order: 2,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.IonChannelModel,
    targetType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
    breadcrumb: {
      root: 'Ion channel (beta) simulation',
      steps: { selection: 'Select ion channel (beta)' },
    },
    scanConfig: {
      definition: simulateIonChannelWorkflow,
      schemaName: SchemaNameDict.IonChannelModelSimulationScanConfig,
      configureBinding: ionChannelSimulationConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.IonChannelModel }],
    label: 'Ion channel (beta)',
    order: 3,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.MemodelCircuit,
    targetType: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
    breadcrumb: {
      root: 'Single neuron (beta) simulation',
      steps: { selection: 'Select single neuron (beta)' },
    },
    scanConfig: {
      definition: simulateMemodelCircuitWorkflow,
      schemaName: SchemaNameDict.MEModelSimulationScanConfig,
      configureBinding: memodelCircuitSimulationConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.MemodelCircuit }],
    order: 4,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.MEModelWithSynapses,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
    breadcrumb: {
      root: 'Synaptome (beta) simulation',
      steps: { selection: 'Select synaptome (beta)' },
    },
    scanConfig: {
      definition: simulateSingleNeuronCircuitWorkflow,
      schemaName: SchemaNameDict.MEModelWithSynapsesCircuitSimulationScanConfig,
      configureBinding: circuitSimulationConfigureBinding(
        ExtendedEntitiesTypeDict.MEModelWithSynapses
      ),
    },
    configurationInputs: [
      {
        type: ExtendedEntitiesTypeDict.MEModelWithSynapses,
        filters: simulatableCircuitFilters,
      },
    ],
    order: 5,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
    targetType: ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
    breadcrumb: {
      root: 'Paired neurons (beta) simulation',
      steps: { selection: 'Select paired neurons (beta)' },
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
    order: 6,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.SmallMicrocircuit,
    targetType: ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
    breadcrumb: {
      root: 'Small microcircuit (beta) simulation',
      steps: { selection: 'Select small microcircuit (beta)' },
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
    order: 7,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.Microcircuit,
    targetType: ExtendedEntitiesTypeDict.MicrocircuitSimulation,
    breadcrumb: {
      root: 'Microcircuit (beta) simulation',
      steps: { selection: 'Select microcircuit (beta)' },
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
    disabled: false,
    order: 8,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.BrainRegion,
    targetType: ExtendedEntitiesTypeDict.RegionCircuitSimulation,
    breadcrumb: {
      root: 'Brain region (beta) simulation',
      steps: { selection: 'Select brain region (beta)' },
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
    disabled: false,
    order: 9,
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
      schemaName: SchemaNameDict.Brian2CircuitSimulationScanConfig,
      configureBinding: wholeBrainBrian2SimulationConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.WholeBrain }],
    requiredFeatures: [wholeBrainSimulationFlag.key],
    order: 10,
    disabled: false,
  },
];
