import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { IWorkflowDescriptor } from '../types';

export const ProcessConfigureWorkflows: readonly IWorkflowDescriptor[] = [
  {
    sourceType: ExtendedEntitiesTypeDict.EMCellMesh,
    targetType: ExtendedEntitiesTypeDict.EMCellMesh,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.EMCellMesh }],
    label: 'EM mesh skeletonization',
    disabled: false,
  },
];

export const ProcessBrowseWorkflows: readonly IWorkflowDescriptor[] = [
  {
    sourceType: ExtendedEntitiesTypeDict.EMCellMesh,
    targetType: ExtendedEntitiesTypeDict.SkeletonizationCampaign,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.EMCellMesh }],
    label: 'EM mesh skeletonization',
    disabled: false,
  },
];
