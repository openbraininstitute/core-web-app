import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { extractionActivityFlag } from '@/features/feature-flags/flags';
import { SchemaNameDict } from '@/features/scan-config/types';
import { extractCircuitWorkflow } from '@/features/scan-config/workflow/definitions/extract-circuit';

import { extractCircuitConfigureBinding } from '../scan-config-binding';
import { WorkflowBrowseDefaults, WorkflowStagePresets } from '../types';

import type { IWorkflowDescriptor } from '../types';

export const ExtractionWorkflows: readonly IWorkflowDescriptor[] = [
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfig,
    sourceType: ExtendedEntitiesTypeDict.Circuit,
    targetType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
    breadcrumb: {
      root: 'Circuit (beta) extraction',
      steps: { selection: 'Select circuit (beta)' },
    },
    scanConfig: {
      definition: extractCircuitWorkflow,
      schemaName: SchemaNameDict.CircuitExtractionScanConfig,
      configureBinding: extractCircuitConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.Circuit }],
    label: 'Circuit (beta)',
    disabled: false,
    requiredFeatures: [extractionActivityFlag.key],
  },
];
