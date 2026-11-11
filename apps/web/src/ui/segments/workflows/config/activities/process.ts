import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { SchemaNameDict } from '@/features/scan-config/types';
import { processEmCellMeshWorkflow } from '@/features/scan-config/workflow/definitions/process-em-cell-mesh';

import { processEmCellMeshConfigureBinding } from '../scan-config-binding';
import { WorkflowBrowseDefaults, WorkflowStagePresets } from '../types';

import type { IWorkflowDescriptor } from '../types';

export const ProcessingWorkflows: readonly IWorkflowDescriptor[] = [
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
