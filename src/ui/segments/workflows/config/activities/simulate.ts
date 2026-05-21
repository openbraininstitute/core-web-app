import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { SchemaNameDict } from '@/features/scan-config/types';
import { simulateIonChannelWorkflow } from '@/features/scan-config/workflow/definitions/simulate-ion-channel';
import { simulateMemodelCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-memodel-circuit';
import { simulateMicrocircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-microcircuit';
import { simulatePairedNeuronCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-paired-neuron-circuit';
import { simulateRegionCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-region-circuit';
import { simulateSingleNeuronCircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-single-neuron-circuit';
import { simulateSmallMicrocircuitWorkflow } from '@/features/scan-config/workflow/definitions/simulate-small-microcircuit';
import {
  WorkflowBrowseDefaults,
  WorkflowConfigureRoutingDict,
  WorkflowStagePresets,
} from '@/ui/segments/workflows/config/types';

import type { IWorkflowDescriptor } from '@/ui/segments/workflows/config/types';

export const SimulateWorkflows: readonly IWorkflowDescriptor[] = [
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.BrowseFirst,
    sourceType: ExtendedEntitiesTypeDict.Memodel,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
    isScanConfig: false,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Memodel }],
    order: 1,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.BrowseFirst,
    sourceType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
    isScanConfig: false,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.SingleNeuronSynaptome }],
    order: 2,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.IonChannelModel,
    targetType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
    isScanConfig: true,
    scanConfig: {
      definition: simulateIonChannelWorkflow,
      schemaName: SchemaNameDict.IonChannelModelSimulationScanConfig,
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.IonChannelModel }],
    label: 'Ion channel (beta)',
    order: 3,
    disabled: false,
    configureRouting: WorkflowConfigureRoutingDict.Standalone,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.MemodelCircuit,
    targetType: ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
    isScanConfig: true,
    scanConfig: {
      definition: simulateMemodelCircuitWorkflow,
      schemaName: SchemaNameDict.MEModelSimulationScanConfig,
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
    isScanConfig: true,
    scanConfig: {
      definition: simulateSingleNeuronCircuitWorkflow,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.MEModelWithSynapses }],
    order: 5,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.PairedNeuronCircuit,
    targetType: ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
    isScanConfig: true,
    scanConfig: {
      definition: simulatePairedNeuronCircuitWorkflow,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.PairedNeuronCircuit }],
    order: 6,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.SmallMicrocircuit,
    targetType: ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
    isScanConfig: true,
    scanConfig: {
      definition: simulateSmallMicrocircuitWorkflow,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.SmallMicrocircuit }],
    order: 7,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.Microcircuit,
    targetType: ExtendedEntitiesTypeDict.MicrocircuitSimulation,
    isScanConfig: true,
    scanConfig: {
      definition: simulateMicrocircuitWorkflow,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Microcircuit }],
    disabled: false,
    order: 8,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.BrainRegion,
    targetType: ExtendedEntitiesTypeDict.RegionCircuitSimulation,
    isScanConfig: true,
    scanConfig: {
      definition: simulateRegionCircuitWorkflow,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.BrainRegion }],
    disabled: false,
    order: 9,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.Metabolism,
    targetType: ExtendedEntitiesTypeDict.Metabolism,
    isScanConfig: false,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.NGVUnit,
    targetType: ExtendedEntitiesTypeDict.NGVUnit,
    isScanConfig: false,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.NGVCircuit,
    targetType: ExtendedEntitiesTypeDict.NGVCircuit,
    isScanConfig: false,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.BrainSystems,
    targetType: ExtendedEntitiesTypeDict.BrainSystems,
    isScanConfig: false,
    disabled: true,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.WholeBrain,
    targetType: ExtendedEntitiesTypeDict.WholeBrain,
    isScanConfig: false,
    disabled: true,
  },
];
