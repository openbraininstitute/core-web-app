import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { extractionActivityFlag } from '@/features/feature-flags/flags';

import type { IWorkflowDescriptor } from '../types';

export const ExtractConfigureWorkflows: readonly IWorkflowDescriptor[] = [
  {
    sourceType: ExtendedEntitiesTypeDict.Circuit,
    targetType: ExtendedEntitiesTypeDict.Circuit,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Circuit }],
    label: 'Circuit (beta)',
    disabled: false,
    requiredFeatures: [extractionActivityFlag.key],
  },
];

export const ExtractBrowseWorkflows: readonly IWorkflowDescriptor[] = [
  {
    sourceType: ExtendedEntitiesTypeDict.Circuit,
    targetType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Circuit }],
    label: 'Circuit (beta)',
    disabled: false,
    requiredFeatures: [extractionActivityFlag.key],
  },
];
