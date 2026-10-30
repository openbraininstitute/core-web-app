import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { circuitSimplificationFlag } from '@/features/feature-flags/flags';
import { SchemaNameDict } from '@/features/scan-config/types';
import { processCircuitSimplificationWorkflow } from '@/features/scan-config/workflow/definitions/process-circuit-simplification';
import { processEmCellMeshWorkflow } from '@/features/scan-config/workflow/definitions/process-em-cell-mesh';

import {
  processCircuitSimplificationConfigureBinding,
  processEmCellMeshConfigureBinding,
} from '../scan-config-binding';
import { WorkflowBrowseDefaults, WorkflowStagePresets } from '../types';

import type { IWorkflowDescriptor } from '../types';

export const ProcessingWorkflows: readonly IWorkflowDescriptor[] = [
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.Circuit,
    targetType: ExtendedEntitiesTypeDict.CircuitSimplificationCampaign,
    breadcrumb: {
      root: 'Circuit simplification',
      steps: { selection: 'Select circuit' },
    },
    scanConfig: {
      definition: processCircuitSimplificationWorkflow,
      schemaName: SchemaNameDict.CircuitSimplificationScanConfig,
      configureBinding: processCircuitSimplificationConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Circuit }],
    label: 'Circuit Simplification',
    disabled: false,
    requiredFeatures: [circuitSimplificationFlag.key],
  },
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.EMCellMesh,
    targetType: ExtendedEntitiesTypeDict.SkeletonizationCampaign,
    breadcrumb: {
      root: 'EM mesh skeletonization data processing',
      steps: { selection: 'Select EM meshes' },
    },
    scanConfig: {
      definition: processEmCellMeshWorkflow,
      schemaName: SchemaNameDict.SkeletonizationScanConfig,
      configureBinding: processEmCellMeshConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.EMCellMesh }],
    label: 'EM mesh skeletonization',
    disabled: false,
  },
];
