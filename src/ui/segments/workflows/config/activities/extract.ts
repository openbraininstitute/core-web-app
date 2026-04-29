import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { extractionActivityFlag } from '@/features/feature-flags/flags';

import type { IWorkflowDescriptor } from '../types';

export const ExtractionWorkflows: readonly IWorkflowDescriptor[] = [
  {
    sourceType: ExtendedEntitiesTypeDict.Circuit,
    targetType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Circuit }],
    label: 'Circuit (beta)',
    disabled: false,
    requiredFeatures: [extractionActivityFlag.key],
  },
];
