import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { SchemaNameDict } from '@/features/scan-config/types';
import { optimizeEModelWorkflow } from '@/features/scan-config/workflow/definitions/optimize-emodel';

import { optimizeEModelConfigureBinding } from '../scan-config-binding';
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
    // This scan-config has no `model_identifier` field — no input entity is selected, so there
    // is no meaningful source type. `IWorkflowDescriptor` requires the field, so it mirrors
    // `targetType` (the pattern used by other no-input workflow entries).
    sourceType: ExtendedEntitiesTypeDict.EModelOptimizationCampaign,
    targetType: ExtendedEntitiesTypeDict.EModelOptimizationCampaign,
    breadcrumb: {
      root: 'E-Model optimization',
    },
    configureRouting: WorkflowConfigureRoutingDict.Standalone,
    scanConfig: {
      definition: optimizeEModelWorkflow,
      schemaName: SchemaNameDict.EModelOptimizationScanConfig,
      configureBinding: optimizeEModelConfigureBinding(),
    },
    label: 'E-Model optimization',
    disabled: false,
  },
];
