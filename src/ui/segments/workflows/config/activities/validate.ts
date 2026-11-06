import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { SchemaNameDict } from '@/features/scan-config/types';
import { validateEModelWorkflow } from '@/features/scan-config/workflow/definitions/validate-emodel';

import { validateEModelConfigureBinding } from '../scan-config-binding';
import {
  WorkflowBrowseDefaults,
  WorkflowConfigureRoutingDict,
  WorkflowStagePresets,
} from '../types';

import type { IWorkflowDescriptor } from '../types';

export const ValidationWorkflows: readonly IWorkflowDescriptor[] = [
  {
    ...WorkflowBrowseDefaults,
    ...WorkflowStagePresets.ScanConfigInEditorSelection,
    // This scan-config has no `model_identifier` field — no input entity is selected, so there
    // is no meaningful source type. `IWorkflowDescriptor` requires the field, so it mirrors
    // `targetType` (the pattern used by other no-input workflow entries).
    sourceType: ExtendedEntitiesTypeDict.EModelValidationCampaign,
    targetType: ExtendedEntitiesTypeDict.EModelValidationCampaign,
    breadcrumb: {
      root: 'E-model',
    },
    configureRouting: WorkflowConfigureRoutingDict.Standalone,
    scanConfig: {
      definition: validateEModelWorkflow,
      schemaName: SchemaNameDict.EModelValidationScanConfig,
      configureBinding: validateEModelConfigureBinding(),
    },
    label: 'E-model',
    disabled: false,
  },
];
