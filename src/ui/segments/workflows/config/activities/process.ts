import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { IWorkflowDescriptor } from '../types';

export const ProcessingWorkflows: readonly IWorkflowDescriptor[] = [
  {
    sourceType: ExtendedEntitiesTypeDict.EMCellMesh,
    targetType: ExtendedEntitiesTypeDict.SkeletonizationCampaign,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.EMCellMesh }],
    label: 'EM mesh skeletonization',
    disabled: false,
  },
];
