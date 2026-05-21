import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { SchemaNameDict } from '@/features/scan-config/types';
import { processEmCellMeshWorkflow } from '@/features/scan-config/workflow/definitions/process-em-cell-mesh';
import { WorkflowBrowseDefaults, WorkflowStagePresets } from '@/ui/segments/workflows/config/types';

import type { IWorkflowDescriptor } from '@/ui/segments/workflows/config/types';

export const ProcessingWorkflows: readonly IWorkflowDescriptor[] = [
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.EMCellMesh,
    targetType: ExtendedEntitiesTypeDict.SkeletonizationCampaign,
    isScanConfig: true,
    scanConfig: {
      definition: processEmCellMeshWorkflow,
      schemaName: SchemaNameDict.SkeletonizationScanConfig,
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.EMCellMesh }],
    label: 'EM mesh skeletonization',
    disabled: false,
  },
];
