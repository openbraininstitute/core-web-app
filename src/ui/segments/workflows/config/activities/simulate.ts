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
  circuitSimulationConfigureBinding,
  ionChannelSimulationConfigureBinding,
  memodelCircuitSimulationConfigureBinding,
} from '../scan-config-binding';
import { WorkflowBrowseDefaults, WorkflowStagePresets } from '../types';

import type { IWorkflowDescriptor } from '../types';

export const SimulateWorkflows: readonly IWorkflowDescriptor[] = [
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.BrowseFirst,
    sourceType: ExtendedEntitiesTypeDict.Memodel,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronSimulation,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Memodel }],
    order: 1,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.BrowseFirst,
    sourceType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
    targetType: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.SingleNeuronSynaptome }],
    order: 2,
    disabled: false,
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.IonChannelModel,
    targetType: ExtendedEntitiesTypeDict.IonChannelModelSimulation,
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
    scanConfig: {
      definition: simulateSingleNeuronCircuitWorkflow,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
      configureBinding: circuitSimulationConfigureBinding(
        ExtendedEntitiesTypeDict.MEModelWithSynapses
      ),
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
    scanConfig: {
      definition: simulatePairedNeuronCircuitWorkflow,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
      configureBinding: circuitSimulationConfigureBinding(
        ExtendedEntitiesTypeDict.PairedNeuronCircuit
      ),
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
    scanConfig: {
      definition: simulateSmallMicrocircuitWorkflow,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
      configureBinding: circuitSimulationConfigureBinding(
        ExtendedEntitiesTypeDict.SmallMicrocircuit
      ),
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
    scanConfig: {
      definition: simulateMicrocircuitWorkflow,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
      configureBinding: circuitSimulationConfigureBinding(ExtendedEntitiesTypeDict.Microcircuit),
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
    scanConfig: {
      definition: simulateRegionCircuitWorkflow,
      schemaName: SchemaNameDict.CircuitSimulationScanConfig,
      configureBinding: circuitSimulationConfigureBinding(ExtendedEntitiesTypeDict.BrainRegion),
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
    ...WorkflowStagePresets.Disabled,
    sourceType: ExtendedEntitiesTypeDict.WholeBrain,
    targetType: ExtendedEntitiesTypeDict.WholeBrain,
    disabled: true,
  },
];
