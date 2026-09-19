import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { eFeatureExtractionFlag, extractionActivityFlag } from '@/features/feature-flags/flags';
import { SchemaNameDict } from '@/features/scan-config/types';
import { extractCircuitWorkflow } from '@/features/scan-config/workflow/definitions/extract-circuit';
import { extractEFeaturesWorkflow } from '@/features/scan-config/workflow/definitions/extract-efeatures';

import {
  extractCircuitConfigureBinding,
  extractEFeaturesConfigureBinding,
} from '../scan-config-binding';
import {
  WorkflowBrowseDefaults,
  WorkflowConfigureRoutingDict,
  WorkflowStagePresets,
} from '../types';

import type { IWorkflowDescriptor } from '../types';

export const OptimizeWorkflows: readonly IWorkflowDescriptor[] = [
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfigInEditorSelection,
    sourceType: ExtendedEntitiesTypeDict.EModelOptimizationCampaign,
    targetType: ExtendedEntitiesTypeDict.EModelOptimizationCampaign,
    breadcrumb: {
      root: 'EModel Optimization',
    },
    configureRouting: WorkflowConfigureRoutingDict.Standalone,
    scanConfig: {
      definition: extractEFeaturesWorkflow,
      schemaName: SchemaNameDict.EModelEFeatureExtractionScanConfig,
      configureBinding: extractEFeaturesConfigureBinding(),
    },
    configurationInputs: [{ type: ExtendedEntitiesTypeDict.ElectricalCellRecording }],
    label: 'EModelOptimization',
    disabled: false,
    requiredFeatures: [eFeatureExtractionFlag.key],
  },
];
