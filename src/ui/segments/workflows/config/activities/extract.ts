import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { extractionActivityFlag } from '@/features/feature-flags/flags';
import { SchemaNameDict } from '@/features/scan-config/types';
import { extractCircuitWorkflow } from '@/features/scan-config/workflow/definitions/extract-circuit';
import { WorkflowBrowseDefaults, WorkflowStagePresets } from '@/ui/segments/workflows/config/types';

import type { IWorkflowDescriptor } from '@/ui/segments/workflows/config/types';

export const ExtractionWorkflows: readonly IWorkflowDescriptor[] = [
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.Circuit,
    targetType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
    isScanConfig: true,
    scanConfig: {
      definition: extractCircuitWorkflow,
      schemaName: SchemaNameDict.CircuitExtractionScanConfig,
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Circuit }],
    label: 'Circuit (beta)',
    disabled: false,
    requiredFeatures: [extractionActivityFlag.key],
  },
];
